import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { formatPEN } from "@shared/money";
import { STATUS_LABEL, type OrderStatus } from "@shared/order-status";
import { PAYMENT_LABEL } from "@shared/types";
import type { AdminOrderDetail } from "@shared/admin-types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { StatusBadge, formatDate } from "@web/components/StatusBadge";
import { TotalsBox } from "@web/components/TotalsBox";
import { Button } from "@web/components/ui/button";
import { Select } from "@web/components/ui/form";
import { Card } from "@web/components/ui/misc";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { WhatsAppLink } from "../components/WhatsAppLink";
import { PaymentActions } from "./Payments";

const ACTOR = { cliente: "Cliente", administrador: "R Cube", sistema: "Sistema" } as const;

/** Detalle del pedido con cambio de estado por transiciones válidas (HU-35) y pagos (HU-36). */
export default function OrderDetail() {
  const { number = "" } = useParams();
  useTitle(`Panel: pedido ${number}`);
  const q = useQuery({ queryKey: ["admin", "order", number], queryFn: () => apiFetch<AdminOrderDetail>(`/admin/orders/${number}`) });
  const [to, setTo] = useState<OrderStatus | "">("");

  if (q.isPending) return <LoadingBlock />;
  if (q.isError)
    return q.error instanceof ApiError && q.error.status === 404 ? <EmptyState title="Pedido no encontrado" /> : <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  const o = q.data;
  const next = o.allowedTransitions.filter((s) => s !== "cancelled");

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
  };
  async function change(target: OrderStatus, reason?: string) {
    try {
      await apiFetch(`/admin/orders/${number}/status`, { method: "POST", json: { to: target, expectedStatus: o.status, reason } });
      toast.success(`Pedido en ${STATUS_LABEL[target]}.`);
      setTo("");
    } catch (e) {
      if (e instanceof ApiError && e.code === "STATE_CHANGED") toast.error(e.message);
      else throw e instanceof ApiError ? new Error(e.message) : e;
    } finally {
      await refresh();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Link to="/admin/pedidos" className="inline-flex w-fit items-center gap-1 text-sm text-accent hover:underline"><ArrowLeft aria-hidden className="size-4" /> Pedidos</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="tabular text-[28px] font-semibold tracking-tight">Pedido {o.number}</h1>
          <StatusBadge status={o.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WhatsAppLink phone={o.customer.phone} name={o.customer.name} orderNumber={o.number} />
          {o.status === "pending_payment" && <PaymentActions number={o.number} onDone={refresh} />}
          {next.length > 0 && (
            <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (to) void change(to).catch((x: Error) => toast.error(x.message)); }}>
              <label htmlFor="nuevo-estado" className="sr-only">Nuevo estado</label>
              <Select id="nuevo-estado" className="h-10 w-auto" value={to} onChange={(e) => setTo(e.target.value as OrderStatus)}>
                <option value="">Cambiar estado…</option>
                {next.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </Select>
              <Button type="submit" size="sm" disabled={!to}>Guardar estado</Button>
            </form>
          )}
          {o.allowedTransitions.includes("cancelled") && (
            <ConfirmDialog
              title={`¿Cancelar el pedido ${o.number}?`}
              description="El stock vuelve a la tienda y el cliente verá el motivo."
              confirmLabel="Cancelar pedido"
              danger
              reasonLabel="Motivo de la cancelación"
              onConfirm={(reason) => change("cancelled", reason)}
              trigger={(open) => <Button variant="secondary" size="sm" onClick={open}>Cancelar pedido</Button>}
            />
          )}
        </div>
      </div>
      <Card className="grid gap-4 md:grid-cols-3">
        <div><p className="text-xs uppercase tracking-wide text-muted">Cliente</p><p className="font-medium">{o.customer.name}</p><p className="text-sm text-muted">{o.customer.email}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted">Teléfono</p><p>{o.shipping?.phone || o.customer.phone}</p></div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Entrega</p>
          <p>{o.deliveryMethod === "pickup" ? `Recojo en tienda` : `${o.shipping?.address}, ${o.shipping?.district}${o.shipping?.reference ? ` (${o.shipping.reference})` : ""} · ${o.zoneName}`}</p>
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="min-w-0">
          <h2 className="mb-3 text-[17px] font-semibold">Productos</h2>
          <div role="region" aria-label="Productos del pedido" tabIndex={0} className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <caption className="sr-only">Productos del pedido</caption>
            <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th scope="col" className="pb-2">Producto</th><th scope="col" className="whitespace-nowrap pb-2 pl-3 text-right">Cant.</th><th scope="col" className="whitespace-nowrap pb-2 pl-3 text-right">Precio</th><th scope="col" className="whitespace-nowrap pb-2 pl-3 text-right">Subtotal</th></tr></thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={`${i.productId}-${i.sku ?? ""}`} className="border-t border-border">
                  <td className="py-2">
                    {i.name}
                    {i.variantLabel && <span className="block text-sm text-muted">{i.variantLabel}{i.sku ? ` · SKU ${i.sku}` : ""}</span>}
                  </td>
                  <td className="tabular whitespace-nowrap py-2 pl-3 text-right">{i.quantity}</td>
                  <td className="tabular whitespace-nowrap py-2 pl-3 text-right">{formatPEN(i.unitPriceCents)}</td>
                  <td className="tabular whitespace-nowrap py-2 pl-3 text-right">{formatPEN(i.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
        <div className="flex flex-col gap-5">
          <Card><TotalsBox totals={o.totals} showShipping couponCode={o.couponCode} /></Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">Pago</p>
            <p>{PAYMENT_LABEL[o.payment.method]}{o.payment.cardLast4 ? ` terminada en ${o.payment.cardLast4}` : ""}</p>
            {o.payment.operationCode && <p className="tabular text-sm text-muted">Operación {o.payment.operationCode}</p>}
          </Card>
        </div>
      </div>
      <Card>
        <h2 className="mb-3 text-[17px] font-semibold">Línea de tiempo</h2>
        <ol className="relative ml-2 flex flex-col gap-4 border-l-2 border-border pl-5">
          {o.events.map((e, i) => (
            <li key={i} className="relative">
              <span aria-hidden className="absolute -left-[27px] top-1 size-3 rounded-full bg-accent" />
              <p className="font-medium">{STATUS_LABEL[e.toStatus]}</p>
              <p className="text-sm text-muted">{formatDate(e.createdAt)} · {ACTOR[e.actor]}</p>
              {e.reason && <p className="text-sm">Motivo: {e.reason}</p>}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
