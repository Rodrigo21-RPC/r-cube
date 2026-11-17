import { Link } from "react-router";
import type { ProductCard as Card } from "@shared/types";
import { Price } from "./Price";
import { PriceRange } from "./PriceRange";
import { FavoriteButton } from "./FavoriteButton";
import { Availability } from "./Availability";

/** Tarjeta del catálogo: foto, nombre, precio y disponibilidad (HU-01, RNF-04). */
export function ProductCard({ product, priority = false }: { product: Card; priority?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col gap-3 rounded-[18px] bg-surface p-4">
      <FavoriteButton productId={product.id} name={product.name} className="absolute right-3 top-3 bg-canvas/80" />
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-canvas">
        <img
          src={product.imageUrl}
          alt={product.imageAlt}
          width={400}
          height={300}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-contain transition-transform group-hover:scale-[1.03]"
          onError={(e) => {
            e.currentTarget.src = "/img/generico.svg";
          }}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{product.brand}</p>
        <h3 className="text-[15px] font-semibold leading-snug [overflow-wrap:anywhere]">
          <Link to={`/producto/${product.slug}`} className="after:absolute after:inset-0 after:rounded-[18px]">
            {product.name}
          </Link>
        </h3>
        {product.hasVariants && product.maxPriceCents ? (
          <PriceRange minCents={product.priceCents} maxCents={product.maxPriceCents} className="mt-auto pt-2" />
        ) : (
          <Price cents={product.priceCents} compareAtCents={product.hasVariants ? null : product.compareAtCents} className="mt-auto pt-2" />
        )}
        <Availability availability={product.availability} stock={product.stock} />
      </div>
    </article>
  );
}
