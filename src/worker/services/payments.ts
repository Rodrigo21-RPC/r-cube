import { isValidLuhn, onlyDigits } from "@shared/luhn";

/** Tarjetas del modo de prueba (HU-16). Nunca se cobra dinero real. */
export const TEST_CARD_APPROVE = "4111111111111111";
export const TEST_CARD_REJECT = "4000000000000002";

export interface CardInput {
  number: string;
  expMonth: number;
  expYear: number;
  cvv: string;
}

export type CardResult =
  | { status: "approved"; last4: string }
  | { status: "rejected"; message: string }
  | { status: "unrecognized"; message: string }
  | { status: "invalid"; field: "cardNumber" | "expiry" | "cvv"; message: string };

/**
 * Pasarela simulada (HU-16, RNF-06): decide el resultado y solo devuelve los últimos 4 dígitos.
 * El número completo y el CVV no se guardan ni se registran en ningún lugar.
 */
export function simulateCard(card: CardInput, now = new Date()): CardResult {
  const number = onlyDigits(card.number);
  if (!isValidLuhn(number)) return { status: "invalid", field: "cardNumber", message: "El número de tarjeta no es válido." };
  const validMonth = Number.isInteger(card.expMonth) && card.expMonth >= 1 && card.expMonth <= 12;
  const current = now.getUTCFullYear() * 12 + now.getUTCMonth();
  if (!validMonth || card.expYear * 12 + (card.expMonth - 1) < current)
    return { status: "invalid", field: "expiry", message: "La tarjeta está vencida o la fecha no es válida." };
  if (!/^\d{3}$/.test(card.cvv)) return { status: "invalid", field: "cvv", message: "El CVV tiene 3 dígitos." };
  if (number === TEST_CARD_APPROVE) return { status: "approved", last4: number.slice(-4) };
  if (number === TEST_CARD_REJECT)
    return { status: "rejected", message: "El pago fue rechazado. Prueba con otra tarjeta o elige otro método." };
  return {
    status: "unrecognized",
    message: "Tarjeta no reconocida en modo de prueba. Usa 4111 1111 1111 1111 para aprobar.",
  };
}
