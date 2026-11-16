import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { formatPEN } from "@shared/money";
import { STATUS_LABEL } from "@shared/order-status";
import { PAYMENT_LABEL, type Receipt } from "@shared/types";
import { apiFetch, ApiError } from "@web/api";
import { useSession } from "@web/auth";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { formatDate } from "@web/components/StatusBadge";
import { TotalsBox } from "@web/components/TotalsBox";
import { Button } from "@web/components/ui/button";

/** Comprobante imprimible del pedido, con los montos congelados y el desglose de IGV (HU-52). */
export default function ReceiptPage() {
  const { number = "" } = useParams();
  useTitle(`Comprobante ${number}`);
  const { data: me, isPending } = useSession();
  const q = useQuery({ queryKey: ["orders", number, "receipt"], queryFn: () => apiFetch<Receipt>(`/orders/${number}/receipt`), enabled: Boolean(me) });

  if (isPending) return <LoadingBlock />;
  if (!me) return <EmptyState title="Inicia sesión para ver tu comprobante" action={<Button asChild><Link to={`/ingresar?volver=/pedidos/${number}/comprobante`}>Ingresar</Link></Button>} />;
  if (q.isPending) return <LoadingBlock label="Preparando el comprobante…" />;
  if (q.isError)
    return q.error instanceof ApiError && q.error.status === 404 ? (
      <EmptyState title="Pedido no encontrado" action={<Button asChild variant="secondary"><Link to="/pedidos">Mis pedidos</Link></Button>} />
    ) : (
      <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
    );
  const r = q.data;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={`/pedidos/${r.number}`} className="inline-flex items-center gap-1 text-sm text-accent hover:underline"><ArrowLeft aria-hidden className="size-4" /> Volver al pedido</Link>
        <Button onClick={() => window.print()}><Printer aria-hidden className="size-4" /> Imprimir</Button>
      </div>

      <article aria-label={`Comprobante del pedido ${r.number}`} className="receipt flex flex-col gap-5 rounded-[18px] border border-border p-6 text-[15px] print:rounded-none print:border-0 print:p-0 print:text-[11pt]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-[22px] font-semibold tracking-tight">{r.store.name}</p>
            <p className="text-muted">WhatsApp {r.store.whatsappNumber}</p>
            <p className="text-muted">{r.store.pickupAddress}</p>
          </div>
          <div className="text-right">
            <h1 className="text-[20px] font-semibold">Comprobante de pedido</h1>
            <p className="tabular text-[17px] font-semibold">{r.number}</p>
            <p className="text-muted">{formatDate(r.createdAt)}</p>
            <p className="mt-1 font-semibold">Estado: {STATUS_LABEL[r.status]}</p>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 print:grid-cols-2" aria-label="Cliente y entrega">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Cliente</h2>
            <p className="font-medium">{r.customer.name}</p>
            <p>{r.customer.email}</p>
            <p>{r.customer.phone}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Entrega</h2>
            {r.shipping ? (
              <>
                <p className="font-medium">{r.shipping.name} · {r.shipping.phone}</p>
                <p>{r.shipping.address}, {r.shipping.district}{r.shipping.reference ? ` (${r.shipping.reference})` : ""}</p>
                {r.zoneName && <p className="text-muted">{r.zoneName}</p>}
              </>
            ) : (
              <p>Recojo en tienda: {r.pickupAddress ?? r.store.pickupAddress}</p>
            )}
          </div>
        </section>

        <table className="w-full text-left">
          <caption className="sr-only">Productos del pedido</caption>
          <thead className="border-b border-border text-sm text-muted">
            <tr>
              <th scope="col" className="py-2 pr-2 font-medium">Producto</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Cant.</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Precio</th>
              <th scope="col" className="py-2 pl-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {r.items.map((i) => (
              <tr key={`${i.productId}-${i.sku ?? ""}`} className="break-inside-avoid border-b border-border">
                <td className="py-2 pr-2">
                  <span className="font-medium">{i.name}</span>
                  {i.variantLabel && <span className="block text-sm text-muted">{i.variantLabel}{i.sku ? ` · SKU ${i.sku}` : ""}</span>}
                </td>
                <td className="tabular px-2 py-2 text-right">{i.quantity}</td>
                <td className="tabular px-2 py-2 text-right">{formatPEN(i.unitPriceCents)}</td>
                <td className="tabular py-2 pl-2 text-right">{formatPEN(i.lineTotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto w-full max-w-xs break-inside-avoid">
          <TotalsBox totals={r.totals} showShipping couponCode={r.couponCode} />
        </div>

        <p>
          <span className="font-medium">Pago:</span> {PAYMENT_LABEL[r.payment.method]}
          {r.payment.cardLast4 ? ` terminada en ${r.payment.cardLast4}` : ""}
          {r.payment.operationCode ? ` · Operación ${r.payment.operationCode}` : ""}
        </p>
        <footer className="border-t border-border pt-3 text-sm text-muted">
          Comprobante de pedido, no es una factura electrónica. Pago simulado: no se cobró dinero real.
        </footer>
      </article>
    </div>
  );
}
