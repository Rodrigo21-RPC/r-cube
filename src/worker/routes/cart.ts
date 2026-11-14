import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, asc, eq, sql } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import { AppError, requireUser, validationHook, type AppEnv } from "../middleware";
import { quoteCart } from "../services/pricing";

const { cartItem, product } = schema;

const itemSchema = z.object({
  productId: z.string().min(1).max(100),
  quantity: z.number().int().min(1, "La cantidad mínima es 1.").max(99),
  seenPriceCents: z.number().int().min(0).nullish(),
});
const itemsSchema = z.object({ items: z.array(itemSchema).max(50) });

/** Carrito de la cuenta: recalcula, ajusta cantidades al stock y registra el precio ya avisado (HU-13). */
async function accountCart(db: Db, userId: string) {
  const rows = await db
    .select({ productId: cartItem.productId, quantity: cartItem.quantity, seenPriceCents: cartItem.seenPriceCents })
    .from(cartItem)
    .where(eq(cartItem.userId, userId))
    .orderBy(asc(cartItem.createdAt), asc(cartItem.id));
  const quote = await quoteCart(db, rows);
  for (const line of quote.lines) {
    const row = rows.find((r) => r.productId === line.productId)!;
    if (line.available && (row.quantity !== line.quantity || row.seenPriceCents !== line.unitPriceCents)) {
      await db
        .update(cartItem)
        .set({ quantity: line.quantity, seenPriceCents: line.unitPriceCents })
        .where(and(eq(cartItem.userId, userId), eq(cartItem.productId, line.productId)));
    }
  }
  return quote;
}

async function upsert(db: Db, userId: string, productId: string, quantity: number, mode: "set" | "add") {
  const [p] = await db.select({ stock: product.stock, active: product.active, price: product.priceCents }).from(product).where(eq(product.id, productId));
  if (!p || !p.active) throw new AppError(404, "NOT_FOUND", "Este producto ya no está disponible.");
  if (p.stock <= 0) throw new AppError(409, "STOCK", "Este producto está agotado.");
  await db
    .insert(cartItem)
    .values({ id: crypto.randomUUID(), userId, productId, quantity: Math.min(quantity, p.stock), seenPriceCents: p.price })
    .onConflictDoUpdate({
      target: [cartItem.userId, cartItem.productId],
      set: {
        quantity:
          mode === "add"
            ? sql`least(${cartItem.quantity} + ${quantity}::int, ${p.stock}::int)`
            : sql`least(${quantity}::int, ${p.stock}::int)`,
      },
    });
}

export const cartRoutes = new Hono<AppEnv>()
  /** Cotización pública del carrito del visitante (HU-11, HU-13). */
  .post("/quote", zValidator("json", itemsSchema, validationHook), async (c) =>
    c.json(await quoteCart(c.get("db"), c.req.valid("json").items)),
  )
  .use(requireUser)
  .get("/", async (c) => c.json(await accountCart(c.get("db"), c.get("user")!.id)))
  .put("/items/:productId", zValidator("json", z.object({ quantity: itemSchema.shape.quantity }), validationHook), async (c) => {
    const db = c.get("db");
    const userId = c.get("user")!.id;
    await upsert(db, userId, c.req.param("productId"), c.req.valid("json").quantity, "set");
    return c.json(await accountCart(db, userId));
  })
  .delete("/items/:productId", async (c) => {
    const db = c.get("db");
    const userId = c.get("user")!.id;
    await db.delete(cartItem).where(and(eq(cartItem.userId, userId), eq(cartItem.productId, c.req.param("productId"))));
    return c.json(await accountCart(db, userId));
  })
  /** Fusión del carrito del navegador al iniciar sesión: suma sin duplicar y respeta el stock (HU-12). */
  .post("/merge", zValidator("json", itemsSchema, validationHook), async (c) => {
    const db = c.get("db");
    const userId = c.get("user")!.id;
    for (const it of c.req.valid("json").items) {
      try {
        await upsert(db, userId, it.productId, it.quantity, "add");
      } catch (e) {
        if (!(e instanceof AppError)) throw e;
      }
    }
    return c.json(await accountCart(db, userId));
  });
