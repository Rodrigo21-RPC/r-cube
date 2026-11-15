import { Link, useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { formatPEN } from "@shared/money";
import type { AdminProductRow, Page, TaxonomyItem } from "@shared/admin-types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { Button } from "@web/components/ui/button";
import { Input, Select } from "@web/components/ui/form";
import { Badge } from "@web/components/ui/misc";
import { DataTable } from "../components/DataTable";
import { Pagination } from "../components/Pagination";

/** Lista de productos del panel con búsqueda y filtros (HU-29, HU-30). */
export default function Products() {
  useTitle("Panel: productos");
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? "1") || 1;
  const categories = useQuery({ queryKey: ["admin", "categories"], queryFn: () => apiFetch<TaxonomyItem[]>("/admin/categories") });
  const list = useQuery({
    queryKey: ["admin", "products", params.toString()],
    queryFn: () => apiFetch<Page<AdminProductRow>>(`/admin/products?${params.toString()}`),
    placeholderData: keepPreviousData,
  });

  function set(key: string, value: string) {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    if (key !== "page") p.delete("page");
    setParams(p);
  }

  async function toggle(p: AdminProductRow) {
    try {
      await apiFetch(`/admin/products/${p.id}/status`, { method: "PATCH", json: { active: !p.active } });
      toast.success(`${p.name} ${p.active ? "desactivado" : "activado"}.`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo cambiar el estado.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold tracking-tight">Productos</h1>
        <Button asChild><Link to="/admin/productos/nuevo"><Plus aria-hidden className="size-4" /> Nuevo producto</Link></Button>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor="buscar-prod" className="sr-only">Buscar por nombre</label>
          <Input id="buscar-prod" type="search" placeholder="Buscar por nombre…" defaultValue={params.get("q") ?? ""} onChange={(e) => set("q", e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-cat" className="sr-only">Categoría</label>
          <Select id="f-cat" value={params.get("category") ?? ""} onChange={(e) => set("category", e.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.data?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="f-estado" className="sr-only">Estado</label>
          <Select id="f-estado" value={params.get("status") ?? ""} onChange={(e) => set("status", e.target.value)}>
            <option value="">Activos e inactivos</option>
            <option value="active">Solo activos</option>
            <option value="inactive">Solo inactivos</option>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-[15px]">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={params.get("lowStock") === "1"} onChange={(e) => set("lowStock", e.target.checked ? "1" : "")} />
          Solo stock bajo (5 o menos)
        </label>
      </div>
      {list.isPending ? (
        <LoadingBlock />
      ) : list.isError ? (
        <ErrorState message={list.error.message} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState title="No hay productos con estos filtros" />
      ) : (
        <>
          <DataTable
            caption="Productos"
            rows={list.data.items}
            rowKey={(p) => p.id}
            columns={[
              { header: "Producto", cell: (p) => (
                <span className="flex items-center gap-3">
                  <img src={p.imageUrl} alt="" width={40} height={40} loading="lazy" className="size-10 rounded-lg bg-surface object-contain" />
                  <Link to={`/admin/productos/${p.id}`} className="font-medium text-accent underline underline-offset-2">{p.name}</Link>
                </span>
              ) },
              { header: "Marca", cell: (p) => p.brand },
              { header: "Categoría", cell: (p) => p.category },
              { header: "Precio", cell: (p) => formatPEN(p.priceCents), align: "right" },
              { header: "Stock", cell: (p) => <span className={p.stock <= 5 ? "font-semibold text-warning" : ""}>{p.stock}</span>, align: "right" },
              { header: "Estado", cell: (p) => <Badge tone={p.active ? "success" : "neutral"}>{p.active ? "Activo" : "Inactivo"}</Badge> },
              { header: "Acción", cell: (p) => <Button variant="secondary" size="sm" onClick={() => toggle(p)}>{p.active ? "Desactivar" : "Activar"}</Button> },
            ]}
          />
          <Pagination page={page} total={list.data.total} pageSize={list.data.pageSize} onPage={(n) => set("page", String(n))} />
        </>
      )}
    </div>
  );
}
