import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import { AppError, requireUser, validationHook, type AppEnv } from "../middleware";
import { quoteCart } from "../services/pricing";

const { cartItem, product, productVariant } = schema;

const variantId = z.string().min(1).max(100).nullish();
const itemSchema = z.object({
  productId: z.string().min(1).max(100),
  variantId,
  quantity: z.number().int().min(1, "La cantidad mínima es 1.").max(99),
  seenPriceCents: z.number().int().min(0).nullish(),
});
const itemsSchema = z.object({ items: z.array(itemSchema).max(50) });

/** Carrito de la cuenta: recalcula, ajusta cantidades al stock y registra el precio ya avisado (HU-13, HU-44). */
async function accountCart(db: Db, userId: string) {
  const rows = await db
    .select({ productId: cartItem.productId, variantId: cartItem.variantId, quantity: cartItem.quantity, seenPriceCents: cartItem.seenPriceCents })
    .from(cartItem)
    .where(eq(cartItem.userId, userId))
    .orderBy(asc(cartItem.createdAt), asc(cartItem.id));
  const quote = await quoteCart(db, rows);
  for (const line of quote.lines) {
    const row = rows.find((r) => r.productId === line.productId && (r.variantId ?? null) === line.variantId)!;
    if (line.available && (row.quantity !== line.quantity || row.seenPriceCents !== line.unitPriceCents)) {
      await db
        .update(cartItem)
        .set({ quantity: line.quantity, seenPriceCents: line.unitPriceCents })
        .where(and(eq(cartItem.userId, userId), eq(cartItem.productId, line.productId), lineVariant(line.variantId)));
    }
  }
  return quote;
}

const lineVariant = (id: string | null | undefined) => (id ? eq(cartItem.variantId, id) : isNull(cartItem.variantId));

async function upsert(db: Db, userId: string, productId: string, variant: string | null | undefined, quantity: number, mode: "set" | "add") {
  const [p] = await db
    .select({ stock: product.stock, active: product.active, price: product.priceCents, hasVariants: product.hasVariants })
    .from(product)
    .where(eq(product.id, productId));
  if (!p || !p.active) throw new AppError(404, "NOT_FOUND", "Este producto ya no está disponible.");
  let stock = p.stock;
  let price = p.price;
  if (variant) {
    const [v] = await db
      .select({ stock: productVariant.stock, price: productVariant.priceCents })
      .from(productVariant)
      .where(and(eq(productVariant.id, variant), eq(productVariant.productId, productId), eq(productVariant.active, true)));
    if (!v) throw new AppError(404, "NOT_FOUND", "Esta variante ya no está disponible.");
    stock = v.stock;
    price = v.price;
  } else if (p.hasVariants) {
    throw new AppError(400, "VARIANT_REQUIRED", "Elige color, almacenamiento o RAM.", { variantId: "Elige color, almacenamiento o RAM." });
  }
  if (stock <= 0) throw new AppError(409, "STOCK", variant ? "Esta variante está agotada." : "Este producto está agotado.");
  // El índice único es (user_id, product_id, coalesce(variant_id, '')): el conflicto se declara con SQL (research R2).
  await db.execute(sql`
    insert into cart_item (id, user_id, product_id, variant_id, quantity, seen_price_cents)
    values (${crypto.randomUUID()}, ${userId}, ${productId}, ${variant ?? null}::text, ${Math.min(quantity, stock)}::int, ${price}::int)
    on conflict (user_id, product_id, (coalesce(variant_id, ''))) do update
    set quantity = ${
      mode === "add"
        ? sql`least(cart_item.quantity + ${quantity}::int, ${stock}::int)`
        : sql`least(${quantity}::int, ${stock}::int)`
    }`);
}

export const cartRoutes = new Hono<AppEnv>()
  /** Cotización pública del carrito del visitante (HU-11, HU-13). */
  .post("/quote", zValidator("json", itemsSchema, validationHook), async (c) =>
    c.json(await quoteCart(c.get("db"), c.req.valid("json").items)),
  )
  .use(requireUser)
  .get("/", async (c) => c.json(await accountCart(c.get("db"), c.get("user")!.id)))
  .put("/items/:productId", zValidator("json", z.object({ quantity: itemSchema.shape.quantity, variantId }), validationHook), async (c) => {
    const db = c.get("db");
    const userId = c.get("user")!.id;
    const { quantity, variantId: variant } = c.req.valid("json");
    await upsert(db, userId, c.req.param("productId"), variant, quantity, "set");
    return c.json(await accountCart(db, userId));
  })
  .delete("/items/:productId", async (c) => {
    const db = c.get("db");
    const userId = c.get("user")!.id;
    await db.delete(cartItem).where(and(eq(cartItem.userId, userId), eq(cartItem.productId, c.req.param("productId")), lineVariant(c.req.query("variantId"))));
    return c.json(await accountCart(db, userId));
  })
  /** Fusión del carrito del navegador al iniciar sesión: suma sin duplicar y respeta el stock (HU-12). */
  .post("/merge", zValidator("json", itemsSchema, validationHook), async (c) => {
    const db = c.get("db");
    const userId = c.get("user")!.id;
    for (const it of c.req.valid("json").items) {
      try {
        await upsert(db, userId, it.productId, it.variantId, it.quantity, "add");
      } catch (e) {
        if (!(e instanceof AppError)) throw e;
      }
    }
    return c.json(await accountCart(db, userId));
  });
