import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, CreditCard, MessageCircle, ShieldCheck, Smartphone, Store, Truck } from "lucide-react";
import { formatPEN, orderTotals } from "@shared/money";
import { isValidLuhn, onlyDigits } from "@shared/luhn";
import { PAYMENT_LABEL, type CheckoutOptions, type OrderDetail, type PaymentMethodCode } from "@shared/types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { useSession } from "@web/auth";
import { useCart } from "@web/cart/useCart";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { TotalsBox } from "@web/components/TotalsBox";
import { Button } from "@web/components/ui/button";
import { Field, Input, Select } from "@web/components/ui/form";
import { Card } from "@web/components/ui/misc";

type Errors = Record<string, string>;
const ICON: Record<PaymentMethodCode, typeof CreditCard> = {
  card: CreditCard,
  yape_plin: Smartphone,
  transfer: Building2,
  whatsapp: MessageCircle,
};

/** Checkout: entrega, 4 métodos de pago simulados y resumen con desglose (HU-14 a HU-18, HU-20). */
export default function Checkout() {
  useTitle("Pagar");
  const navigate = useNavigate();
  const session = useSession();
  const cart = useCart();
  const options = useQuery({
    queryKey: ["checkout-options"],
    queryFn: () => apiFetch<CheckoutOptions>("/checkout/options"),
    enabled: Boolean(session.data && session.data.role === "cliente"),
  });

  if (session.isPending) return <LoadingBlock />;
  if (!session.data) return <Navigate to="/ingresar?volver=/checkout" replace />;
  if (session.data.role !== "cliente")
    return <EmptyState title="Las cuentas de administrador no pueden comprar" description="Ingresa con una cuenta de cliente para comprar." />;
  if (options.isPending || cart.quote.isPending) return <LoadingBlock label="Preparando el pago…" />;
  if (options.isError) return <ErrorState message={options.error.message} onRetry={() => options.refetch()} />;
  if (cart.quote.isError) return <ErrorState message={cart.quote.error.message} onRetry={() => cart.quote.refetch()} />;
  if (!cart.quote.data.lines.some((l) => l.available))
    return <EmptyState title="Tu carrito está vacío" action={<Button asChild><Link to="/catalogo">Ver catálogo</Link></Button>} />;

  return <CheckoutForm o={options.data} cart={cart} navigate={navigate} />;
}

/** Formulario del checkout; su estado inicial sale de las opciones ya cargadas. */
function CheckoutForm({
  o,
  cart,
  navigate,
}: {
  o: CheckoutOptions;
  cart: ReturnType<typeof useCart>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [method, setMethod] = useState<"pickup" | "delivery">("delivery");
  const [addr, setAddr] = useState({ ...o.address, zoneId: o.zones[0]?.id ?? "" });
  const [pay, setPay] = useState<PaymentMethodCode | null>(o.methods[0] ?? null);
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "" });
  const [operationCode, setOperationCode] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const available = cart.quote.data!.lines.filter((l) => l.available);

  const zone = o.zones.find((z) => z.id === addr.zoneId);
  const shipping = method === "delivery" ? (zone?.costCents ?? 0) : 0;
  const totals = orderTotals(available, shipping, 0);
  const err = (k: string) => errors[k];

  function validate(): Errors {
    const e: Errors = {};
    if (method === "delivery") {
      if (!addr.zoneId) e["delivery.zoneId"] = "Elige una zona de delivery.";
      if (addr.name.trim().length < 2) e["delivery.name"] = "Escribe el nombre de quien recibe.";
      if (!/^9\d{8}$/.test(addr.phone.trim())) e["delivery.phone"] = "Escribe un celular de 9 dígitos que empiece con 9.";
      if (addr.address.trim().length < 5) e["delivery.address"] = "Escribe la dirección de entrega.";
      if (addr.district.trim().length < 2) e["delivery.district"] = "Escribe el distrito.";
    }
    if (!pay) e["payment.method"] = "Elige un método de pago.";
    if (pay === "card") {
      if (!isValidLuhn(card.number)) e["payment.cardNumber"] = "El número de tarjeta no es válido.";
      const m = card.expiry.match(/^(\d{2})\/(\d{2})$/);
      const now = new Date();
      const month = m ? Number(m[1]) : 0;
      const year = m ? 2000 + Number(m[2]) : 0;
      if (!m || month < 1 || month > 12 || year * 12 + month - 1 < now.getFullYear() * 12 + now.getMonth())
        e["payment.expiry"] = "Usa el formato MM/AA y una fecha no vencida.";
      if (!/^\d{3}$/.test(card.cvv)) e["payment.cvv"] = "El CVV tiene 3 dígitos.";
    }
    if (pay === "yape_plin" && !/^\d{6,12}$/.test(operationCode.trim()))
      e["payment.operationCode"] = "El código de operación tiene de 6 a 12 dígitos.";
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    const [mm, yy] = card.expiry.split("/");
    const payment =
      pay === "card"
        ? { method: "card", cardNumber: onlyDigits(card.number), expMonth: Number(mm), expYear: 2000 + Number(yy), cvv: card.cvv }
        : pay === "yape_plin"
          ? { method: pay, operationCode: operationCode.trim() }
          : pay === "transfer"
            ? { method: pay, operationCode: operationCode.trim() || undefined }
            : { method: pay };
    const delivery = method === "pickup" ? { method } : { method, ...addr };
    setSending(true);
    try {
      const res = await apiFetch<{ order: OrderDetail; whatsappUrl?: string }>("/checkout/orders", {
        method: "POST",
        json: { delivery, payment, expectedTotalCents: totals.totalCents },
      });
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      if (res.whatsappUrl) {
        try {
          sessionStorage.setItem(`wa-${res.order.number}`, res.whatsappUrl);
        } catch {
          // Sin almacenamiento: el botón de la confirmación usa el estado de la navegación.
        }
        window.open(res.whatsappUrl, "_blank", "noopener");
      }
      navigate(`/pedido/${res.order.number}/confirmacion`, { state: { whatsappUrl: res.whatsappUrl }, replace: true });
    } catch (x) {
      if (x instanceof ApiError) {
        if (x.code === "STOCK") {
          toast.error(x.message);
          navigate("/carrito");
          return;
        }
        if (x.code === "PRICE_CHANGED") await cart.quote.refetch();
        setErrors(x.fields);
        setFormError(x.message);
      } else setFormError("No pudimos completar el pedido. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <h1 className="text-[28px] font-semibold tracking-tight">Pagar</h1>
      {formError && (
        <p role="alert" className="rounded-2xl bg-danger/10 p-4 text-[15px] text-danger">
          {formError}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <Card>
            <fieldset className="flex flex-col gap-4">
              <legend className="mb-3 flex items-center gap-2 text-[17px] font-semibold">
                <Truck aria-hidden className="size-5 text-accent" /> Entrega
              </legend>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Forma de entrega">
                {(["delivery", "pickup"] as const).map((m) => (
                  <label key={m} className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 ${method === m ? "border-accent" : "border-border"}`}>
                    <input type="radio" name="entrega" className="mt-1 size-4 accent-[var(--accent)]" checked={method === m} onChange={() => setMethod(m)} />
                    <span>
                      <span className="flex items-center gap-2 font-medium">
                        {m === "delivery" ? <Truck aria-hidden className="size-4" /> : <Store aria-hidden className="size-4" />}
                        {m === "delivery" ? "Delivery" : "Recojo en tienda"}
                      </span>
                      <span className="text-sm text-muted">{m === "delivery" ? "Costo fijo según la zona" : "Sin costo"}</span>
                    </span>
                  </label>
                ))}
              </div>
              {method === "pickup" ? (
                <p className="text-[15px] text-muted">Recoges en: {o.pickupAddress}</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Zona de delivery" error={err("delivery.zoneId")}>
                    {(p) => (
                      <Select {...p} value={addr.zoneId} onChange={(e) => setAddr({ ...addr, zoneId: e.target.value })}>
                        {o.zones.map((z) => (
                          <option key={z.id} value={z.id}>{z.name}: {formatPEN(z.costCents)}</option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  {(
                    [
                      ["name", "Nombre de quien recibe", "name"],
                      ["phone", "Celular", "tel-national"],
                      ["address", "Dirección", "street-address"],
                      ["district", "Distrito", "address-level2"],
                    ] as const
                  ).map(([k, label, ac]) => (
                    <Field key={k} label={label} error={err(`delivery.${k}`)}>
                      {(p) => <Input {...p} autoComplete={ac} value={addr[k]} onChange={(e) => setAddr({ ...addr, [k]: e.target.value })} />}
                    </Field>
                  ))}
                  <Field label="Referencia (opcional)" error={err("delivery.reference")}>
                    {(p) => <Input {...p} value={addr.reference} onChange={(e) => setAddr({ ...addr, reference: e.target.value })} />}
                  </Field>
                </div>
              )}
            </fieldset>
          </Card>

          <Card>
            <fieldset className="flex flex-col gap-4">
              <legend className="mb-3 flex items-center gap-2 text-[17px] font-semibold">
                <ShieldCheck aria-hidden className="size-5 text-accent" /> Método de pago
              </legend>
              <p className="rounded-2xl bg-accent/10 p-3 text-sm font-medium text-accent">Pago simulado, no se cobra dinero real.</p>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Método de pago">
                {o.methods.map((m) => {
                  const Icon = ICON[m];
                  return (
                    <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 ${pay === m ? "border-accent" : "border-border"}`}>
                      <input type="radio" name="pago" className="size-4 accent-[var(--accent)]" checked={pay === m} onChange={() => { setPay(m); setOperationCode(""); }} />
                      <Icon aria-hidden className="size-5" />
                      <span className="font-medium">{PAYMENT_LABEL[m]}</span>
                    </label>
                  );
                })}
              </div>
              {err("payment.method") && <p role="alert" className="text-sm text-danger">{err("payment.method")}</p>}

              {pay === "card" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-3">
                    <Field label="Número de tarjeta" hint="Prueba: 4111 1111 1111 1111 aprueba; 4000 0000 0000 0002 rechaza" error={err("payment.cardNumber")}>
                      {(p) => <Input {...p} inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, "").slice(0, 23) })} />}
                    </Field>
                  </div>
                  <Field label="Vencimiento (MM/AA)" error={err("payment.expiry")}>
                    {(p) => (
                      <Input {...p} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={card.expiry}
                        onChange={(e) => {
                          const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setCard({ ...card, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
                        }} />
                    )}
                  </Field>
                  <Field label="CVV" error={err("payment.cvv")}>
                    {(p) => <Input {...p} inputMode="numeric" autoComplete="cc-csc" type="password" placeholder="123" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 3) })} />}
                  </Field>
                </div>
              )}
              {pay === "yape_plin" && (
                <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-start">
                  <img src={o.yape.qrUrl} alt="Código QR de ejemplo para pagar con Yape o Plin" width={180} height={197} className="rounded-2xl bg-white p-2" />
                  <div className="flex flex-col gap-3">
                    <p className="text-[15px]">Yape: <strong className="tabular">{o.yape.number}</strong> · Plin: <strong className="tabular">{o.plin.number}</strong> (números de ejemplo)</p>
                    <p className="text-[15px]">Monto a pagar: <strong className="tabular">{formatPEN(totals.totalCents)}</strong></p>
                    <Field label="Código de operación" hint="Lo ves en tu app después de pagar" error={err("payment.operationCode")}>
                      {(p) => <Input {...p} inputMode="numeric" value={operationCode} onChange={(e) => setOperationCode(e.target.value.replace(/\D/g, "").slice(0, 12))} />}
                    </Field>
                  </div>
                </div>
              )}
              {pay === "transfer" && (
                <div className="flex flex-col gap-3">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-2xl bg-canvas p-4 text-[15px]">
                    <dt className="text-muted">Banco</dt><dd>{o.bank.name}</dd>
                    <dt className="text-muted">Titular</dt><dd>{o.bank.holder}</dd>
                    <dt className="text-muted">Cuenta</dt><dd className="tabular">{o.bank.account}</dd>
                    <dt className="text-muted">CCI</dt><dd className="tabular">{o.bank.cci}</dd>
                    <dt className="text-muted">Monto</dt><dd className="tabular font-semibold">{formatPEN(totals.totalCents)}</dd>
                  </dl>
                  <Field label="Número de operación (opcional)" error={err("payment.operationCode")}>
                    {(p) => <Input {...p} value={operationCode} onChange={(e) => setOperationCode(e.target.value.slice(0, 30))} />}
                  </Field>
                </div>
              )}
              {pay === "whatsapp" && (
                <p className="text-[15px] text-muted">Al confirmar se abrirá WhatsApp con el resumen de tu pedido para coordinar el pago con R Cube.</p>
              )}
              {pay && pay !== "card" && (
                <p className="text-sm text-warning">Tu pedido quedará como «Pendiente de pago» y se cancela si no se paga en 24 horas.</p>
              )}
            </fieldset>
          </Card>
        </div>

        <Card className="flex h-fit flex-col gap-4 lg:sticky lg:top-24">
          <h2 className="text-[17px] font-semibold">Resumen</h2>
          <ul className="flex flex-col gap-2 text-[15px]">
            {available.map((l) => (
              <li key={`${l.productId}-${l.variantId ?? ""}`} className="flex justify-between gap-3">
                <span>{l.quantity} × {l.name}{l.variantLabel ? ` (${l.variantLabel})` : ""}</span>
                <span className="tabular shrink-0">{formatPEN(l.lineTotalCents)}</span>
              </li>
            ))}
          </ul>
          <TotalsBox totals={totals} showShipping />
          <Button type="submit" size="lg" disabled={sending || !pay}>
            {sending ? "Procesando…" : pay === "whatsapp" ? "Coordinar por WhatsApp" : `Confirmar pedido por ${formatPEN(totals.totalCents)}`}
          </Button>
          <Link to="/carrito" className="text-center text-sm text-accent hover:underline">Volver al carrito</Link>
        </Card>
      </div>
    </form>
  );
}
