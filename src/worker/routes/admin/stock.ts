import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { count, desc, eq } from "drizzle-orm";
import { schema } from "@db/client";
import type { Page, StockMovementDto } from "@shared/admin-types";
import { variantLabel } from "@shared/variant";
import { AppError, validationHook, type AppEnv } from "../../middleware";
import { applyStockChange } from "../../services/stock";
import { audit } from "../../services/audit";
import { loadAdminProduct } from "./products";

const { stockMovement, orders, user, product, productVariant } = schema;
const PAGE = 20;

const adjustment = z.object({
  delta: z.number({ error: "Escribe la cantidad." }).int("Usa un número entero.").refine((n) => n !== 0, "La cantidad no puede ser 0.").refine((n) => Math.abs(n) <= 100_000, "Cantidad demasiado grande."),
  reason: z.string().trim().min(3, "Escribe el motivo (mínimo 3 caracteres).").max(200),
  variantId: z.string().min(1).optional(),
});

/** Ajustes de stock e historial (HU-33). */
export const stockRoutes = new Hono<AppEnv>()
  .get("/products/:id/stock-movements", zValidator("query", z.object({ page: z.coerce.number().int().min(1).default(1) }), validationHook), async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    const { page } = c.req.valid("query");
    const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(stockMovement).where(eq(stockMovement.productId, id));
    const rows = await db
      .select({ m: stockMovement, orderNumber: orders.number, actorName: user.name, variant: productVariant })
      .from(stockMovement)
      .leftJoin(productVariant, eq(productVariant.id, stockMovement.variantId))
      .leftJoin(orders, eq(orders.id, stockMovement.orderId))
      .leftJoin(user, eq(user.id, stockMovement.actorUserId))
      .where(eq(stockMovement.productId, id))
      .orderBy(desc(stockMovement.createdAt), desc(stockMovement.id))
      .limit(PAGE)
      .offset((page - 1) * PAGE);
    const body: Page<StockMovementDto> = {
      items: rows.map(({ m, orderNumber, actorName, variant }) => ({
        id: m.id,
        delta: m.delta,
        stockBefore: m.stockBefore,
        stockAfter: m.stockAfter,
        source: m.source,
        variantLabel: variant ? variantLabel(variant) : null,
        orderNumber,
        reason: m.reason,
        actor: m.actorType === "sistema" ? "Sistema" : (actorName ?? "Usuario"),
        createdAt: m.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize: PAGE,
    };
    return c.json(body);
  })
  .post("/products/:id/stock-adjustments", zValidator("json", adjustment, validationHook), async (c) => {
    const id = c.req.param("id");
    const { delta, reason, variantId } = c.req.valid("json");
    const adminId = c.get("user")!.id;
    await c.get("db").transaction(async (tx) => {
      const [p] = await tx.select({ name: product.name, hasVariants: product.hasVariants }).from(product).where(eq(product.id, id));
      if (!p) throw new AppError(404, "NOT_FOUND", "El producto no existe.");
      // Un producto con variantes solo ajusta el stock de una variante (HU-43, invariante 2).
      if (p.hasVariants && !variantId)
        throw new AppError(400, "VARIANT_REQUIRED", "Elige la variante cuyo stock vas a ajustar.", { variantId: "Elige la variante." });
      let what = p.name;
      if (variantId) {
        const [v] = await tx.select().from(productVariant).where(eq(productVariant.id, variantId));
        if (!v || v.productId !== id) throw new AppError(404, "NOT_FOUND", "La variante no existe.");
        what = `${p.name} (${variantLabel(v)})`;
      }
      const { before, after } = await applyStockChange(tx, { productId: id, variantId, delta, source: "ajuste", reason, actor: { type: "administrador", userId: adminId } });
      await audit(tx, adminId, {
        action: "stock_ajustado", entityType: "producto", entityId: id, entityLabel: what,
        detail: `Stock de ${what}: ${before} → ${after} (${delta > 0 ? "+" : ""}${delta}, ${reason})`,
        before: { stock: before }, after: { stock: after },
      });
    });
    return c.json(await loadAdminProduct(c.get("db"), id), 201);
  });
