import { eq, sql } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import type { StockSource } from "@db/schema";
import { AppError } from "../middleware";
import type { Actor } from "./orders";

/** Conexión o transacción de Drizzle. */
export type Tx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

const { product, stockMovement } = schema;

export interface StockChange {
  productId: string;
  delta: number;
  source: StockSource;
  orderId?: string | null;
  reason?: string | null;
  actor: Actor;
}

/**
 * Cambia el stock con un UPDATE condicional (nunca negativo) y registra el movimiento con stock anterior
 * y nuevo en la misma transacción (HU-33, FR-011, FR-012).
 */
export async function applyStockChange(tx: Tx, change: StockChange): Promise<{ before: number; after: number }> {
  const [row] = await tx
    .update(product)
    .set({ stock: sql`${product.stock} + ${change.delta}::int` })
    .where(sql`${product.id} = ${change.productId} and ${product.stock} + ${change.delta}::int >= 0`)
    .returning({ after: product.stock });
  if (!row) {
    const [exists] = await tx.select({ id: product.id }).from(product).where(eq(product.id, change.productId));
    if (!exists) throw new AppError(404, "NOT_FOUND", "El producto no existe.");
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
