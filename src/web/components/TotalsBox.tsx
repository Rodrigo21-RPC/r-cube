import { formatPEN } from "@shared/money";
import type { Totals } from "@shared/types";

/** Desglose de montos: subtotal, envío, base imponible, IGV y total (RN-04, RNF-01). */
export function TotalsBox({ totals, showShipping = false }: { totals: Totals; showShipping?: boolean }) {
  const row = (label: string, cents: number, strong = false) => (
    <div className={`flex justify-between gap-4 ${strong ? "text-[17px] font-semibold" : "text-[15px]"}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="tabular">{formatPEN(cents)}</dd>
    </div>
  );
  return (
    <dl className="flex flex-col gap-2">
      {row("Subtotal", totals.subtotalCents)}
      {showShipping && row("Envío", totals.shippingCents ?? 0)}
      {(totals.discountCents ?? 0) > 0 && row("Descuento", -(totals.discountCents ?? 0))}
      <div className="my-1 border-t border-border" />
      {row("Total", totals.totalCents, true)}
      <div className="flex justify-between gap-4 text-sm text-muted">
        <dt>Base imponible</dt>
        <dd className="tabular">{formatPEN(totals.taxableBaseCents)}</dd>
      </div>
      <div className="flex justify-between gap-4 text-sm text-muted">
        <dt>IGV (18 %) incluido</dt>
        <dd className="tabular">{formatPEN(totals.igvCents)}</dd>
      </div>
    </dl>
  );
}
