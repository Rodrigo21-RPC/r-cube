import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import { formatPEN } from "@shared/money";
import type { AdminVariant } from "@shared/admin-types";
import { variantLabel } from "@shared/variant";
import { AppError, validationHook, type AppEnv } from "../../middleware";
import { audit } from "../../services/audit";
import { applyStockChange, recordMovement, type Tx } from "../../services/stock";
import { lockProduct, syncProductFromVariants } from "../../services/variants";

const { product, productImage, productVariant, orderItem } = schema;

/** Máximo de variantes por producto (data-model.md). */
export const MAX_VARIANTS = 20;

const attr = (label: string) => z.string().trim().max(40, `${label}: máximo 40 caracteres.`).default("");
const shape = {
  sku: z
    .string({ error: "Escribe el SKU." })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,40}$/, "El SKU tiene de 3 a 40 letras, números, guiones o guion bajo."),
  storage: attr("Almacenamiento"),
  color: attr("Color"),
  ram: attr("RAM"),
  priceCents: z.number({ error: "Escribe el precio." }).int("Usa céntimos enteros.").positive("El precio debe ser mayor que 0.").max(100_000_000),
  imageId: z.string().nullable().default(null),
  active: z.boolean().default(true),
};
const needsAttribute = (b: { storage: string; color: string; ram: string }) => Boolean(b.storage || b.color || b.ram);
const attrMessage = { path: ["storage"], message: "Escribe al menos almacenamiento, color o RAM." };

const createBody = z
  .object({ ...shape, stock: z.number({ error: "Escribe el stock." }).int("Usa un número entero.").min(0, "El stock no puede ser negativo.").max(100_000) })
  .refine(needsAttribute, attrMessage);
const editBody = z.object(shape).refine(needsAttribute, attrMessage);

/** Variantes de un producto vistas por el administrador, activas o no (HU-43). */
export async function loadVariants(db: Db | Tx, productId: string): Promise<AdminVariant[]> {
  const rows = await db
    .select({
      v: productVariant,
      imageUrl: productImage.url,
      sold: sql<boolean>`exists(select 1 from order_item oi where oi.variant_id = ${productVariant.id})`,
    })
    .from(productVariant)
    .leftJoin(productImage, eq(productImage.id, productVariant.imageId))
    .where(eq(productVariant.productId, productId))
    .orderBy(asc(productVariant.priceCents), asc(productVariant.sku));
  return rows.map(({ v, imageUrl, sold }) => toDto(v, imageUrl, sold));
}

function toDto(v: typeof productVariant.$inferSelect, imageUrl: string | null, sold: boolean): AdminVariant {
  return {
    id: v.id, sku: v.sku, color: v.color, storage: v.storage, ram: v.ram, label: variantLabel(v), priceCents: v.priceCents,
    stock: v.stock, imageId: v.imageId, imageUrl, active: v.active, sold,
  };
}

/** Código y restricción de una violación de índice único, venga o no envuelta por Drizzle. */
function uniqueViolation(e: unknown): string | null {
  const err = e as { code?: string; constraint_name?: string; constraint?: string; cause?: unknown };
  const src = err?.code === "23505" ? err : (err?.cause as typeof err | undefined);
  return src?.code === "23505" ? (src.constraint_name ?? src.constraint ?? "") : null;
}

const duplicates = (constraint: string | null): AppError | null =>
  constraint === null
    ? null
    : constraint.includes("sku")
      ? new AppError(409, "DUPLICATE_SKU", "Ese SKU ya existe", { sku: "Ese SKU ya existe" })
      : new AppError(409, "DUPLICATE_COMBINATION", "Ya existe una variante con esos atributos.", { storage: "Ya existe una variante con esos atributos." });

/** Comprobaciones comunes de alta y edición; `selfId` excluye la propia variante. */
async function checkUnique(
  tx: Tx,
  productId: string,
  b: { sku: string; storage: string; color: string; ram: string; imageId: string | null },
  selfId?: string,
) {
  const notSelf = selfId ? ne(productVariant.id, selfId) : undefined;
  const [sku] = await tx.select({ id: productVariant.id }).from(productVariant).where(and(eq(productVariant.sku, b.sku), notSelf));
  if (sku) throw duplicates("product_variant_sku_uq")!;
  const [combo] = await tx
    .select({ id: productVariant.id })
    .from(productVariant)
    .where(and(eq(productVariant.productId, productId), eq(productVariant.storage, b.storage), eq(productVariant.color, b.color), eq(productVariant.ram, b.ram), notSelf));
  if (combo) throw duplicates("product_variant_combo_uq")!;
  if (b.imageId) {
    const [img] = await tx.select({ id: productImage.id }).from(productImage).where(and(eq(productImage.id, b.imageId), eq(productImage.productId, productId)));
    if (!img) throw new AppError(400, "VALIDATION", "Revisa los datos ingresados.", { imageId: "Elige una foto de este producto." });
  }
}

const CHANGED_LABEL: Record<string, string> = { sku: "SKU", storage: "almacenamiento", color: "color", ram: "RAM", priceCents: "precio", imageId: "foto", active: "estado" };

/** Variantes de un producto (HU-43). */
export const variantRoutes = new Hono<AppEnv>()
  .get("/products/:id/variants", async (c) => {
    const db = c.get("db");
    const [p] = await db.select({ id: product.id }).from(product).where(eq(product.id, c.req.param("id")));
    if (!p) throw new AppError(404, "NOT_FOUND", "El producto no existe.");
    return c.json(await loadVariants(db, p.id));
  })
  .post("/products/:id/variants", zValidator("json", createBody, validationHook), async (c) => {
    const id = c.req.param("id");
    const b = c.req.valid("json");
    const adminId = c.get("user")!.id;
    const actor = { type: "administrador", userId: adminId } as const;
    const created = await c
      .get("db")
      .transaction(async (tx) => {
        await lockProduct(tx, id);
        const [p] = await tx.select({ name: product.name, stock: product.stock, hasVariants: product.hasVariants }).from(product).where(eq(product.id, id));
        if (!p) throw new AppError(404, "NOT_FOUND", "El producto no existe.");
        const [{ n } = { n: 0 }] = await tx.select({ n: count() }).from(productVariant).where(eq(productVariant.productId, id));
        if (n >= MAX_VARIANTS) throw new AppError(409, "TOO_MANY_VARIANTS", `Un producto admite hasta ${MAX_VARIANTS} variantes.`);
        await checkUnique(tx, id, b);
        // El stock propio del producto pasa a depender de sus variantes: queda en el historial (research R1).
        if (!p.hasVariants && p.stock > 0)
          await applyStockChange(tx, { productId: id, delta: -p.stock, source: "ajuste", reason: "El stock del producto pasó a sus variantes", actor });
        const variantId = crypto.randomUUID();
        await tx.insert(productVariant).values({
          id: variantId, productId: id, sku: b.sku, storage: b.storage, color: b.color, ram: b.ram, priceCents: b.priceCents,
          stock: b.stock, imageId: b.imageId, active: b.active,
        });
        await recordMovement(tx, { productId: id, variantId, delta: b.stock, before: 0, after: b.stock, source: "inicial", actor });
        await syncProductFromVariants(tx, id);
        const label = variantLabel(b);
        await audit(tx, adminId, {
          action: "variante", entityType: "variante", entityId: variantId, entityLabel: b.sku,
          detail: `Variante ${b.sku} (${label}) de ${p.name} creada: ${formatPEN(b.priceCents)}, stock ${b.stock}`,
          after: { sku: b.sku, label, priceCents: b.priceCents, stock: b.stock, active: b.active },
        });
        return variantId;
      })
      .catch((e) => {
        throw duplicates(uniqueViolation(e)) ?? e;
      });
    const [v] = (await loadVariants(c.get("db"), id)).filter((x) => x.id === created);
    return c.json(v, 201);
  })
  .patch("/variants/:id", zValidator("json", editBody, validationHook), async (c) => {
    const variantId = c.req.param("id");
    const b = c.req.valid("json");
    const adminId = c.get("user")!.id;
    const productId = await c
      .get("db")
      .transaction(async (tx) => {
        const [cur] = await tx.select().from(productVariant).where(eq(productVariant.id, variantId));
        if (!cur) throw new AppError(404, "NOT_FOUND", "La variante no existe.");
        await lockProduct(tx, cur.productId);
        await checkUnique(tx, cur.productId, b, variantId);
        const [p] = await tx.select({ name: product.name }).from(product).where(eq(product.id, cur.productId));
        await tx
          .update(productVariant)
          .set({ sku: b.sku, storage: b.storage, color: b.color, ram: b.ram, priceCents: b.priceCents, imageId: b.imageId, active: b.active })
          .where(eq(productVariant.id, variantId));
        await syncProductFromVariants(tx, cur.productId);
        const changed = (Object.keys(CHANGED_LABEL) as (keyof typeof b)[]).filter((k) => b[k] !== (cur as Record<string, unknown>)[k]);
        if (changed.length) {
          const parts = changed.map((k) =>
            k === "priceCents" ? `precio ${formatPEN(cur.priceCents)} → ${formatPEN(b.priceCents)}` : k === "active" ? (b.active ? "activada" : "desactivada") : CHANGED_LABEL[k]!,
          );
          await audit(tx, adminId, {
            action: "variante", entityType: "variante", entityId: variantId, entityLabel: b.sku,
            detail: `Variante ${b.sku} de ${p!.name}: ${parts.join(", ")}`,
            before: Object.fromEntries(changed.map((k) => [k, (cur as Record<string, unknown>)[k]])),
            after: Object.fromEntries(changed.map((k) => [k, b[k]])),
          });
        }
        return cur.productId;
      })
      .catch((e) => {
        throw duplicates(uniqueViolation(e)) ?? e;
      });
    const [v] = (await loadVariants(c.get("db"), productId)).filter((x) => x.id === variantId);
    return c.json(v);
  })
  .delete("/variants/:id", async (c) => {
    const variantId = c.req.param("id");
    const adminId = c.get("user")!.id;
    await c.get("db").transaction(async (tx) => {
      const [cur] = await tx.select().from(productVariant).where(eq(productVariant.id, variantId));
      if (!cur) throw new AppError(404, "NOT_FOUND", "La variante no existe.");
      await lockProduct(tx, cur.productId);
      const [sold] = await tx.select({ id: orderItem.id }).from(orderItem).where(eq(orderItem.variantId, variantId)).limit(1);
      if (sold) throw new AppError(409, "VARIANT_SOLD", "Esta variante ya tiene pedidos; desactívala.");
      const [p] = await tx.select({ name: product.name }).from(product).where(eq(product.id, cur.productId));
      await tx.delete(productVariant).where(eq(productVariant.id, variantId));
      await syncProductFromVariants(tx, cur.productId);
      await audit(tx, adminId, {
        action: "variante", entityType: "variante", entityId: variantId, entityLabel: cur.sku,
        detail: `Variante ${cur.sku} (${variantLabel(cur)}) de ${p!.name} borrada`,
        before: { sku: cur.sku, priceCents: cur.priceCents, stock: cur.stock },
      });
    });
    return c.body(null, 204);
  });
