import { useState } from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, X } from "lucide-react";
import type { CatalogPage, Facets, SortOption } from "@shared/types";
import { apiFetch } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { ProductCard } from "@web/components/ProductCard";
import { Filters, type FilterValues } from "@web/components/Filters";
import { EmptyState, ErrorState, LoadingGrid } from "@web/components/States";
import { Button } from "@web/components/ui/button";
import { Select } from "@web/components/ui/form";

const SORTS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevancia" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "newest", label: "Novedades" },
];

/** Catálogo con búsqueda, filtros, orden y paginación sincronizados con la URL (HU-01 a HU-04). */
export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const q = params.get("q") ?? "";
  useTitle(q ? `Resultados para «${q}»` : "Catálogo");

  const values: FilterValues = {
    category: params.get("category") ?? undefined,
    brands: params.get("brand")?.split(",").filter(Boolean) ?? [],
    min: params.get("min") ?? undefined,
    max: params.get("max") ?? undefined,
    available: params.get("available") === "1",
  };
  const sort = (params.get("sort") as SortOption | null) ?? (q ? "relevance" : "newest");
  const page = Number(params.get("page") ?? "1") || 1;

  const facets = useQuery({ queryKey: ["facets"], queryFn: () => apiFetch<Facets>("/catalog/facets") });
  const list = useQuery({
    queryKey: ["catalog", params.toString()],
    queryFn: () => apiFetch<CatalogPage>(`/catalog/products?${params.toString()}`),
    placeholderData: keepPreviousData,
  });

  function update(next: Record<string, string | undefined>, resetPage = true) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") p.delete(k);
      else p.set(k, v);
    }
    if (resetPage) p.delete("page");
    setParams(p);
  }

  function onFilters(next: Partial<FilterValues>) {
    update({
      ...("category" in next ? { category: next.category } : {}),
      ...("brands" in next ? { brand: next.brands?.join(",") } : {}),
      ...("min" in next ? { min: next.min } : {}),
      ...("max" in next ? { max: next.max } : {}),
      ...("available" in next ? { available: next.available ? "1" : undefined } : {}),
    });
  }

  const brandName = (slug: string) => facets.data?.brands.find((b) => b.slug === slug)?.name ?? slug;
  const categoryName = (slug: string) => facets.data?.categories.find((c) => c.slug === slug)?.name ?? slug;
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (q) chips.push({ key: "q", label: `«${q}»`, clear: () => update({ q: undefined }) });
  if (values.category) chips.push({ key: "cat", label: categoryName(values.category), clear: () => onFilters({ category: undefined }) });
  for (const b of values.brands)
    chips.push({ key: `b-${b}`, label: brandName(b), clear: () => onFilters({ brands: values.brands.filter((x) => x !== b) }) });
  if (values.min) chips.push({ key: "min", label: `Desde S/ ${values.min}`, clear: () => onFilters({ min: undefined }) });
  if (values.max) chips.push({ key: "max", label: `Hasta S/ ${values.max}`, clear: () => onFilters({ max: undefined }) });
  if (values.available) chips.push({ key: "av", label: "Solo disponibles", clear: () => onFilters({ available: false }) });

  const data = list.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{q ? "Resultados" : "Catálogo"}</h1>
          <p className="text-muted" aria-live="polite">
            {data ? (q ? `${data.total} resultados para «${q}»` : `${data.total} productos`) : " "}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="lg:hidden" aria-expanded={showFilters} aria-controls="filtros" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal aria-hidden className="size-4" /> Filtros
          </Button>
          <label htmlFor="orden" className="sr-only">
            Ordenar por
          </label>
          <Select id="orden" className="h-9 w-auto rounded-full text-sm" value={sort} onChange={(e) => update({ sort: e.target.value })}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
          {chips.map((c) => (
            <button key={c.key} type="button" onClick={c.clear} className="inline-flex h-9 items-center gap-1 rounded-full bg-text px-4 text-sm text-canvas" aria-label={`Quitar filtro ${c.label}`}>
              {c.label} <X aria-hidden className="size-4" />
            </button>
          ))}
          <Button variant="link" size="sm" onClick={() => setParams(new URLSearchParams(sort !== "newest" && sort !== "relevance" ? { sort } : {}))}>
            Limpiar filtros
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside id="filtros" className={`${showFilters ? "block" : "hidden"} rounded-[18px] bg-surface p-5 lg:block lg:bg-transparent lg:p-0`} aria-label="Filtros">
          <Filters facets={facets.data} values={values} onChange={onFilters} />
        </aside>

        <section aria-label="Productos" aria-busy={list.isFetching}>
          {list.isPending ? (
            <LoadingGrid count={12} />
          ) : list.isError ? (
            <ErrorState message={list.error.message} onRetry={() => list.refetch()} />
          ) : data && data.items.length === 0 ? (
            <EmptyState
              title={q ? `No encontramos resultados para «${q}»` : "No hay productos con estos filtros"}
              description="Prueba con otra palabra o quita algunos filtros."
              action={<Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>Limpiar filtros</Button>}
            />
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {data!.items.map((p, i) => (
                  <li key={p.id}>
                    <ProductCard product={p} priority={i < 4} />
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <nav aria-label="Paginación" className="mt-6 flex items-center justify-center gap-2">
                  <Button variant="secondary" size="sm" disabled={data!.page <= 1} onClick={() => update({ page: String(data!.page - 1) }, false)}>
                    Anterior
                  </Button>
                  <span className="tabular px-2 text-sm text-muted" aria-current="page">
                    Página {data!.page} de {totalPages}
                  </span>
                  <Button variant="secondary" size="sm" disabled={data!.page >= totalPages} onClick={() => update({ page: String(data!.page + 1) }, false)}>
                    Siguiente
                  </Button>
                </nav>
              )}
            </>
          )}
          {page > totalPages && data && <p className="sr-only">Mostrando la última página disponible.</p>}
        </section>
      </div>
    </div>
  );
}
