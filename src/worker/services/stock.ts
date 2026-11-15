import { eq, sql } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import type { StockSource } from "@db/schema";
import { AppError } from "../middleware";
import type { Actor } from "./orders";
import { lockProduct, syncProductFromVariants } from "./variants";

/** Conexión o transacción de Drizzle. */
export type Tx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

const { product, productVariant, stockMovement } = schema;

export interface StockChange {
  productId: string;
  /** Con variante (HU-43), el stock que cambia es el de la variante y el del producto se recalcula. */
  variantId?: string | null;
  delta: number;
  source: StockSource;
  orderId?: string | null;
  reason?: string | null;
  actor: Actor;
}

/**
 * Cambia el stock con un UPDATE condicional (nunca negativo) y registra el movimiento con stock anterior
 * y nuevo en la misma transacción (HU-33, FR-011, FR-012). Con `variantId` bloquea la fila del producto,
 * cambia la variante y sincroniza el resumen del producto (research R1).
 */
export async function applyStockChange(tx: Tx, change: StockChange): Promise<{ before: number; after: number }> {
  if (change.variantId) {
    await lockProduct(tx, change.productId);
    const [row] = await tx
      .update(productVariant)
      .set({ stock: sql`${productVariant.stock} + ${change.delta}::int` })
      .where(
        sql`${productVariant.id} = ${change.variantId} and ${productVariant.productId} = ${change.productId}
          and ${productVariant.stock} + ${change.delta}::int >= 0`,
      )
      .returning({ after: productVariant.stock });
    if (!row) {
      const [exists] = await tx
        .select({ id: productVariant.id })
        .from(productVariant)
        .where(sql`${productVariant.id} = ${change.variantId} and ${productVariant.productId} = ${change.productId}`);
      if (!exists) throw new AppError(404, "NOT_FOUND", "La variante no existe.");
      throw new AppError(409, "NEGATIVE_STOCK", "El ajuste dejaría el stock en negativo.");
    }
    await syncProductFromVariants(tx, change.productId);
    const before = row.after - change.delta;
    await recordMovement(tx, { ...change, before, after: row.after });
    return { before, after: row.after };
  }

  // Un producto con variantes nunca cambia su stock directamente (invariante 2).
  const [row] = await tx
    .update(product)
    .set({ stock: sql`${product.stock} + ${change.delta}::int` })
    .where(sql`${product.id} = ${change.productId} and not ${product.hasVariants} and ${product.stock} + ${change.delta}::int >= 0`)
    .returning({ after: product.stock });
  if (!row) {
    const [p] = await tx.select({ stock: product.stock, hasVariants: product.hasVariants }).from(product).where(eq(product.id, change.productId));
    if (!p) throw new AppError(404, "NOT_FOUND", "El producto no existe.");
    // Línea anterior a las variantes (pedido hecho cuando el producto era simple): no hay variante a la que
    // devolver las unidades, así que el stock del producto no cambia (research R1).
    if (p.hasVariants && change.delta > 0) return { before: p.stock, after: p.stock };
    throw new AppError(409, "NEGATIVE_STOCK", "El ajuste dejaría el stock en negativo.");
  }
  const before = row.after - change.delta;
  await recordMovement(tx, { ...change, before, after: row.after });
  return { before, after: row.after };
}

/** Inserta el movimiento de un cambio de stock ya aplicado (ventas, que actualizan el stock antes de crear el pedido). */
export async function recordMovement(tx: Tx, m: StockChange & { before: number; after: number }) {
  if (m.delta === 0) return;
  await tx.insert(stockMovement).values({
    id: crypto.randomUUID(),
    productId: m.productId,
    variantId: m.variantId ?? null,
    delta: m.delta,
    stockBefore: m.before,
    stockAfter: m.after,
    source: m.source,
    orderId: m.orderId ?? null,
    reason: m.reason ?? null,
    actorType: m.actor.type,
    actorUserId: m.actor.userId,
  });
}
