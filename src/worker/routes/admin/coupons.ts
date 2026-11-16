import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { count, desc, eq, sql } from "drizzle-orm";
import { schema } from "@db/client";
import type { AdminCoupon, Page } from "@shared/admin-types";
import { couponStatus, limaToday } from "@shared/coupon";
import { formatPEN } from "@shared/money";
import { AppError, parseBody, validationHook, type AppEnv } from "../../middleware";
import { audit } from "../../services/audit";
import { uniqueViolation } from "../../services/db-errors";
import type { Tx } from "../../services/stock";

const { coupon } = schema;
const PAGE = 20;

const isDay = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; // «2026-13-40» no es una fecha
};
const day = (label: string) => z.string({ error: `Elige la fecha de ${label}.` }).refine(isDay, `Elige una fecha de ${label} válida.`);

const base = z.object({
  code: z
    .string({ error: "Escribe el código." })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,20}$/, "El código tiene de 3 a 20 letras, números o guiones."),
  kind: z.enum(["percent", "fixed"], { error: "Elige el tipo de descuento." }),
  value: z.number({ error: "Escribe el valor del descuento." }).int("Usa un número entero."),
  startsOn: day("inicio"),
  endsOn: day("fin"),
  maxUses: z.number({ error: "Escribe los usos máximos." }).int("Usa un número entero.").min(1, "Los usos máximos son 1 o más.").max(1_000_000),
  active: z.boolean().optional(),
});

/** Reglas entre campos: valor según el tipo y orden de las fechas (FR-020). */
const full = base.superRefine((b, ctx) => {
  if (b.kind === "percent" && (b.value < 1 || b.value > 90))
    ctx.addIssue({ code: "custom", path: ["value"], message: "El porcentaje va de 1 a 90." });
  if (b.kind === "fixed" && b.value < 100)
    ctx.addIssue({ code: "custom", path: ["value"], message: "El monto mínimo es S/ 1.00." });
  if (isDay(b.startsOn) && isDay(b.endsOn) && b.endsOn < b.startsOn)
    ctx.addIssue({ code: "custom", path: ["endsOn"], message: "La fecha de fin no puede ser anterior a la de inicio." });
});

const dup = () => new AppError(409, "DUPLICATE_CODE", "Ese código ya existe", { code: "Ese código ya existe" });
const used = () => new AppError(409, "COUPON_USED", "Este cupón ya se usó: desactívalo en lugar de cambiarle el código o borrarlo.");

export function toAdminCoupon(c: typeof coupon.$inferSelect): AdminCoupon {
  return {
    id: c.id, code: c.code, kind: c.kind, value: c.value, startsOn: c.startsOn, endsOn: c.endsOn, maxUses: c.maxUses, usedCount: c.usedCount,
    active: c.active, status: couponStatus(c, limaToday()),
  };
}

const describe = (c: { kind: string; value: number; maxUses: number; startsOn: string; endsOn: string }) =>
  `${c.kind === "percent" ? `${c.value} %` : formatPEN(c.value)} de descuento, ${c.maxUses} usos, del ${c.startsOn} al ${c.endsOn}`;

/** Un cupón con usos, o ligado a un pedido (aunque se haya cancelado), conserva su código y no se borra. */
async function hasHistory(tx: Tx, c: typeof coupon.$inferSelect) {
  if (c.usedCount > 0) return true;
  const rows = (await tx.execute(sql`select 1 from orders where coupon_id = ${c.id} limit 1`)) as unknown as unknown[];
  return rows.length > 0;
}

const FIELDS = ["code", "kind", "value", "startsOn", "endsOn", "maxUses", "active"] as const;

/** Administración de cupones (HU-50): alta, edición, activación y baja, siempre con auditoría. */
export const couponAdminRoutes = new Hono<AppEnv>()
  .get("/coupons", zValidator("query", z.object({ page: z.coerce.number().int().min(1).default(1) }), validationHook), async (c) => {
    const db = c.get("db");
    const { page } = c.req.valid("query");
    const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(coupon);
    const rows = await db.select().from(coupon).orderBy(desc(coupon.createdAt), desc(coupon.id)).limit(PAGE).offset((page - 1) * PAGE);
    const body: Page<AdminCoupon> = { items: rows.map(toAdminCoupon), total, page, pageSize: PAGE };
    return c.json(body);
  })
  .post("/coupons", async (c) => {
    const b = parseBody(full, await c.req.json().catch(() => ({})));
    const adminId = c.get("user")!.id;
    const id = crypto.randomUUID();
    const row = await c
      .get("db")
      .transaction(async (tx) => {
        const [exists] = await tx.select({ id: coupon.id }).from(coupon).where(eq(coupon.code, b.code));
        if (exists) throw dup();
        const [created] = await tx.insert(coupon).values({ id, ...b, active: b.active ?? true }).returning();
        await audit(tx, adminId, {
          action: "cupon", entityType: "cupón", entityId: id, entityLabel: b.code, detail: `Cupón ${b.code} creado: ${describe(b)}`,
          after: { code: b.code, kind: b.kind, value: b.value, startsOn: b.startsOn, endsOn: b.endsOn, maxUses: b.maxUses, active: b.active ?? true },
        });
        return created!;
      })
      .catch((e) => {
        throw uniqueViolation(e) !== null ? dup() : e;
      });
    return c.json(toAdminCoupon(row), 201);
  })
  .patch("/coupons/:id", async (c) => {
    const id = c.req.param("id");
    const adminId = c.get("user")!.id;
    const patch = parseBody(base.partial(), await c.req.json().catch(() => ({})));
    const row = await c
      .get("db")
      .transaction(async (tx) => {
        const [cur] = (await tx.select().from(coupon).where(eq(coupon.id, id)).for("update"));
        if (!cur) throw new AppError(404, "NOT_FOUND", "El cupón no existe.");
        const merged = parseBody(full, { ...toInput(cur), ...patch });
        if (merged.code !== cur.code) {
          if (await hasHistory(tx, cur)) throw used();
          const [other] = await tx.select({ id: coupon.id }).from(coupon).where(eq(coupon.code, merged.code));
          if (other) throw dup();
        }
        if (merged.maxUses < cur.usedCount)
          throw new AppError(400, "VALIDATION", "Revisa los datos ingresados.", { maxUses: `El cupón ya lleva ${cur.usedCount} usos` });
        const next = { ...merged, active: merged.active ?? cur.active };
        const changed = FIELDS.filter((k) => next[k] !== cur[k]);
        if (!changed.length) return cur;
        const [updated] = await tx.update(coupon).set(next).where(eq(coupon.id, id)).returning();
        await audit(tx, adminId, {
          action: "cupon", entityType: "cupón", entityId: id, entityLabel: next.code,
          detail: `Cupón ${next.code}: ${changed.map((k) => (k === "active" ? (next.active ? "activado" : "desactivado") : k)).join(", ")} (${describe(next)})`,
          before: Object.fromEntries(changed.map((k) => [k, cur[k]])),
          after: Object.fromEntries(changed.map((k) => [k, next[k]])),
        });
        return updated!;
      })
      .catch((e) => {
        throw uniqueViolation(e) !== null ? dup() : e;
      });
    return c.json(toAdminCoupon(row));
  })
  .delete("/coupons/:id", async (c) => {
    const id = c.req.param("id");
    const adminId = c.get("user")!.id;
    await c.get("db").transaction(async (tx) => {
      const [cur] = await tx.select().from(coupon).where(eq(coupon.id, id)).for("update");
      if (!cur) throw new AppError(404, "NOT_FOUND", "El cupón no existe.");
      if (await hasHistory(tx, cur)) throw used();
      await tx.delete(coupon).where(eq(coupon.id, id));
      await audit(tx, adminId, {
        action: "cupon", entityType: "cupón", entityId: id, entityLabel: cur.code, detail: `Cupón ${cur.code} borrado`,
        before: { code: cur.code, kind: cur.kind, value: cur.value },
      });
    });
    return c.body(null, 204);
  });

const toInput = (c: typeof coupon.$inferSelect) => ({
  code: c.code, kind: c.kind, value: c.value, startsOn: c.startsOn, endsOn: c.endsOn, maxUses: c.maxUses, active: c.active,
});
