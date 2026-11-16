import { and, eq, sql } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import { COUPON_MESSAGES, couponDiscount, limaToday, type CouponErrorCode } from "@shared/coupon";
import type { CouponApplied } from "@shared/types";
import { AppError } from "../middleware";
import type { Tx } from "./stock";

const { coupon } = schema;
export type CouponRow = typeof coupon.$inferSelect;

/** El código se guarda y se compara en mayúsculas (HU-49). */
export const normalizeCode = (s: string) => s.trim().toUpperCase();

export async function findCoupon(db: Db | Tx, code: string): Promise<CouponRow | undefined> {
  const [row] = await db.select().from(coupon).where(eq(coupon.code, normalizeCode(code)));
  return row;
}

/** Motivo por el que un cupón no se puede usar hoy (hora de Lima), o null si es válido (HU-49). */
export function couponProblem(c: CouponRow | undefined, today = limaToday()): CouponErrorCode | null {
  if (!c) return "COUPON_NOT_FOUND";
  if (!c.active) return "COUPON_INACTIVE";
  if (c.startsOn > today) return "COUPON_NOT_STARTED";
  if (c.endsOn < today) return "COUPON_EXPIRED";
  if (c.usedCount >= c.maxUses) return "COUPON_EXHAUSTED";
  return null;
}

export const couponError = (code: CouponErrorCode) => ({ code, message: COUPON_MESSAGES[code] });
export const couponAppError = (code: CouponErrorCode) => new AppError(409, code, COUPON_MESSAGES[code]);

/** Aplica el cupón a la suma de los productos: devuelve el descuento o el motivo del rechazo (FR-021, FR-022). */
export async function applyCoupon(
  db: Db | Tx,
  code: string,
  subtotalCents: number,
): Promise<{ coupon: CouponApplied | null; error: { code: CouponErrorCode; message: string } | null }> {
  const c = await findCoupon(db, code);
  const problem = couponProblem(c);
  if (problem || !c) return { coupon: null, error: couponError(problem ?? "COUPON_NOT_FOUND") };
  return { coupon: { code: c.code, kind: c.kind, value: c.value, discountCents: couponDiscount(c.kind, c.value, subtotalCents) }, error: null };
}

/**
 * Consume un uso con un UPDATE condicional dentro de la transacción del pedido (FR-023, RN-02): si dos pedidos
 * pelean por el último uso, solo uno obtiene la fila. Devuelve el cupón con su valor vigente o null.
 */
export async function redeemCoupon(tx: Tx, couponId: string): Promise<CouponRow | null> {
  const [row] = await tx
    .update(coupon)
    .set({ usedCount: sql`${coupon.usedCount} + 1` })
    .where(
      and(
        eq(coupon.id, couponId),
        eq(coupon.active, true),
        sql`${coupon.usedCount} < ${coupon.maxUses}`,
        sql`${coupon.startsOn} <= (now() at time zone 'America/Lima')::date`,
        sql`${coupon.endsOn} >= (now() at time zone 'America/Lima')::date`,
      ),
    )
    .returning();
  return row ?? null;
}

/** Al cancelar un pedido, el cupón que usó recupera ese uso (FR-024). */
export async function releaseCoupon(tx: Tx, orderId: string): Promise<void> {
  await tx.execute(sql`update coupon set used_count = greatest(used_count - 1, 0)
    where id = (select coupon_id from orders where id = ${orderId})`);
}
