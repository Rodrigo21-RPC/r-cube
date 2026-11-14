export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type DeliveryMethod = "delivery" | "pickup";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

/** Estados desde los que el cliente puede cancelar (HU-24). */
export const CANCELLABLE_BY_CUSTOMER: ReadonlySet<OrderStatus> = new Set([
  "pending_payment",
  "paid",
  "preparing",
]);

const NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Transiciones válidas de REQUISITOS §5 (RN-11: nada pasa a Preparando sin estar Pagado). */
export function canTransition(from: OrderStatus, to: OrderStatus, method: DeliveryMethod): boolean {
  if (from === "preparing" && to === "delivered") return method === "pickup";
  if (from === "preparing" && to === "shipped") return method === "delivery";
  return NEXT[from].includes(to);
}
