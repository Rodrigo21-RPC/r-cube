import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import type { CustomerDetail, CustomerRow, Page } from "@shared/admin-types";
import { AppError, validationHook, type AppEnv } from "../../middleware";
import { audit } from "../../services/audit";
import { SOLD } from "./summary";

const { user, orders, session } = schema;
const PAGE = 20;

const ordersCount = sql<number>`(select count(*)::int from orders o where o.user_id = "user"."id")`;
const spent = sql<number>`(select coalesce(sum(o.total_cents),0)::int from orders o where o.user_id = "user"."id" and o.status in ${SOLD})`;

const rowColumns = {
  id: user.id, name: user.name, email: user.email, createdAt: user.createdAt, orders: ordersCount, spentCents: spent, blocked: user.blocked,
};
const toRow = (r: { createdAt: Date } & Omit<CustomerRow, "createdAt">): CustomerRow => ({ ...r, createdAt: r.createdAt.toISOString() });

async function loadCustomer(db: Db, id: string): Promise<CustomerDetail> {
  const [c] = await db
    .select({ ...rowColumns, phone: user.phone, line: user.addressLine, district: user.district, reference: user.addressReference, role: user.role })
    .from(user)
    .where(eq(user.id, id));
  if (!c || c.role !== "cliente") throw new AppError(404, "NOT_FOUND", "El cliente no existe.");
  const list = await db
    .select({ number: orders.number, createdAt: orders.createdAt, totalCents: orders.totalCents, status: orders.status })
    .from(orders)
    .where(eq(orders.userId, id))
    .orderBy(desc(orders.createdAt));
  return {
    ...toRow(c),
    phone: c.phone ?? "",
    address: { line: c.line ?? "", district: c.district ?? "", reference: c.reference ?? "" },
    orderList: list.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
  };
}

/** Bloquea o reactiva; bloquear borra sus sesiones en la misma transacción (HU-40, RN-08). */
async function setBlocked(c: { get: (k: "db" | "user") => unknown; req: { param: (k: string) => string } }, blocked: boolean) {
  const db = c.get("db") as Db;
  const adminId = (c.get("user") as { id: string }).id;
  const id = c.req.param("id");
  await db.transaction(async (tx) => {
    const [target] = await tx.select({ name: user.name, role: user.role }).from(user).where(eq(user.id, id));
    if (!target) throw new AppError(404, "NOT_FOUND", "El cliente no existe.");
    if (target.role !== "cliente") throw new AppError(403, "FORBIDDEN", "No se puede bloquear a un administrador.");
    await tx.update(user).set({ blocked }).where(eq(user.id, id));
    if (blocked) await tx.delete(session).where(eq(session.userId, id));
    await audit(tx, adminId, {
      action: blocked ? "cliente_bloqueado" : "cliente_reactivado", entityType: "cliente", entityId: id, entityLabel: target.name,
      detail: `${target.name} ${blocked ? "bloqueado" : "reactivado"}`,
    });
  });
  return loadCustomer(db, id);
}

/** Clientes del panel (HU-38 a HU-40). */
export const customerRoutes = new Hono<AppEnv>()
  .get("/customers", zValidator("query", z.object({ q: z.string().trim().max(100).optional(), page: z.coerce.number().int().min(1).default(1) }), validationHook), async (c) => {
    const db = c.get("db");
    const { q, page } = c.req.valid("query");
    const w: SQL[] = [eq(user.role, "cliente")];
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
      w.push(or(ilike(user.name, like), ilike(user.email, like))!);
    }
    const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(user).where(and(...w));
    const rows = await db.select(rowColumns).from(user).where(and(...w)).orderBy(desc(user.createdAt)).limit(PAGE).offset((page - 1) * PAGE);
    const body: Page<CustomerRow> = { items: rows.map(toRow), total, page, pageSize: PAGE };
    return c.json(body);
  })
  .get("/customers/:id", async (c) => c.json(await loadCustomer(c.get("db"), c.req.param("id"))))
  .post("/customers/:id/block", async (c) => c.json(await setBlocked(c, true)))
  .post("/customers/:id/unblock", async (c) => c.json(await setBlocked(c, false)));
