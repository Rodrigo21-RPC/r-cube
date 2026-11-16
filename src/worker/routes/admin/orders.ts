import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import { toCsv } from "@shared/csv";
import { canTransition, ORDER_STATUSES, STATUS_LABEL, type DeliveryMethod, type OrderStatus } from "@shared/order-status";
import { PAYMENT_LABEL } from "@shared/types";
import type { AdminOrderDetail, AdminOrderRow, Page } from "@shared/admin-types";
import { AppError, validationHook, type AppEnv } from "../../middleware";
import { audit } from "../../services/audit";
import { notifyOrderStatus } from "../../services/notifications";
import { cancelOrder, loadOrderDetail } from "../../services/orders";
import type { Tx } from "../../services/stock";

const { orders, user, orderEvent } = schema;
const PAGE = 20;
export const CSV_LIMIT = 10_000;

const filters = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  method: z.enum(["card", "yape_plin", "transfer", "whatsapp"]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
});
type Filters = z.infer<typeof filters>;

function whereOf(f: Filters): SQL | undefined {
  const w: SQL[] = [];
  if (f.status) w.push(eq(orders.status, f.status));
  if (f.method) w.push(eq(orders.paymentMethod, f.method));
  // Las fechas del filtro son días calendario de Lima.
  if (f.from) w.push(sql`(${orders.createdAt} at time zone 'America/Lima')::date >= ${f.from}::date`);
  if (f.to) w.push(sql`(${orders.createdAt} at time zone 'America/Lima')::date <= ${f.to}::date`);
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, "\\$&")}%`;
    w.push(or(ilike(orders.number, like), ilike(user.name, like), ilike(user.email, like))!);
  }
  return w.length ? and(...w) : undefined;
}

const rowColumns = {
  number: orders.number, createdAt: orders.createdAt, customerName: user.name, customerEmail: user.email,
  totalCents: orders.totalCents, method: orders.paymentMethod, status: orders.status,
};

/** Transiciones que el panel ofrece: las de REQUISITOS §5, salvo pagar, que va por «Confirmar pago» (FR-019). */
export function allowedFrom(status: OrderStatus, method: DeliveryMethod): OrderStatus[] {
  return ORDER_STATUSES.filter((to) => canTransition(status, to, method) && !(status === "pending_payment" && to === "paid"));
}

export async function loadAdminOrder(db: Db | Tx, number: string): Promise<AdminOrderDetail> {
  const detail = await loadOrderDetail(db as Db, number);
  if (!detail) throw new AppError(404, "NOT_FOUND", "No encontramos ese pedido.");
  const [c] = await db
    .select({ id: user.id, name: user.name, email: user.email, phone: user.phone })
    .from(orders)
    .innerJoin(user, eq(user.id, orders.userId))
    .where(eq(orders.number, number));
  return {
    ...detail,
    customer: { id: c!.id, name: c!.name, email: c!.email, phone: c!.phone ?? "" },
    allowedTransitions: allowedFrom(detail.status, detail.deliveryMethod),
  };
}

const statusBody = z
  .object({ to: z.enum(ORDER_STATUSES), expectedStatus: z.enum(ORDER_STATUSES), reason: z.string().trim().max(200).optional() })
  .refine((b) => b.to !== "cancelled" || (b.reason?.length ?? 0) >= 3, { path: ["reason"], message: "Escribe el motivo de la cancelación." });

const fmtDate = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" });

/** Pedidos del panel (HU-34, HU-35, HU-37). */
export const adminOrderRoutes = new Hono<AppEnv>()
  .get("/orders", zValidator("query", filters, validationHook), async (c) => {
    const db = c.get("db");
    const f = c.req.valid("query");
    const where = whereOf(f);
    const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(orders).innerJoin(user, eq(user.id, orders.userId)).where(where);
    const rows = await db
      .select(rowColumns)
      .from(orders)
      .innerJoin(user, eq(user.id, orders.userId))
      .where(where)
      .orderBy(desc(orders.createdAt), desc(orders.number))
      .limit(PAGE)
      .offset((f.page - 1) * PAGE);
    const body: Page<AdminOrderRow> = {
      items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      total,
      page: f.page,
      pageSize: PAGE,
    };
    return c.json(body);
  })
  .get("/orders/export.csv", zValidator("query", filters, validationHook), async (c) => {
    const db = c.get("db");
    const where = whereOf(c.req.valid("query"));
    const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(orders).innerJoin(user, eq(user.id, orders.userId)).where(where);
    if (total > CSV_LIMIT)
      throw new AppError(422, "TOO_MANY_ROWS", `Hay ${total} pedidos con estos filtros; acota los filtros a ${CSV_LIMIT} o menos.`);
    const rows = await db.select(rowColumns).from(orders).innerJoin(user, eq(user.id, orders.userId)).where(where).orderBy(desc(orders.createdAt));
    const csv = toCsv(
      ["N.º", "Fecha", "Cliente", "Total", "Método", "Estado"],
      rows.map((r) => [r.number, fmtDate.format(r.createdAt), r.customerName, (r.totalCents / 100).toFixed(2), PAYMENT_LABEL[r.method], STATUS_LABEL[r.status]]),
    );
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="pedidos-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  })
  .get("/orders/:number", async (c) => c.json(await loadAdminOrder(c.get("db"), c.req.param("number"))))
  .post("/orders/:number/status", zValidator("json", statusBody, validationHook), async (c) => {
    const db = c.get("db");
    const number = c.req.param("number");
    const { to, expectedStatus, reason } = c.req.valid("json");
    const adminId = c.get("user")!.id;
    const [o] = await db.select({ id: orders.id, status: orders.status, method: orders.deliveryMethod }).from(orders).where(eq(orders.number, number));
    if (!o) throw new AppError(404, "NOT_FOUND", "No encontramos ese pedido.");
    if (o.status !== expectedStatus) throw new AppError(409, "STATE_CHANGED", "El pedido cambió de estado mientras lo revisabas. Actualiza la página.");
    if (!allowedFrom(o.status, o.method).includes(to))
      throw new AppError(409, "INVALID_TRANSITION", `No se puede pasar de ${STATUS_LABEL[o.status]} a ${STATUS_LABEL[to]}.`);

    const auditEntry = (from: OrderStatus) => ({
      action: "pedido_estado" as const, entityType: "pedido", entityId: o.id, entityLabel: number,
      detail: `Pedido ${number}: ${STATUS_LABEL[from]} → ${STATUS_LABEL[to]}${reason ? ` (${reason})` : ""}`,
      before: { status: from }, after: { status: to },
    });

    if (to === "cancelled") {
      const done = await cancelOrder(db, o.id, { type: "administrador", userId: adminId }, reason!, new Set([expectedStatus]), (tx, from) =>
        audit(tx, adminId, auditEntry(from)),
      );
      if (!done) throw new AppError(409, "STATE_CHANGED", "El pedido cambió de estado mientras lo revisabas. Actualiza la página.");
    } else {
      await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(orders)
          .set({ status: to })
          .where(and(eq(orders.id, o.id), eq(orders.status, expectedStatus)))
          .returning({ id: orders.id, userId: orders.userId });
        if (!updated) throw new AppError(409, "STATE_CHANGED", "El pedido cambió de estado mientras lo revisabas. Actualiza la página.");
        await tx.insert(orderEvent).values({
          id: crypto.randomUUID(), orderId: o.id, fromStatus: expectedStatus, toStatus: to, actorType: "administrador", actorUserId: adminId,
        });
        await notifyOrderStatus(tx, { id: updated.id, userId: updated.userId, number }, to);
        await audit(tx, adminId, auditEntry(expectedStatus));
      });
    }
    return c.json(await loadAdminOrder(db, number));
  });
