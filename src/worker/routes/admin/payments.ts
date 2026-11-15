import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { schema } from "@db/client";
import { formatPEN } from "@shared/money";
import type { PendingPayment } from "@shared/admin-types";
import { AppError, validationHook, type AppEnv } from "../../middleware";
import { audit } from "../../services/audit";
import { cancelOrder } from "../../services/orders";
import { loadAdminOrder } from "./orders";

const { orders, payment, user, orderEvent } = schema;
const DAY_MS = 24 * 3_600_000;
const STATE_CHANGED = () => new AppError(409, "STATE_CHANGED", "Este pedido ya no está pendiente de pago. Actualiza la lista.");

/** Pagos por confirmar: lista, confirmación y rechazo (HU-36, RN-12, RN-13). */
export const paymentRoutes = new Hono<AppEnv>()
  .get("/payments/pending", async (c) => {
    const rows = await c
      .get("db")
      .select({ number: orders.number, customerName: user.name, method: orders.paymentMethod, totalCents: orders.totalCents, operationCode: payment.operationCode, createdAt: orders.createdAt })
      .from(orders)
      .innerJoin(user, eq(user.id, orders.userId))
      .leftJoin(payment, eq(payment.orderId, orders.id))
      .where(eq(orders.status, "pending_payment"))
      .orderBy(asc(orders.createdAt));
    const body: PendingPayment[] = rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      expiresAt: new Date(r.createdAt.getTime() + DAY_MS).toISOString(),
    }));
    return c.json(body);
  })
  .post("/orders/:number/payment/confirm", async (c) => {
    const db = c.get("db");
    const number = c.req.param("number");
    const adminId = c.get("user")!.id;
    await db.transaction(async (tx) => {
      const [o] = await tx
        .update(orders)
        .set({ status: "paid" })
        .where(and(eq(orders.number, number), eq(orders.status, "pending_payment")))
        .returning({ id: orders.id, total: orders.totalCents });
      if (!o) throw STATE_CHANGED();
      await tx.update(payment).set({ status: "confirmed" }).where(eq(payment.orderId, o.id));
      await tx.insert(orderEvent).values({ id: crypto.randomUUID(), orderId: o.id, fromStatus: "pending_payment", toStatus: "paid", actorType: "administrador", actorUserId: adminId });
      await audit(tx, adminId, {
        action: "pago_confirmado", entityType: "pedido", entityId: o.id, entityLabel: number,
        detail: `Pago del pedido ${number} confirmado (${formatPEN(o.total)})`,
      });
    });
    return c.json(await loadAdminOrder(db, number));
  })
  .post(
    "/orders/:number/payment/reject",
    zValidator("json", z.object({ reason: z.string({ error: "Escribe el motivo del rechazo." }).trim().min(3, "Escribe el motivo del rechazo.").max(200) }), validationHook),
    async (c) => {
      const db = c.get("db");
      const number = c.req.param("number");
      const { reason } = c.req.valid("json");
      const adminId = c.get("user")!.id;
      const [o] = await db.select({ id: orders.id }).from(orders).where(eq(orders.number, number));
      if (!o) throw new AppError(404, "NOT_FOUND", "No encontramos ese pedido.");
      const done = await cancelOrder(db, o.id, { type: "administrador", userId: adminId }, reason, new Set(["pending_payment"] as const), async (tx) => {
        await tx.update(payment).set({ status: "rejected" }).where(eq(payment.orderId, o.id));
        await audit(tx, adminId, {
          action: "pago_rechazado", entityType: "pedido", entityId: o.id, entityLabel: number,
          detail: `Pago del pedido ${number} rechazado: ${reason}`,
        });
      });
      if (!done) throw STATE_CHANGED();
      return c.json(await loadAdminOrder(db, number));
    },
  );
