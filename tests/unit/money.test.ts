import { describe, expect, it } from "vitest";
import { formatPEN, igvOf, orderTotals, taxableBase } from "@shared/money";

describe("RN-14: base imponible e IGV en céntimos", () => {
  it("RN-14: la base es el total entre 1,18 redondeado al céntimo", () => {
    expect(taxableBase(528800)).toBe(448136);
  });

  it("RN-14: el IGV es la diferencia entre total y base", () => {
    expect(igvOf(528800)).toBe(528800 - 448136);
  });

  it("RN-14: base + IGV siempre cuadra con el total", () => {
    for (const total of [0, 1, 99, 118, 100000, 123457, 999999]) {
      expect(taxableBase(total) + igvOf(total)).toBe(total);
    }
  });
});

describe("RN-04: total del pedido", () => {
  it("RN-04: total = suma de líneas + envío − descuento, con desglose", () => {
    const t = orderTotals([{ unitPriceCents: 100000, quantity: 2 }, { unitPriceCents: 4990, quantity: 1 }], 1500, 0);
    expect(t.subtotalCents).toBe(204990);
    expect(t.shippingCents).toBe(1500);
    expect(t.discountCents).toBe(0);
    expect(t.totalCents).toBe(206490);
    expect(t.taxableBaseCents + t.igvCents).toBe(206490);
    expect(t.taxableBaseCents).toBe(taxableBase(206490));
  });

  it("RN-04: el descuento nunca deja el total negativo", () => {
    expect(orderTotals([{ unitPriceCents: 1000, quantity: 1 }], 0, 5000).totalCents).toBe(0);
  });
});

describe("RNF-01: formato en soles", () => {
  it("RNF-01: muestra S/ con dos decimales y separador de miles", () => {
    expect(formatPEN(528800)).toBe("S/ 5,288.00");
    expect(formatPEN(0)).toBe("S/ 0.00");
    expect(formatPEN(4990)).toBe("S/ 49.90");
  });
});
