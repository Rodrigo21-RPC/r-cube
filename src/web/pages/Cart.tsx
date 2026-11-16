import { Link, useNavigate } from "react-router";
import { AlertCircle, Trash2 } from "lucide-react";
import { formatPEN } from "@shared/money";
import { useCart } from "@web/cart/useCart";
import { lineKey } from "@web/stores/cart";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { CouponBox } from "@web/components/CouponBox";
import { TotalsBox } from "@web/components/TotalsBox";
import { Button } from "@web/components/ui/button";
import { Card } from "@web/components/ui/misc";

/** Carrito: cantidades limitadas al stock, avisos de cambios y desglose de IGV (HU-11 a HU-13). */
export default function Cart() {
  useTitle("Carrito");
  const navigate = useNavigate();
  const cart = useCart();
  const { quote } = cart;

  if (quote.isPending) return <LoadingBlock label="Cargando carrito…" />;
  if (quote.isError) return <ErrorState message={quote.error.message} onRetry={() => quote.refetch()} />;
  const { lines, warnings, totals } = quote.data;

  if (lines.length === 0)
    return (
      <EmptyState
        title="Tu carrito está vacío"
        description="Explora el catálogo y agrega lo que te guste."
        action={<Button asChild><Link to="/catalogo">Ver catálogo</Link></Button>}
      />
    );

  const mustChoose = (l: (typeof lines)[number]) => !l.variantId && warnings.some((w) => w.type === "choose_variant" && w.productId === l.productId);
  // Una línea sin variante de un producto con variantes bloquea el pago hasta elegir o quitarla (clarificación 1).
  const payable = lines.some((l) => l.available) && !lines.some(mustChoose);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-semibold tracking-tight">Carrito</h1>

      <div aria-live="polite">
        {warnings.length > 0 && (
          <ul className="flex flex-col gap-2 rounded-[18px] border border-warning/40 bg-warning/10 p-4">
            {warnings.map((w, i) => (
              <li key={`${w.productId}-${w.type}-${i}`} className="flex gap-2 text-[15px]">
                <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
                {w.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <ul className="flex flex-col gap-3">
          {lines.map((l) => (
            <li key={lineKey(l.productId, l.variantId)}>
              <Card className={`flex gap-4 ${l.available ? "" : "opacity-70"}`}>
                <img src={l.imageUrl} alt="" width={88} height={88} loading="lazy" className="size-20 shrink-0 rounded-xl bg-canvas object-contain" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Link to={`/producto/${l.slug}`} className="font-semibold hover:underline">{l.name}</Link>
                  {l.variantLabel && <p className="text-sm text-muted">{l.variantLabel}</p>}
                  <p className="tabular text-sm text-muted">{formatPEN(l.unitPriceCents)} c/u</p>
                  {l.available ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <label htmlFor={`qty-${lineKey(l.productId, l.variantId)}`} className="sr-only">Cantidad de {l.name}{l.variantLabel ? ` (${l.variantLabel})` : ""}</label>
                      <select
                        id={`qty-${lineKey(l.productId, l.variantId)}`}
                        value={l.quantity}
                        disabled={cart.busy}
                        onChange={(e) => cart.setQuantity(l.productId, l.variantId, Number(e.target.value))}
                        className="h-10 rounded-full border border-input bg-canvas px-3 text-[15px]"
                      >
                        {Array.from({ length: Math.min(l.maxQuantity, 99) }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <span className="text-sm text-muted">Máximo {l.maxQuantity}</span>
                    </div>
                  ) : mustChoose(l) ? (
                    <p className="text-sm font-medium text-danger">
                      Elige una variante: <Link to={`/producto/${l.slug}`} className="underline underline-offset-2">ir al producto</Link> o quita esta línea
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-danger">No disponible: no se incluye en el total</p>
                  )}
                </div>
                <div className="flex flex-col items-end justify-between gap-2">
                  <span className="tabular font-semibold">{formatPEN(l.lineTotalCents)}</span>
                  <Button variant="ghost" size="icon" aria-label={`Quitar ${l.name}${l.variantLabel ? ` (${l.variantLabel})` : ""} del carrito`} disabled={cart.busy} onClick={() => cart.remove(l.productId, l.variantId)}>
                    <Trash2 aria-hidden className="size-5" />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <Card className="flex h-fit flex-col gap-4 lg:sticky lg:top-24">
          <h2 className="text-[17px] font-semibold">Resumen</h2>
          <CouponBox quote={quote.data} signedIn={cart.signedIn} busy={cart.busy} />
          <TotalsBox totals={totals} couponCode={quote.data.coupon?.code} />
          <p className="text-sm text-muted">El costo de envío se calcula en el siguiente paso.</p>
          <Button size="lg" disabled={!payable || cart.busy} onClick={() => navigate(cart.signedIn ? "/checkout" : "/ingresar?volver=/checkout")}>
            Pagar
          </Button>
        </Card>
      </div>
    </div>
  );
}
