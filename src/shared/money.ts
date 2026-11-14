/** Montos siempre en céntimos enteros (RN-14). */
export type Cents = number;

export const IGV_RATE = 0.18;

/** Base imponible: total con IGV incluido entre 1,18, redondeado al céntimo (RN-14). */
export function taxableBase(totalCents: Cents): Cents {
  return Math.round(totalCents / (1 + IGV_RATE));
}

/** IGV: diferencia entre el total y la base imponible (RN-14). */
export function igvOf(totalCents: Cents): Cents {
  return totalCents - taxableBase(totalCents);
}

export interface PricedLine {
  unitPriceCents: Cents;
  quantity: number;
}

export interface OrderTotals {
  subtotalCents: Cents;
  shippingCents: Cents;
  discountCents: Cents;
  totalCents: Cents;
  taxableBaseCents: Cents;
  igvCents: Cents;
}

/** Total = suma de líneas + envío − descuento, con desglose de IGV (RN-04). */
export function orderTotals(lines: PricedLine[], shippingCents: Cents, discountCents: Cents): OrderTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);
  return {
    subtotalCents,
    shippingCents,
    discountCents,
    totalCents,
    taxableBaseCents: taxableBase(totalCents),
    igvCents: igvOf(totalCents),
  };
}

const formatter = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

/** Formato «S/ 5,288.00» (RNF-01). */
export function formatPEN(cents: Cents): string {
  return formatter.format(cents / 100).replace(/\s/g, " ");
}
