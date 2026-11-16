import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { formatPEN } from "@shared/money";
import { STATUS_LABEL } from "@shared/order-status";
import { PAYMENT_LABEL, type OrderDetail as Detail } from "@shared/types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { StatusBadge, formatDate } from "@web/components/StatusBadge";
import { TotalsBox } from "@web/components/TotalsBox";
import { Button } from "@web/components/ui/button";
import { Field, Input } from "@web/components/ui/form";
import { Card, Dialog } from "@web/components/ui/misc";

const REASONS = [
  ["no_lo_necesito", "Ya no lo necesito"],
  ["me_equivoque", "Me equivoqué en el pedido"],
  ["otra_opcion", "Encontré otra opción"],
  ["otro", "Otro"],
] as const;
const ACTOR = { cliente: "Tú", administrador: "R Cube", sistema: "Sistema" } as const;

function CancelDialog({ number, onDone }: { number: string; onDone: (d: Detail) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function confirm() {
    setError(null);
    if (!reason) return setError("Elige un motivo.");
    if (reason === "otro" && detail.trim().length < 3) return setError("Cuéntanos el motivo (mínimo 3 caracteres).");
    setSending(true);
    try {
      const d = await apiFetch<Detail>(`/orders/${number}/cancel`, { method: "POST", json: { reason, detail: reason === "otro" ? detail : undefined } });
      onDone(d);
      setOpen(false);
      toast.success("Tu pedido fue cancelado.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos cancelar el pedido.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Cancelar pedido</Button>
      <Dialog open={open} onOpenChange={setOpen} title={`¿Cancelar el pedido ${number}?`} description="Las unidades vuelven al stock de la tienda. Esta acción no se puede deshacer.">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Motivo</legend>
          {REASONS.map(([value, label]) => (
            <label key={value} className="flex min-h-9 cursor-pointer items-center gap-2">
              <input type="radio" name="motivo" value={value} checked={reason === value} onChange={() => setReason(value)} className="size-4 accent-[var(--accent)]" />
              {label}
            </label>
          ))}
        </fieldset>
        {reason === "otro" && (
          <div className="mt-3">
            <Field label="Cuéntanos el motivo">{(p) => <Input {...p} value={detail} maxLength={200} onChange={(e) => setDetail(e.target.value)} />}</Field>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Volver</Button>
          <Button variant="danger" disabled={sending} onClick={confirm}>{sending ? "Cancelando…" : "Sí, cancelar pedido"}</Button>
        </div>
      </Dialog>
    </>
  );
}

/** Detalle del pedido con línea de tiempo y cancelación (HU-23, HU-24). */
export default function OrderDetail() {
  const { number = "" } = useParams();
  useTitle(`Pedido ${number}`);
  const q = useQuery({ queryKey: ["orders", number], queryFn: () => apiFetch<Detail>(`/orders/${number}`) });

  if (q.isPending) return <LoadingBlock />;
  if (q.isError) {
    if (q.error instanceof ApiError && (q.error.status === 404 || q.error.status === 401))
      return <EmptyState title="Pedido no encontrado" description="Revisa el número o ingresa con la cuenta con la que compraste." action={<Button asChild variant="secondary"><Link to="/pedidos">Mis pedidos</Link></Button>} />;
    return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  }
  const o = q.data;

  return (
    <div className="flex flex-col gap-5">
      <Link to="/pedidos" className="inline-flex w-fit items-center gap-1 text-sm text-accent hover:underline">
        <ArrowLeft aria-hidden className="size-4" /> Mis pedidos
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="tabular text-[28px] font-semibold tracking-tight">Pedido {o.number}</h1>
          <p className="text-sm text-muted">{formatDate(o.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={o.status} />
          <Button asChild variant="secondary" size="sm"><Link to={`/pedidos/${o.number}/comprobante`}>Ver comprobante</Link></Button>
          {o.canCancel && (
            <CancelDialog
              number={o.number}
              onDone={(d) => {
                queryClient.setQueryData(["orders", o.number], d);
                void queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
                void queryClient.invalidateQueries({ queryKey: ["catalog"] });
              }}
            />
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="mb-3 text-[17px] font-semibold">Productos</h2>
            <ul className="flex flex-col gap-3">
              {o.items.map((i) => (
                <li key={`${i.productId}-${i.sku ?? ""}`} className="flex items-center gap-3">
                  <img src={i.imageUrl || "/img/generico.svg"} alt="" width={56} height={56} loading="lazy" className="size-14 rounded-xl bg-canvas object-contain" />
                  <div className="flex-1">
                    <p className="font-medium">{i.name}</p>
                    {i.variantLabel && <p className="text-sm text-muted">{i.variantLabel}{i.sku ? ` · SKU ${i.sku}` : ""}</p>}
                    <p className="tabular text-sm text-muted">{i.quantity} × {formatPEN(i.unitPriceCents)}</p>
                  </div>
                  <span className="tabular font-medium">{formatPEN(i.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="mb-3 text-[17px] font-semibold">Seguimiento</h2>
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
        <div className="flex flex-col gap-5">
          <Card><TotalsBox totals={o.totals} showShipping couponCode={o.couponCode} /></Card>
          <Card>
            <dl className="flex flex-col gap-3 text-[15px]">
              <div>
                <dt className="text-muted">Pago</dt>
                <dd>{PAYMENT_LABEL[o.payment.method]}{o.payment.cardLast4 ? ` terminada en ${o.payment.cardLast4}` : ""}</dd>
                {o.payment.operationCode && <dd className="tabular text-sm text-muted">Operación {o.payment.operationCode}</dd>}
              </div>
              <div>
                <dt className="text-muted">Entrega</dt>
                <dd>
                  {o.deliveryMethod === "pickup"
                    ? `Recojo en tienda: ${o.pickupAddress ?? ""}`
                    : `${o.shipping?.name}, ${o.shipping?.address}, ${o.shipping?.district}${o.shipping?.reference ? ` (${o.shipping.reference})` : ""}. Zona: ${o.zoneName}`}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
