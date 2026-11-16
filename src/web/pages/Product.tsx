import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import type { ProductDetail } from "@shared/types";
import { apiFetch, ApiError } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { Price } from "@web/components/Price";
import { PriceRange } from "@web/components/PriceRange";
import { VariantPicker, variantFor, type VariantChoice } from "@web/components/VariantPicker";
import { Availability } from "@web/components/Availability";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { Button } from "@web/components/ui/button";
import { AddToCart } from "@web/cart/AddToCart";
import { RelatedProducts } from "@web/components/RelatedProducts";
import { Reviews } from "@web/components/Reviews";
import { FavoriteButton } from "@web/components/FavoriteButton";
import { ProductGallery } from "@web/components/ProductGallery";
import { Highlights } from "@web/components/Highlights";
import { WhatsAppButton } from "@web/components/WhatsAppButton";

/** Al cambiar de producto se vuelve a montar la página: la galería y la variante elegida empiezan de cero (FR-007). */
export default function Product() {
  const { slug = "" } = useParams();
  return <ProductPage key={slug} slug={slug} />;
}

/** Detalle de producto con galería, precio con IGV, specs y disponibilidad (HU-05, HU-54). */
function ProductPage({ slug }: { slug: string }) {
  const q = useQuery({ queryKey: ["product", slug], queryFn: () => apiFetch<ProductDetail>(`/catalog/products/${slug}`) });
  const [active, setActive] = useState(0);
  const [choice, setChoice] = useState<VariantChoice>({});
  const [missing, setMissing] = useState(false);
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
  const hasVariants = p.variants.length > 0;
  const selected = hasVariants ? variantFor(p.variants, choice) : null;

  function pick(next: VariantChoice) {
    setChoice(next);
    setMissing(false);
    const v = variantFor(p.variants, next);
    const idx = v?.imageUrl ? p.images.findIndex((i) => i.url === v.imageUrl) : -1;
    if (idx >= 0) setActive(idx);
  }
  return (
    <div className="flex flex-col gap-6">
      <Link to="/catalogo" className="inline-flex w-fit items-center gap-1 rounded-full text-sm text-accent hover:underline">
        <ArrowLeft aria-hidden className="size-4" /> Volver al catálogo
      </Link>
      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery name={p.name} photos={p.images} index={active} onIndexChange={setActive} />

        <section className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-accent">
              <Link to={`/catalogo?category=${p.category.slug}`} className="underline underline-offset-2">{p.category.name}</Link> · {p.brand}
            </p>
            <div className="mt-1 flex items-start justify-between gap-2">
              <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{p.name}</h1>
              <FavoriteButton productId={p.id} name={p.name} className="shrink-0" />
            </div>
          </div>
          <Highlights tagline={p.tagline} highlights={p.highlights} />
          <div>
            {hasVariants && !selected ? (
              <PriceRange minCents={p.priceCents} maxCents={p.maxPriceCents} size="lg" />
            ) : (
              <Price cents={selected?.priceCents ?? p.priceCents} compareAtCents={hasVariants ? null : p.compareAtCents} size="lg" />
            )}
            <p className="text-sm text-muted">Precio con IGV incluido</p>
          </div>
          {hasVariants && <VariantPicker variants={p.variants} choice={choice} onChange={pick} invalid={missing} />}
          <Availability availability={selected?.availability ?? p.availability} stock={selected?.stock ?? p.stock} />
          {missing && !selected && (
            <p role="alert" className="text-sm font-medium text-danger">Elige color, almacenamiento o RAM</p>
          )}
          {p.availability === "out" ? (
            <Button size="lg" disabled className="w-full md:w-auto">
              <ShoppingCart aria-hidden className="size-5" /> Agregar al carrito
            </Button>
          ) : (
            <AddToCart
              productId={p.id}
              stock={selected?.stock ?? p.stock}
              name={selected ? `${p.name} (${selected.label})` : p.name}
              variantId={selected?.id ?? null}
              needsVariant={hasVariants}
              onMissingVariant={() => setMissing(true)}
            />
          )}
          <WhatsAppButton
            name={p.name}
            variantLabel={selected?.label ?? null}
            url={`${window.location.origin}/producto/${p.slug}`}
            className="w-full md:w-auto"
          />
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
      <Reviews slug={p.slug} />
      <RelatedProducts slug={p.slug} />
    </div>
  );
}
