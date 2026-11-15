import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { count, desc, eq } from "drizzle-orm";
import { schema } from "@db/client";
import { AUDIT_ACTIONS } from "@db/schema";
import type { AuditRow, Page } from "@shared/admin-types";
import { validationHook, type AppEnv } from "../../middleware";

const { auditLog, user } = schema;
const PAGE = 30;
const query = z.object({ action: z.enum(AUDIT_ACTIONS).optional(), page: z.coerce.number().int().min(1).default(1) });

/** Registro de auditoría de solo lectura, del más nuevo al más antiguo (HU-42). */
export const auditRoutes = new Hono<AppEnv>().get("/audit", zValidator("query", query, validationHook), async (c) => {
  const db = c.get("db");
  const { action, page } = c.req.valid("query");
  const where = action ? eq(auditLog.action, action) : undefined;
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(auditLog).where(where);
  const rows = await db
    .select({
      id: auditLog.id, createdAt: auditLog.createdAt, actorName: user.name, action: auditLog.action,
      entityType: auditLog.entityType, entityLabel: auditLog.entityLabel, detail: auditLog.detail,
    })
    .from(auditLog)
    .innerJoin(user, eq(user.id, auditLog.actorUserId))
    .where(where)
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(PAGE)
    .offset((page - 1) * PAGE);
  const body: Page<AuditRow> = { items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })), total, page, pageSize: PAGE };
  return c.json(body);
});
