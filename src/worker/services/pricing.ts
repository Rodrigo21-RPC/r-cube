import { inArray, sql } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import { formatPEN, orderTotals } from "@shared/money";
import { variantLabel } from "@shared/variant";
import type { CartLine, CartQuote, CartWarning } from "@shared/types";
import { GENERIC_IMAGE } from "../routes/catalog";
import { applyCoupon } from "./coupons";

export interface RequestedItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
  seenPriceCents?: number | null;
}

/** Recalcula el carrito con precios y stock vigentes del servidor (HU-11, HU-13, HU-44, RNF-07). */
export async function quoteCart(db: Db, requested: RequestedItem[], opts: { couponCode?: string | null } = {}): Promise<CartQuote> {
  const keyOf = (i: { productId: string; variantId?: string | null }) => `${i.productId}:${i.variantId ?? ""}`;
  const merged = new Map<string, RequestedItem>();
  for (const it of requested) {
    const prev = merged.get(keyOf(it));
    merged.set(keyOf(it), prev ? { ...prev, quantity: prev.quantity + it.quantity } : { ...it });
  }
  const ids = [...new Set([...merged.values()].map((i) => i.productId))];
  const variantIds = [...new Set([...merged.values()].map((i) => i.variantId).filter((v): v is string => Boolean(v)))];
  const { product, productImage, productVariant } = schema;
  // `product.id` va calificado a mano: en un SELECT de una sola tabla Drizzle lo escribe sin tabla («id») y dentro de la
  // subconsulta se confundiría con `product_image.id`, dejando todas las líneas con la imagen genérica (FR-034).
  const mainImage = sql<string | null>`(select ${productImage.url} from ${productImage}
    where ${productImage.productId} = "product"."id" order by ${productImage.position} limit 1)`;
  const rows = ids.length
    ? await db
        .select({
          id: product.id,
          slug: product.slug,
          name: product.name,
          priceCents: product.priceCents,
          stock: product.stock,
          hasVariants: product.hasVariants,
          // Una categoría o marca desactivada también deja el producto no disponible (HU-32, HU-13).
          active: sql<boolean>`${product.active} and exists(select 1 from category c where c.id = ${product.categoryId} and c.active) and exists(select 1 from brand b where b.id = ${product.brandId} and b.active)`,
          imageUrl: mainImage,
        })
        .from(product)
        .where(inArray(product.id, ids))
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const variantRows = variantIds.length
    ? await db
        .select({
          v: productVariant,
          imageUrl: sql<string | null>`(select ${productImage.url} from ${productImage} where ${productImage.id} = ${productVariant.imageId})`,
        })
        .from(productVariant)
        .where(inArray(productVariant.id, variantIds))
    : [];
  const variantById = new Map(variantRows.map((r) => [r.v.id, r]));

  const lines: CartLine[] = [];
  const warnings: CartWarning[] = [];
  for (const it of merged.values()) {
    const { productId } = it;
    const p = byId.get(productId);
    const variantId = it.variantId ?? null;
    if (!p) {
      warnings.push({ productId, variantId, type: "unavailable", message: "Un producto de tu carrito ya no existe." });
      continue;
    }

    // Una línea sin variante de un producto que ya tiene variantes no se puede pagar (clarificación 1).
    if (p.hasVariants && !variantId) {
      warnings.push({ productId, variantId, type: "choose_variant", message: `Elige una variante de ${p.name}.` });
      lines.push({
        productId, variantId: null, variantLabel: null, sku: null, slug: p.slug, name: p.name, imageUrl: p.imageUrl ?? GENERIC_IMAGE,
        unitPriceCents: p.priceCents, quantity: it.quantity, maxQuantity: 0, lineTotalCents: 0, available: false,
      });
      continue;
    }

    const vr = variantId ? variantById.get(variantId) : undefined;
    if (variantId && (!vr || vr.v.productId !== productId)) {
      warnings.push({ productId, variantId, type: "unavailable", message: `Una variante de ${p.name} ya no existe.` });
      lines.push({
        productId, variantId, variantLabel: null, sku: null, slug: p.slug, name: p.name, imageUrl: p.imageUrl ?? GENERIC_IMAGE,
        unitPriceCents: p.priceCents, quantity: it.quantity, maxQuantity: 0, lineTotalCents: 0, available: false,
      });
      continue;
    }

    const v = vr?.v ?? null;
    const label = v ? variantLabel(v) : null;
    const display = label ? `${p.name} (${label})` : p.name;
    const unitPrice = v ? v.priceCents : p.priceCents;
    const stock = v ? v.stock : p.stock;
    const available = p.active && (v ? v.active : true) && stock > 0;
    const quantity = available ? Math.min(it.quantity, stock) : it.quantity;
    if (!available) {
      warnings.push({ productId, variantId, type: "unavailable", message: `${display} ya no está disponible.` });
    } else if (it.quantity > stock) {
      warnings.push({ productId, variantId, type: "stock_reduced", message: `Solo quedan ${stock} unidades de ${display}; ajustamos la cantidad.` });
    }
    if (available && it.seenPriceCents != null && it.seenPriceCents !== unitPrice) {
      warnings.push({
        productId,
        variantId,
        type: "price_changed",
        message: `El precio de ${display} cambió de ${formatPEN(it.seenPriceCents)} a ${formatPEN(unitPrice)}.`,
      });
    }
    lines.push({
      productId,
      variantId,
      variantLabel: label,
      sku: v?.sku ?? null,
      slug: p.slug,
      name: p.name,
      imageUrl: vr?.imageUrl ?? p.imageUrl ?? GENERIC_IMAGE,
      unitPriceCents: unitPrice,
      quantity,
      maxQuantity: stock,
      lineTotalCents: available ? unitPrice * quantity : 0,
      available,
    });
  }
  const priced = lines.filter((l) => l.available).map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity }));
  const subtotal = orderTotals(priced, 0, 0).subtotalCents;
  // Cupón (HU-49): con el carrito sin productos disponibles no se aplica; el servidor decide el descuento (RNF-07).
  const applied = opts.couponCode && subtotal > 0 ? await applyCoupon(db, opts.couponCode, subtotal) : { coupon: null, error: null };
  const totals = orderTotals(priced, 0, applied.coupon?.discountCents ?? 0);
  return {
    lines,
    warnings,
    totals: {
      subtotalCents: totals.subtotalCents,
      discountCents: totals.discountCents,
      taxableBaseCents: totals.taxableBaseCents,
      igvCents: totals.igvCents,
      totalCents: totals.totalCents,
    },
    coupon: applied.coupon,
    couponError: applied.error,
  };
}
