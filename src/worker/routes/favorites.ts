import { Hono } from "hono";
import { desc, eq, sql } from "drizzle-orm";
import { schema } from "@db/client";
import type { FavoriteItem } from "@shared/types";
import { AppError, requireCustomer, type AppEnv } from "../middleware";
import { cardColumns, toCard } from "./catalog";

const { favorite, product, brand, category } = schema;

/** Lista de favoritos del cliente, ligada a su cuenta (HU-45). */
export const favoriteRoutes = new Hono<AppEnv>()
  .use(requireCustomer)
  /** Solo los ids: alimenta el corazón de las tarjetas con una consulta. */
  .get("/ids", async (c) => {
    const rows = await c
      .get("db")
      .select({ id: favorite.productId })
      .from(favorite)
      .where(eq(favorite.userId, c.get("user")!.id))
      .orderBy(desc(favorite.createdAt));
    return c.json({ ids: rows.map((r) => r.id) });
  })
  /** Tarjetas con la disponibilidad de hoy; los inactivos y agotados se incluyen para poder quitarlos. */
  .get("/", async (c) => {
    const rows = await c
      .get("db")
      .select({ ...cardColumns, usable: sql<boolean>`${product.active} and ${brand.active} and ${category.active}` })
      .from(favorite)
      .innerJoin(product, eq(product.id, favorite.productId))
      .innerJoin(brand, eq(brand.id, product.brandId))
      .innerJoin(category, eq(category.id, product.categoryId))
      .where(eq(favorite.userId, c.get("user")!.id))
      .orderBy(desc(favorite.createdAt), desc(product.id));
    const items: FavoriteItem[] = rows.map(({ usable, ...r }) => ({ product: toCard(r), available: usable && r.stock > 0 }));
    return c.json({ items });
  })
  .put("/:productId", async (c) => {
    const db = c.get("db");
    const productId = c.req.param("productId");
    const [p] = await db.select({ id: product.id }).from(product).where(eq(product.id, productId));
    if (!p) throw new AppError(404, "NOT_FOUND", "Este producto no existe.");
    await db.insert(favorite).values({ userId: c.get("user")!.id, productId }).onConflictDoNothing();
    return c.body(null, 204);
  })
  .delete("/:productId", async (c) => {
    await c
      .get("db")
      .delete(favorite)
      .where(sql`${favorite.userId} = ${c.get("user")!.id} and ${favorite.productId} = ${c.req.param("productId")}`);
    return c.body(null, 204);
  });
