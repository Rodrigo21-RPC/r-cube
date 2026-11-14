import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, count, desc, eq } from "drizzle-orm";
import { schema } from "@db/client";
import type { OrderSummary } from "@shared/types";
import { requireUser, AppError, parseBody, validationHook, type AppEnv } from "../middleware";
import { cancelOrder, loadOrderDetail } from "../services/orders";

const { orders } = schema;
const PAGE = 10;

export const CANCEL_REASONS = {
  no_lo_necesito: "Ya no lo necesito",
  me_equivoque: "Me equivoqué en el pedido",
  otra_opcion: "Encontré otra opción",
  otro: "Otro",
} as const;

const cancelSchema = z
  .object({
    reason: z.enum(Object.keys(CANCEL_REASONS) as [keyof typeof CANCEL_REASONS, ...(keyof typeof CANCEL_REASONS)[]], {
      error: "Elige un motivo.",
    }),
    detail: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.reason !== "otro" || (v.detail?.length ?? 0) >= 3, {
    path: ["detail"],
    message: "Cuéntanos el motivo (mínimo 3 caracteres).",
  });

/** Pedidos del cliente: solo los propios (HU-22 a HU-24, RN-08). */
export const orderRoutes = new Hono<AppEnv>()
  .use(requireUser)
  .get("/", zValidator("query", z.object({ page: z.coerce.number().int().min(1).default(1) }), validationHook), async (c) => {
    const db = c.get("db");
    const userId = c.get("user")!.id;
    const { page } = c.req.valid("query");
    const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(orders).where(eq(orders.userId, userId));
    const items: OrderSummary[] = (
      await db
        .select({ number: orders.number, createdAt: orders.createdAt, totalCents: orders.totalCents, status: orders.status })
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt), desc(orders.number))
        .limit(PAGE)
        .offset((page - 1) * PAGE)
    ).map((o) => ({ ...o, createdAt: o.createdAt.toISOString() }));
    return c.json({ items, total, page, pageSize: PAGE });
  })
  .get("/:number", async (c) => {
    const order = await loadOrderDetail(c.get("db"), c.req.param("number"), c.get("user")!.id);
    if (!order) throw new AppError(404, "NOT_FOUND", "No encontramos ese pedido.");
    return c.json(order);
  })
  .post("/:number/cancel", async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const number = c.req.param("number");
    const [o] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.number, number), eq(orders.userId, user.id)));
    if (!o) throw new AppError(404, "NOT_FOUND", "No encontramos ese pedido.");
    // El dueño se comprueba antes de validar: un pedido ajeno siempre parece inexistente (RN-08).
    const { reason, detail } = parseBody(cancelSchema, await c.req.json().catch(() => ({})));
    const text = reason === "otro" ? `Otro: ${detail}` : CANCEL_REASONS[reason];
    const done = await cancelOrder(db, o.id, { type: "cliente", userId: user.id }, text);
    if (!done) throw new AppError(409, "INVALID_TRANSITION", "Este pedido ya no se puede cancelar porque fue enviado, entregado o cancelado.");
    return c.json((await loadOrderDetail(db, number, user.id))!);
  });
