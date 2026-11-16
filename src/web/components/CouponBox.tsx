import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Ticket } from "lucide-react";
import type { CartQuote } from "@shared/types";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/form";
import { useCouponStore } from "@web/stores/coupon";

/**
 * Cupón del carrito y del checkout (HU-49): escribir el código, aplicarlo, quitarlo y ver por qué no vale.
 * El visitante guarda el código y se le pide iniciar sesión, porque el descuento se aplica al pagar.
 */
export function CouponBox({ quote, signedIn, busy = false }: { quote: CartQuote; signedIn: boolean; busy?: boolean }) {
  const { code, setCode, clear } = useCouponStore();
  const [text, setText] = useState("");

  function apply(e: FormEvent) {
    e.preventDefault();
    if (text.trim()) {
      setCode(text);
      setText("");
    }
  }

  if (code && !signedIn)
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3 text-[15px]">
        <p>
          Guardamos tu cupón <strong className="tabular">{code}</strong>.{" "}
          <Link to="/ingresar?volver=/carrito" className="text-accent underline underline-offset-2">Inicia sesión para aplicar tu cupón</Link>.
        </p>
        <Button size="sm" variant="ghost" className="w-fit" onClick={clear}>Quitar cupón</Button>
      </div>
    );

  if (code && quote.coupon)
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-success/10 p-3 text-[15px]" role="status">
        <span className="flex items-center gap-2"><Ticket aria-hidden className="size-4 text-success" /> Cupón <strong className="tabular">{quote.coupon.code}</strong> aplicado</span>
        <Button size="sm" variant="ghost" onClick={clear} aria-label={`Quitar el cupón ${quote.coupon.code}`}>Quitar</Button>
      </div>
    );

  return (
    <form onSubmit={apply} noValidate className="flex flex-col gap-2">
      <label htmlFor="cupon" className="text-sm font-medium">¿Tienes un cupón?</label>
      <div className="flex gap-2">
        <Input id="cupon" className="h-11" value={text} maxLength={20} autoComplete="off" placeholder="Escribe tu código" onChange={(e) => setText(e.target.value.toUpperCase())} aria-invalid={Boolean(code && quote.couponError)} aria-describedby={code && quote.couponError ? "cupon-error" : undefined} />
        <Button type="submit" variant="secondary" disabled={busy || !text.trim()}>Aplicar</Button>
      </div>
      {code && quote.couponError && (
        <div id="cupon-error" role="alert" className="flex items-center justify-between gap-3 text-sm text-danger">
          <span><strong className="tabular">{code}</strong>: {quote.couponError.message}.</span>
          <Button size="sm" variant="ghost" onClick={clear}>Quitar</Button>
        </div>
      )}
    </form>
  );
}
