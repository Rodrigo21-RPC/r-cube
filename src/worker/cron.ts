import { and, eq, lt, sql } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import { cancelOrder } from "./services/orders";

export const EXPIRE_REASON = "Pago no recibido en 24 h";
const ONLY_PENDING = new Set(["pending_payment"] as const);

/** Cancela los pedidos con más de 24 h en Pendiente de pago y devuelve su stock (RN-12). */
export async function expirePendingOrders(db: Db): Promise<number> {
  const { orders } = schema;
  const due = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "pending_payment"), lt(orders.createdAt, sql`now() - interval '24 hours'`)));
  let cancelled = 0;
  for (const o of due) {
    if (await cancelOrder(db, o.id, { type: "sistema", userId: null }, EXPIRE_REASON, ONLY_PENDING)) cancelled++;
  }
  return cancelled;
}
