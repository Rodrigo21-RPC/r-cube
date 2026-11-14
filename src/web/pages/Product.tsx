import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import type { ProductDetail } from "@shared/types";
import { apiFetch, ApiError } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { Price } from "@web/components/Price";
import { Availability } from "@web/components/Availability";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { Button } from "@web/components/ui/button";
import { AddToCart } from "@web/cart/AddToCart";

/** Detalle de producto con galería, precio con IGV, specs y disponibilidad (HU-05). */
export default function Product() {
  const { slug = "" } = useParams();
  const q = useQuery({ queryKey: ["product", slug], queryFn: () => apiFetch<ProductDetail>(`/catalog/products/${slug}`) });
  const [active, setActive] = useState(0);
  useTitle(q.data?.name ?? "Producto");

  if (q.isPending) return <LoadingBlock label="Cargando producto…" />;
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.status === 404)
      return (
        <EmptyState
          title="Producto no disponible"
          description="Este producto no existe o ya no está a la venta."
          action={<Button asChild variant="secondary"><Link to="/catalogo">Ir al catálogo</Link></Button>}
        />
      );
    return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  }

  const p = q.data;
  const image = p.images[active] ?? p.images[0]!;
  return (
    <div className="flex flex-col gap-6">
      <Link to="/catalogo" className="inline-flex w-fit items-center gap-1 rounded-full text-sm text-accent hover:underline">
        <ArrowLeft aria-hidden className="size-4" /> Volver al catálogo
      </Link>
      <div className="grid gap-8 md:grid-cols-2">
        <section aria-label="Galería de fotos" className="flex flex-col gap-3">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[18px] bg-surface p-6">
            <img src={image.url} alt={image.alt} width={600} height={600} className="h-full w-full object-contain" onError={(e) => { e.currentTarget.src = "/img/generico.svg"; }} />
          </div>
          {p.images.length > 1 && (
            <div className="flex gap-2" role="list">
              {p.images.map((img, i) => (
                <button key={img.url} type="button" role="listitem" onClick={() => setActive(i)} aria-label={`Ver foto ${i + 1} de ${p.images.length}`} aria-pressed={i === active} className={`size-16 overflow-hidden rounded-xl border-2 bg-surface ${i === active ? "border-accent" : "border-transparent"}`}>
                  <img src={img.url} alt="" width={64} height={64} loading="lazy" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-accent">
              <Link to={`/catalogo?category=${p.category.slug}`} className="underline underline-offset-2">{p.category.name}</Link> · {p.brand}
            </p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">{p.name}</h1>
          </div>
          <div>
            <Price cents={p.priceCents} compareAtCents={p.compareAtCents} size="lg" />
            <p className="text-sm text-muted">Precio con IGV incluido</p>
          </div>
          <Availability availability={p.availability} stock={p.stock} />
          {p.availability === "out" ? (
            <Button size="lg" disabled className="w-full md:w-auto">
              <ShoppingCart aria-hidden className="size-5" /> Agregar al carrito
            </Button>
          ) : (
            <AddToCart productId={p.id} stock={p.stock} name={p.name} />
          )}
          <p className="leading-relaxed text-muted">{p.description}</p>
          {p.specs.length > 0 && (
            <div className="overflow-hidden rounded-[18px] bg-surface">
              <h2 className="px-5 pt-4 text-[17px] font-semibold">Especificaciones</h2>
              <table className="mt-2 w-full text-[15px]">
                <tbody>
                  {p.specs.map((s) => (
                    <tr key={s.label} className="border-t border-border">
                      <th scope="row" className="px-5 py-3 text-left font-normal text-muted">{s.label}</th>
                      <td className="px-5 py-3 text-right font-medium">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
