/** Reglas puras de los cupones, compartidas por el Worker y la web (HU-49, HU-50, RN-04, RN-14). */
import type { Cents } from "./money";

export type CouponKind = "percent" | "fixed";
export type CouponStatus = "active" | "inactive" | "expired" | "exhausted";
export type CouponErrorCode =
  | "COUPON_NOT_FOUND"
  | "COUPON_INACTIVE"
  | "COUPON_NOT_STARTED"
  | "COUPON_EXPIRED"
  | "COUPON_EXHAUSTED";

/** El total de los productos nunca baja de S/ 1.00 por un cupón (FR-022). */
export const MIN_PRODUCTS_TOTAL_CENTS = 100;

export const COUPON_MESSAGES: Record<CouponErrorCode, string> = {
  COUPON_NOT_FOUND: "El cupón no existe",
  COUPON_INACTIVE: "El cupón no está activo",
  COUPON_NOT_STARTED: "El cupón aún no está vigente",
  COUPON_EXPIRED: "El cupón venció",
  COUPON_EXHAUSTED: "El cupón ya no tiene usos",
};

/**
 * Descuento sobre la suma de los productos (con IGV incluido): porcentaje redondeado al céntimo o monto fijo,
 * limitado para que los productos queden en S/ 1.00 como mínimo. El envío no participa (FR-022).
 */
export function couponDiscount(kind: CouponKind, value: number, subtotalCents: Cents): Cents {
  const raw = kind === "percent" ? Math.round((subtotalCents * value) / 100) : value;
  const cap = Math.max(0, subtotalCents - MIN_PRODUCTS_TOTAL_CENTS);
  return Math.max(0, Math.min(raw, cap));
}

/** Estado de un cupón; `today` es el día de Lima en formato `YYYY-MM-DD`. Prioridad: Inactivo, Agotado, Vencido. */
export function couponStatus(c: { active: boolean; usedCount: number; maxUses: number; endsOn: string }, today: string): CouponStatus {
  if (!c.active) return "inactive";
  if (c.usedCount >= c.maxUses) return "exhausted";
  if (c.endsOn < today) return "expired";
  return "active";
}

/** Día calendario de hoy en Lima (UTC−5, sin horario de verano) como `YYYY-MM-DD` (RNF-01). */
export function limaToday(now: Date = new Date()): string {
  return new Date(now.getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
}

export const COUPON_STATUS_LABEL: Record<CouponStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  expired: "Vencido",
  exhausted: "Agotado",
};
