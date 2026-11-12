import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import type { HomeData, ProductCard as Card } from "@shared/types";
import { apiFetch } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { ProductCard } from "@web/components/ProductCard";
import { ErrorState, LoadingGrid } from "@web/components/States";
import { Button } from "@web/components/ui/button";

function Rail({ id, title, products, more }: { id: string; title: string; products: Card[]; more: string }) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <h2 id={id} className="text-[22px] font-semibold tracking-tight">{title}</h2>
        <Link to={more} className="inline-flex items-center text-sm text-accent hover:underline">
          Ver todo <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {products.slice(0, 8).map((p, i) => (
          <li key={p.id} className="w-[46%] shrink-0 snap-start md:w-auto">
            <ProductCard product={p} priority={i < 2} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Portada con categorías, ofertas, más vendidos y novedades (HU-06). */
export default function Home() {
  useTitle("");
  const q = useQuery({ queryKey: ["home"], queryFn: () => apiFetch<HomeData>("/catalog/home") });

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-start gap-4 rounded-[24px] bg-surface px-6 py-10 md:px-10 md:py-14">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">R Cube</p>
        <h1 className="max-w-2xl text-[32px] font-semibold leading-tight tracking-tight md:text-[40px]">
          Celulares, laptops y tablets con envío en Lima
        </h1>
        <p className="max-w-xl text-muted">Precios en soles con IGV incluido. Paga con tarjeta, Yape o Plin, transferencia o coordina por WhatsApp.</p>
        <Button asChild size="lg"><Link to="/catalogo">Ver catálogo</Link></Button>
      </section>

      {q.isPending ? (
        <LoadingGrid count={8} />
      ) : q.isError ? (
        <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
      ) : (
        <>
          <section aria-labelledby="categorias" className="flex flex-col gap-3">
            <h2 id="categorias" className="text-[22px] font-semibold tracking-tight">Categorías</h2>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {q.data.categories.map((c) => (
                <li key={c.slug}>
                  <Link to={`/catalogo?category=${c.slug}`} className="flex h-full flex-col items-center gap-3 rounded-[18px] bg-surface p-4 text-center hover:bg-surface-2">
                    <img src={c.imageUrl} alt="" width={160} height={120} loading="lazy" className="h-24 w-full object-contain" />
                    <span className="font-semibold">{c.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <Rail id="ofertas" title="Ofertas" products={q.data.offers} more="/catalogo?sort=price_asc" />
          <Rail id="mas-vendidos" title="Más vendidos" products={q.data.bestSellers} more="/catalogo" />
          <Rail id="novedades" title="Novedades" products={q.data.newest} more="/catalogo?sort=newest" />
        </>
      )}
    </div>
  );
}
