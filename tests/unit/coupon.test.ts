import { describe, expect, it } from "vitest";
import { COUPON_MESSAGES, MIN_PRODUCTS_TOTAL_CENTS, couponDiscount, couponStatus, limaToday } from "@shared/coupon";

describe("HU-49, RN-04: descuento de un cupón", () => {
  it("HU-49: el porcentaje se redondea al céntimo", () => {
    expect(couponDiscount("percent", 10, 299900)).toBe(29990);
    expect(couponDiscount("percent", 15, 33333)).toBe(5000); // 4999.95 → 5000
    expect(couponDiscount("percent", 10, 12345)).toBe(1235); // 1234.5 → 1235
  });

  it("HU-49: el monto fijo descuenta ese valor", () => {
    expect(couponDiscount("fixed", 500, 100000)).toBe(500);
    expect(couponDiscount("fixed", 2500, 299900)).toBe(2500);
  });

  it("FR-022: nunca deja el total de los productos por debajo de S/ 1.00", () => {
    expect(MIN_PRODUCTS_TOTAL_CENTS).toBe(100);
    expect(couponDiscount("fixed", 5000, 1000)).toBe(900); // quedan S/ 1.00
    expect(couponDiscount("percent", 90, 500)).toBe(400); // 450 se limita a 400
    expect(couponDiscount("fixed", 100, 100)).toBe(0); // ya está en el mínimo
    expect(couponDiscount("percent", 50, 50)).toBe(0); // menos que el mínimo
    expect(couponDiscount("percent", 10, 0)).toBe(0);
  });

  it("FR-022: nunca es negativo ni mayor que el subtotal", () => {
    for (const [kind, value] of [["percent", 90], ["percent", 1], ["fixed", 100], ["fixed", 99999999]] as const) {
      for (const subtotal of [0, 1, 99, 100, 101, 999, 100000]) {
        const d = couponDiscount(kind, value, subtotal);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(subtotal);
      }
    }
  });

  it("FR-022: el envío no participa (la función no lo recibe)", () => {
    expect(couponDiscount.length).toBe(3);
  });
});

describe("HU-50: estado de un cupón", () => {
  const base = { active: true, usedCount: 0, maxUses: 5, endsOn: "2026-12-31" };
  it("HU-50: Inactivo tiene prioridad, luego Agotado, luego Vencido y si no, Activo", () => {
    expect(couponStatus({ ...base, active: false, usedCount: 5, endsOn: "2020-01-01" }, "2026-11-15")).toBe("inactive");
    expect(couponStatus({ ...base, usedCount: 5, endsOn: "2020-01-01" }, "2026-11-15")).toBe("exhausted");
    expect(couponStatus({ ...base, endsOn: "2026-11-14" }, "2026-11-15")).toBe("expired");
    expect(couponStatus(base, "2026-11-15")).toBe("active");
  });

  it("HU-49: un cupón que vence el día D vale durante todo ese día", () => {
    expect(couponStatus({ ...base, endsOn: "2026-11-15" }, "2026-11-15")).toBe("active");
    expect(couponStatus({ ...base, endsOn: "2026-11-15" }, "2026-11-16")).toBe("expired");
  });
});

describe("RNF-01: hoy en hora de Lima", () => {
  it("la fecha de hoy es la de Lima (UTC−5), no la de UTC", () => {
    expect(limaToday(new Date("2026-11-16T03:00:00Z"))).toBe("2026-11-15"); // 22:00 del 15 en Lima
    expect(limaToday(new Date("2026-11-16T05:00:00Z"))).toBe("2026-11-16"); // 00:00 del 16 en Lima
  });
});

describe("HU-49: mensajes de error del cupón", () => {
  it("cada código tiene su mensaje exacto", () => {
    expect(COUPON_MESSAGES).toEqual({
      COUPON_NOT_FOUND: "El cupón no existe",
      COUPON_INACTIVE: "El cupón no está activo",
      COUPON_NOT_STARTED: "El cupón aún no está vigente",
      COUPON_EXPIRED: "El cupón venció",
      COUPON_EXHAUSTED: "El cupón ya no tiene usos",
    });
  });
});
