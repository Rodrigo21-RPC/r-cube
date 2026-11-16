import { schema } from "@db/client";
import { orderStatusMessage, type OrderStatus } from "@shared/order-status";
import type { Tx } from "./stock";

/**
 * Crea el aviso del cliente dentro de la transacción que cambia el estado del pedido: si el cambio se revierte,
 * el aviso también. Solo se llama cuando cambia el administrador o el sistema, nunca por una acción del propio
 * cliente (FR-029).
 */
export async function notifyOrderStatus(
  tx: Tx,
  order: { id: string; userId: string; number: string },
  to: OrderStatus,
  reason?: string | null,
): Promise<void> {
  await tx.insert(schema.notification).values({
    id: crypto.randomUUID(),
    userId: order.userId,
    orderId: order.id,
    orderNumber: order.number,
    message: orderStatusMessage(order.number, to, reason),
  });
}
