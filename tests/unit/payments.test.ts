import { describe, expect, it } from "vitest";
import { simulateCard } from "@worker/services/payments";

const now = new Date("2026-11-12T12:00:00Z");
const card = (number: string, expMonth = 12, expYear = 2030, cvv = "123") => ({ number, expMonth, expYear, cvv });

describe("HU-16: simulador de pago con tarjeta", () => {
  it("HU-16: 4111 1111 1111 1111 aprueba y solo expone los últimos 4 dígitos", () => {
    const r = simulateCard(card("4111 1111 1111 1111"), now);
    expect(r).toEqual({ status: "approved", last4: "1111" });
  });

  it("HU-16: 4000 0000 0000 0002 rechaza", () => {
    expect(simulateCard(card("4000000000000002"), now)).toMatchObject({ status: "rejected" });
  });

  it("HU-16: otro número válido no se reconoce en modo de prueba", () => {
    expect(simulateCard(card("5555555555554444"), now)).toMatchObject({ status: "unrecognized" });
  });

  it("HU-16: número inválido, vencimiento pasado o CVV distinto de 3 dígitos son inválidos", () => {
    expect(simulateCard(card("4111111111111112"), now)).toMatchObject({ status: "invalid", field: "cardNumber" });
    expect(simulateCard(card("4111111111111111", 10, 2026), now)).toMatchObject({ status: "invalid", field: "expiry" });
    expect(simulateCard(card("4111111111111111", 13, 2030), now)).toMatchObject({ status: "invalid", field: "expiry" });
    expect(simulateCard(card("4111111111111111", 12, 2030, "12"), now)).toMatchObject({ status: "invalid", field: "cvv" });
  });

  it("HU-16: el mes actual todavía es válido", () => {
    expect(simulateCard(card("4111111111111111", 11, 2026), now)).toMatchObject({ status: "approved" });
  });

  it("RNF-06: el resultado nunca contiene el número completo ni el CVV", () => {
    const text = JSON.stringify(simulateCard(card("4111111111111111", 12, 2030, "987"), now));
    expect(text).not.toContain("4111111111111111");
    expect(text).not.toContain("987");
  });
});
