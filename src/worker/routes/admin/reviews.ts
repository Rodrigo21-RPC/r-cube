import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, count, desc, eq, ilike, type SQL } from "drizzle-orm";
import { schema } from "@db/client";
import type { AdminReview, Page } from "@shared/admin-types";
import { normalizeSearch } from "@shared/search";
import { AppError, validationHook, type AppEnv } from "../../middleware";
import { audit } from "../../services/audit";

const { review, product, user } = schema;
const PAGE = 20;

const listQuery = z.object({
  status: z.enum(["visible", "hidden"]).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

/** Moderación de reseñas desde el panel (HU-47): ocultar o mostrar, con auditoría en la misma transacción. */
export const reviewAdminRoutes = new Hono<AppEnv>()
  .get("/reviews", zValidator("query", listQuery, validationHook), async (c) => {
    const db = c.get("db");
    const f = c.req.valid("query");
    const where: SQL[] = [];
    if (f.status) where.push(eq(review.hidden, f.status === "hidden"));
    if (f.q) where.push(ilike(product.searchText, `%${normalizeSearch(f.q).replace(/[%_\\]/g, "\\$&")}%`));
    const cond = where.length ? and(...where) : undefined;
    const [{ total } = { total: 0 }] = await db
      .select({ total: count() })
      .from(review)
      .innerJoin(product, eq(product.id, review.productId))
      .where(cond);
    const rows = await db
      .select({ r: review, productName: product.name, authorName: user.name, authorEmail: user.email })
      .from(review)
      .innerJoin(product, eq(product.id, review.productId))
      .innerJoin(user, eq(user.id, review.userId))
      .where(cond)
      .orderBy(desc(review.createdAt), desc(review.id))
      .limit(PAGE)
      .offset((f.page - 1) * PAGE);
    const body: Page<AdminReview> = {
      items: rows.map(({ r, productName, authorName, authorEmail }) => ({
        id: r.id, productId: r.productId, productName, authorName, authorEmail, rating: r.rating, comment: r.comment, hidden: r.hidden,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page: f.page,
      pageSize: PAGE,
    };
    return c.json(body);
  })
  .post("/reviews/:id/hide", (c) => setHidden(c, true))
  .post("/reviews/:id/show", (c) => setHidden(c, false));

async function setHidden(c: { get: (k: "db" | "user") => unknown; req: { param: (k: string) => string }; json: (b: unknown) => Response }, hidden: boolean) {
  const db = c.get("db") as AppEnv["Variables"]["db"];
  const adminId = (c.get("user") as { id: string }).id;
  const id = c.req.param("id");
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ hidden: review.hidden, productName: product.name, authorName: user.name })
      .from(review)
      .innerJoin(product, eq(product.id, review.productId))
      .innerJoin(user, eq(user.id, review.userId))
      .where(eq(review.id, id));
    if (!row) throw new AppError(404, "NOT_FOUND", "La reseña no existe.");
    if (row.hidden === hidden) return; // ya está así: sin cambios ni auditoría
    await tx.update(review).set({ hidden }).where(eq(review.id, id));
    await audit(tx, adminId, {
      action: hidden ? "resena_oculta" : "resena_visible", entityType: "reseña", entityId: id, entityLabel: row.productName,
      detail: `Reseña de ${row.authorName} sobre ${row.productName} ${hidden ? "ocultada" : "mostrada"}`,
      before: { hidden: row.hidden }, after: { hidden },
    });
  });
  return c.json({ id, hidden });
}
