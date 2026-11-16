import { Link, useLocation, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, MessageCircle } from "lucide-react";
import { formatPEN } from "@shared/money";
import { STATUS_LABEL } from "@shared/order-status";
import { PAYMENT_LABEL, type OrderDetail } from "@shared/types";
import { apiFetch } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { ErrorState, LoadingBlock } from "@web/components/States";
import { TotalsBox } from "@web/components/TotalsBox";
import { Button } from "@web/components/ui/button";
import { Card } from "@web/components/ui/misc";

function storedLink(number: string): string | undefined {
  try {
    return sessionStorage.getItem(`wa-${number}`) ?? undefined;
  } catch {
    return undefined;
  }
}

const NEXT_STEPS: Record<string, string> = {
  card: "Tu pago fue aprobado. Te avisaremos cuando preparemos tu pedido.",
  yape_plin: "Verificaremos tu código de operación y confirmaremos el pago.",
  transfer: "Haz la transferencia con el monto exacto; confirmaremos el pago al recibirla.",
  whatsapp: "Coordina el pago con R Cube por WhatsApp.",
};

/** Confirmación del pedido con número, desglose, entrega y siguientes pasos (HU-21, HU-20). */
export default function Confirmation() {
  const { number = "" } = useParams();
  const location = useLocation();
  useTitle(`Pedido ${number}`);
  const q = useQuery({ queryKey: ["orders", number], queryFn: () => apiFetch<OrderDetail>(`/orders/${number}`) });
  const whatsapp = (location.state as { whatsappUrl?: string } | null)?.whatsappUrl ?? storedLink(number);

  if (q.isPending) return <LoadingBlock />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  const o = q.data;
  const pending = o.status === "pending_payment";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        {pending ? <Clock aria-hidden className="size-12 text-warning" /> : <CheckCircle2 aria-hidden className="size-12 text-success" />}
        <h1 className="text-[28px] font-semibold tracking-tight">¡Gracias por tu compra!</h1>
        <p className="text-muted">
          Pedido <strong className="tabular text-text">{o.number}</strong> · {STATUS_LABEL[o.status]}
        </p>
      </div>

      {pending && (
        <p role="status" className="rounded-2xl bg-warning/10 p-4 text-[15px] text-warning">
          Si el pago no se confirma en 24 horas, el pedido se cancelará automáticamente.
        </p>
      )}

      <Card className="flex flex-col gap-3">
        <h2 className="text-[17px] font-semibold">Siguientes pasos</h2>
        <p>{NEXT_STEPS[o.payment.method]}</p>
        {o.payment.method === "whatsapp" && whatsapp && (
          <Button asChild className="w-fit">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden className="size-5" /> Abrir WhatsApp
            </a>
          </Button>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-[17px] font-semibold">Productos</h2>
        <ul className="flex flex-col gap-2 text-[15px]">
          {o.items.map((i) => (
            <li key={`${i.productId}-${i.sku ?? ""}`} className="flex justify-between gap-3">
              <span>{i.quantity} × {i.name}{i.variantLabel ? ` (${i.variantLabel})` : ""}</span>
              <span className="tabular shrink-0">{formatPEN(i.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <TotalsBox totals={o.totals} showShipping couponCode={o.couponCode} />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
          <dt className="text-muted">Pago</dt>
          <dd>{PAYMENT_LABEL[o.payment.method]}{o.payment.cardLast4 ? ` terminada en ${o.payment.cardLast4}` : ""}</dd>
          <dt className="text-muted">Entrega</dt>
          <dd>
            {o.deliveryMethod === "pickup"
              ? `Recojo en tienda: ${o.pickupAddress ?? ""}`
              : `Delivery a ${o.shipping?.address}, ${o.shipping?.district} (${o.zoneName})`}
          </dd>
        </dl>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild><Link to={`/pedidos/${o.number}`}>Ver mi pedido</Link></Button>
        <Button asChild variant="secondary"><Link to="/catalogo">Seguir comprando</Link></Button>
      </div>
    </div>
  );
}
