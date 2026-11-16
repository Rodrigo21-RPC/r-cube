import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import type { Notification, NotificationsSummary } from "@shared/types";
import { AppError, requireCustomer, validationHook, type AppEnv } from "../middleware";

const { notification } = schema;
const SUMMARY_SIZE = 20;
const PAGE = 20;

const toDto = (n: typeof notification.$inferSelect): Notification => ({
  id: n.id, orderNumber: n.orderNumber, message: n.message, read: n.readAt !== null, createdAt: n.createdAt.toISOString(),
});
const newest = (db: Db, userId: string, limit: number, offset = 0) =>
  db.select().from(notification).where(eq(notification.userId, userId)).orderBy(desc(notification.createdAt), desc(notification.id)).limit(limit).offset(offset);

/** Avisos dentro de la app del cliente: contador, lista y lectura (HU-53). Siempre filtrados por su cuenta (RN-08). */
export const notificationRoutes = new Hono<AppEnv>()
  .use(requireCustomer)
  /** Lo que consulta la campana cada minuto: sin leer y los últimos 20. */
  .get("/summary", async (c) => {
    const db = c.get("db");
    const userId = c.get("user")!.id;
    const [{ unread } = { unread: 0 }] = await db
      .select({ unread: count() })
      .from(notification)
      .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
    const body: NotificationsSummary = { unread, latest: (await newest(db, userId, SUMMARY_SIZE)).map(toDto) };
    return c.json(body);
  })
  .get("/", zValidator("query", z.object({ page: z.coerce.number().int().min(1).default(1) }), validationHook), async (c) => {
    const db = c.get("db");
    const userId = c.get("user")!.id;
    const { page } = c.req.valid("query");
    const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(notification).where(eq(notification.userId, userId));
    return c.json({ items: (await newest(db, userId, PAGE, (page - 1) * PAGE)).map(toDto), total, page, pageSize: PAGE });
  })
  .post("/read-all", async (c) => {
    await c
      .get("db")
      .update(notification)
      .set({ readAt: new Date() })
      .where(and(eq(notification.userId, c.get("user")!.id), isNull(notification.readAt)));
    return c.body(null, 204);
  })
  .post("/:id/read", async (c) => {
    const [row] = await c
      .get("db")
      .update(notification)
      .set({ readAt: new Date() })
      .where(and(eq(notification.id, c.req.param("id")), eq(notification.userId, c.get("user")!.id), isNull(notification.readAt)))
      .returning({ id: notification.id });
    if (!row) {
      // Ya leído (idempotente) o ajeno/inexistente (404): se distingue sin revelar avisos de otros.
      const [own] = await c.get("db").select({ id: notification.id }).from(notification).where(and(eq(notification.id, c.req.param("id")), eq(notification.userId, c.get("user")!.id)));
      if (!own) throw new AppError(404, "NOT_FOUND", "No encontramos ese aviso.");
    }
    return c.body(null, 204);
  });
