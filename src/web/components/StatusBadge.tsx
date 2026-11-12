import { STATUS_LABEL, type OrderStatus } from "@shared/order-status";
import { Badge } from "./ui/misc";

const TONE: Record<OrderStatus, "neutral" | "success" | "warning" | "danger" | "accent"> = {
  pending_payment: "warning",
  paid: "accent",
  preparing: "accent",
  shipped: "accent",
  delivered: "success",
  cancelled: "danger",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
