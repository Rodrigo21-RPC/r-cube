import { inArray, sql } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import { formatPEN, orderTotals } from "@shared/money";
import type { CartLine, CartQuote, CartWarning } from "@shared/types";
import { GENERIC_IMAGE } from "../routes/catalog";

export interface RequestedItem {
  productId: string;
  quantity: number;
  seenPriceCents?: number | null;
}

/** Recalcula el carrito con precios y stock vigentes del servidor (HU-11, HU-13, RNF-07). */
export async function quoteCart(db: Db, requested: RequestedItem[]): Promise<CartQuote> {
  const merged = new Map<string, RequestedItem>();
  for (const it of requested) {
    const prev = merged.get(it.productId);
    merged.set(it.productId, prev ? { ...prev, quantity: prev.quantity + it.quantity } : { ...it });
  }
  const ids = [...merged.keys()];
  const { product, productImage } = schema;
  const rows = ids.length
    ? await db
        .select({
          id: product.id,
          slug: product.slug,
          name: product.name,
          priceCents: product.priceCents,
          stock: product.stock,
          active: product.active,
          imageUrl: sql<string | null>`(select ${productImage.url} from ${productImage}
            where ${productImage.productId} = ${product.id} order by ${productImage.position} limit 1)`,
        })
        .from(product)
        .where(inArray(product.id, ids))
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));

  const lines: CartLine[] = [];
  const warnings: CartWarning[] = [];
  for (const [productId, it] of merged) {
    const p = byId.get(productId);
    if (!p) {
      warnings.push({ productId, type: "unavailable", message: "Un producto de tu carrito ya no existe." });
      continue;
    }
    const available = p.active && p.stock > 0;
    const quantity = available ? Math.min(it.quantity, p.stock) : it.quantity;
    if (!available) {
      warnings.push({ productId, type: "unavailable", message: `${p.name} ya no está disponible.` });
    } else if (it.quantity > p.stock) {
      warnings.push({ productId, type: "stock_reduced", message: `Solo quedan ${p.stock} unidades de ${p.name}; ajustamos la cantidad.` });
    }
    if (available && it.seenPriceCents != null && it.seenPriceCents !== p.priceCents) {
      warnings.push({
        productId,
        type: "price_changed",
        message: `El precio de ${p.name} cambió de ${formatPEN(it.seenPriceCents)} a ${formatPEN(p.priceCents)}.`,
      });
    }
    lines.push({
      productId,
      slug: p.slug,
      name: p.name,
      imageUrl: p.imageUrl ?? GENERIC_IMAGE,
      unitPriceCents: p.priceCents,
      quantity,
      maxQuantity: p.stock,
      lineTotalCents: available ? p.priceCents * quantity : 0,
      available,
    });
  }
  const totals = orderTotals(
    lines.filter((l) => l.available).map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity })),
    0,
    0,
  );
  return {
    lines,
    warnings,
    totals: {
      subtotalCents: totals.subtotalCents,
      taxableBaseCents: totals.taxableBaseCents,
      igvCents: totals.igvCents,
      totalCents: totals.totalCents,
    },
  };
}
