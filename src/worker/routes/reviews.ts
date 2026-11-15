import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import { REVIEW_COMMENT_MAX, REVIEWS_PAGE_SIZE, abbreviateName } from "@shared/review";
import type { Review, ReviewsPage } from "@shared/types";
import { AppError, requireCustomer, validationHook, type AppEnv } from "../middleware";

const { product, review, user } = schema;

const body = z.object({
  rating: z.number({ error: "Elige una calificación de 1 a 5." }).int("Elige una calificación de 1 a 5.").min(1, "Elige una calificación de 1 a 5.").max(5, "Elige una calificación de 1 a 5."),
  comment: z
    .string()
    .trim()
    .max(REVIEW_COMMENT_MAX, `El comentario admite hasta ${REVIEW_COMMENT_MAX} caracteres.`)
    .optional()
    .transform((s) => (s ? s : null)),
});

const BLOCKED = "Puedes reseñar este producto después de recibirlo.";

async function activeProduct(db: Db, slug: string) {
  const [p] = await db.select({ id: product.id }).from(product).where(and(eq(product.slug, slug), eq(product.active, true)));
  if (!p) throw new AppError(404, "NOT_FOUND", "Este producto no existe o ya no está disponible.");
  return p;
}

/** RN-09: el cliente tiene el producto en al menos un pedido propio Entregado. */
async function receivedProduct(db: Db, userId: string, productId: string) {
  const rows = (await db.execute(sql`select 1 from order_item oi join orders o on o.id = oi.order_id
    where o.user_id = ${userId} and o.status = 'delivered' and oi.product_id = ${productId} limit 1`)) as unknown as unknown[];
  return rows.length > 0;
}

/** Reseñas de productos (HU-46); la moderación vive en el panel (HU-47). */
export const reviewRoutes = new Hono<AppEnv>()
  .get("/products/:slug/reviews", zValidator("query", z.object({ page: z.coerce.number().int().min(1).default(1) }), validationHook), async (c) => {
    const db = c.get("db");
    const me = c.get("user");
    const { page } = c.req.valid("query");
    const p = await activeProduct(db, c.req.param("slug"));
    const visible = and(eq(review.productId, p.id), eq(review.hidden, false));
    const [stats] = await db.select({ total: count(), avg: sql<string | null>`avg(${review.rating})` }).from(review).where(visible);
    const rows = await db
      .select({ r: review, authorName: user.name })
      .from(review)
      .innerJoin(user, eq(user.id, review.userId))
      .where(visible)
      .orderBy(desc(review.createdAt), desc(review.id))
      .limit(REVIEWS_PAGE_SIZE)
      .offset((page - 1) * REVIEWS_PAGE_SIZE);
    const total = stats?.total ?? 0;
    const out: ReviewsPage = {
      average: total > 0 && stats?.avg != null ? Math.round(Number(stats.avg) * 10) / 10 : null,
      count: total,
      total,
      page,
      pageSize: REVIEWS_PAGE_SIZE,
      items: rows.map(({ r, authorName }) => toReview(r, authorName)),
    };
    if (me) {
      const [mine] = await db
        .select({ r: review })
        .from(review)
        .where(and(eq(review.productId, p.id), eq(review.userId, me.id)));
      out.mine = mine ? { ...toReview(mine.r, me.name), hidden: mine.r.hidden } : null;
      if (mine) {
        out.canReview = false;
        out.reviewBlockedReason = "Ya reseñaste este producto.";
      } else if (me.role !== "cliente") {
        out.canReview = false;
        out.reviewBlockedReason = "Solo los clientes pueden reseñar.";
      } else if (await receivedProduct(db, me.id, p.id)) {
        out.canReview = true;
      } else {
        out.canReview = false;
        out.reviewBlockedReason = BLOCKED;
      }
    }
    return c.json(out);
  })
  .post("/products/:slug/reviews", requireCustomer, zValidator("json", body, validationHook), async (c) => {
    const db = c.get("db");
    const me = c.get("user")!;
    const input = c.req.valid("json");
    const p = await activeProduct(db, c.req.param("slug"));
    if (!(await receivedProduct(db, me.id, p.id))) throw new AppError(403, "NOT_DELIVERED", BLOCKED);
    // El índice único (producto, cliente) resuelve dos envíos simultáneos: solo uno inserta (RN-09).
    const [created] = await db
      .insert(review)
      .values({ id: crypto.randomUUID(), productId: p.id, userId: me.id, rating: input.rating, comment: input.comment })
      .onConflictDoNothing()
      .returning();
    if (!created) throw new AppError(409, "ALREADY_REVIEWED", "Ya reseñaste este producto.");
    return c.json(toReview(created, me.name), 201);
  });

function toReview(r: typeof review.$inferSelect, authorName: string): Review {
  return { id: r.id, rating: r.rating, comment: r.comment, authorName: abbreviateName(authorName), createdAt: r.createdAt.toISOString() };
}
