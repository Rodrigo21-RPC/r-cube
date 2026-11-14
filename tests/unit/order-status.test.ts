import { describe, expect, it } from "vitest";
import { CANCELLABLE_BY_CUSTOMER, canTransition, type OrderStatus } from "@shared/order-status";

const ALL: OrderStatus[] = ["pending_payment", "paid", "preparing", "shipped", "delivered", "cancelled"];

describe("REQUISITOS §5: transiciones válidas del pedido", () => {
  const valid: [OrderStatus, OrderStatus, "delivery" | "pickup"][] = [
    ["pending_payment", "paid", "delivery"],
    ["pending_payment", "cancelled", "delivery"],
    ["paid", "preparing", "delivery"],
    ["paid", "cancelled", "delivery"],
    ["preparing", "shipped", "delivery"],
    ["preparing", "cancelled", "delivery"],
    ["shipped", "delivered", "delivery"],
    ["preparing", "delivered", "pickup"],
  ];

  it.each(valid)("REQUISITOS §5: %s → %s (%s) es válida", (from, to, method) => {
    expect(canTransition(from, to, method)).toBe(true);
  });

  it("RN-11: ningún pedido pasa a Preparando sin estar Pagado", () => {
    expect(canTransition("pending_payment", "preparing", "delivery")).toBe(false);
    expect(canTransition("pending_payment", "preparing", "pickup")).toBe(false);
  });

  it("REQUISITOS §5: Preparando → Entregado solo con recojo en tienda", () => {
    expect(canTransition("preparing", "delivered", "delivery")).toBe(false);
  });

  it("REQUISITOS §5: Enviado no se cancela", () => {
    expect(canTransition("shipped", "cancelled", "delivery")).toBe(false);
  });

  it("REQUISITOS §5: Entregado y Cancelado son finales", () => {
    for (const to of ALL) {
      expect(canTransition("delivered", to, "delivery")).toBe(false);
      expect(canTransition("cancelled", to, "pickup")).toBe(false);
    }
  });

  it("REQUISITOS §5: cualquier otra transición es inválida", () => {
    const validKeys = new Set(valid.map(([f, t, m]) => `${f}>${t}>${m}`));
    for (const from of ALL)
      for (const to of ALL)
        for (const m of ["delivery", "pickup"] as const) {
          const key = `${from}>${to}>${m}`;
          const alsoValid = validKeys.has(`${from}>${to}>delivery`) && !(from === "preparing" && to === "delivered");
          if (!validKeys.has(key) && !alsoValid) expect(canTransition(from, to, m)).toBe(false);
        }
  });

  it("HU-24: el cliente cancela solo en Pendiente de pago, Pagado o Preparando", () => {
    expect([...CANCELLABLE_BY_CUSTOMER].sort()).toEqual(["paid", "pending_payment", "preparing"]);
  });
});
