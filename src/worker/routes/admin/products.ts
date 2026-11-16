import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, asc, count, desc, eq, ilike, inArray, sql, type SQL } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import { formatPEN } from "@shared/money";
import { buildSearchText, normalizeSearch } from "@shared/search";
import { slugify } from "@shared/slug";
import { HIGHLIGHT_MAX, HIGHLIGHTS_MAX, TAGLINE_MAX, normalizeHighlights } from "@shared/highlights";
import type { AdminProduct, AdminProductRow, Page } from "@shared/admin-types";
import { variantLabel } from "@shared/variant";
import { AppError, validationHook, type AppEnv } from "../../middleware";
import { audit } from "../../services/audit";
import { recordMovement, type Tx } from "../../services/stock";
import { GENERIC_IMAGE } from "../catalog";
import { loadVariants } from "./variants";
import { deleteImage, makeMainImage, moveImage, updateImageAlt, uploadImage } from "../../services/images";

const { product, brand, category, productImage, productVariant } = schema;
const PAGE = 20;

const productBody = z
  .object({
    name: z.string().trim().min(2, "Escribe el nombre (mínimo 2 letras).").max(120),
    brandId: z.string().min(1, "Elige una marca."),
    categoryId: z.string().min(1, "Elige una categoría."),
    description: z.string().trim().max(2000).default(""),
    specs: z
      .array(z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(120) }))
      .max(30)
      .default([]),
    priceCents: z.number().int().positive("El precio debe ser mayor que 0.").max(100_000_000),
    compareAtCents: z.number().int().positive().nullable().default(null),
    stock: z.number().int().min(0, "El stock no puede ser negativo.").max(100_000).default(0),
    active: z.boolean().default(true),
    // Frase y destacados (HU-57): opcionales; si se omiten, el alta los deja vacíos y la edición conserva los actuales.
    tagline: z.string().trim().max(TAGLINE_MAX, `La frase no puede pasar de ${TAGLINE_MAX} caracteres`).optional(),
    highlights: z
      .array(z.string())
      .transform(normalizeHighlights)
      .pipe(
        z
          .array(z.string().max(HIGHLIGHT_MAX, `Cada destacado admite hasta ${HIGHLIGHT_MAX} caracteres`))
          .max(HIGHLIGHTS_MAX, `Máximo ${HIGHLIGHTS_MAX} destacados`),
      )
      .optional(),
  })
  .refine((b) => b.compareAtCents === null || b.compareAtCents > b.priceCents, {
    path: ["compareAtCents"],
    message: "El precio anterior debe ser mayor que el precio actual.",
  });

async function checkRefs(db: Tx, brandId: string, categoryId: string) {
  const [[b], [c]] = await Promise.all([
    db.select({ name: brand.name }).from(brand).where(eq(brand.id, brandId)),
    db.select({ id: category.id }).from(category).where(eq(category.id, categoryId)),
  ]);
  const fields: Record<string, string> = {};
  if (!b) fields.brandId = "La marca no existe.";
  if (!c) fields.categoryId = "La categoría no existe.";
  if (Object.keys(fields).length) throw new AppError(400, "VALIDATION", "Revisa los datos ingresados.", fields);
  return b!.name;
}

async function uniqueSlug(db: Tx, name: string, exceptId?: string) {
  const base = slugify(name) || "producto";
  for (let i = 1; ; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    const [hit] = await db.select({ id: product.id }).from(product).where(eq(product.slug, candidate));
    if (!hit || hit.id === exceptId) return candidate;
  }
}

/** Producto completo para el formulario del panel. */
export async function loadAdminProduct(db: Db | Tx, id: string): Promise<AdminProduct> {
  const [p] = await db.select().from(product).where(eq(product.id, id));
  if (!p) throw new AppError(404, "NOT_FOUND", "El producto no existe.");
  const images = await db.select().from(productImage).where(eq(productImage.productId, id)).orderBy(asc(productImage.position), asc(productImage.id));
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brandId: p.brandId,
    categoryId: p.categoryId,
    description: p.description,
    specs: p.specs,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    stock: p.stock,
    maxPriceCents: p.maxPriceCents,
    hasVariants: p.hasVariants,
    variants: await loadVariants(db, id),
    tagline: p.tagline,
    highlights: p.highlights,
    active: p.active,
    images: images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, position: i.position, uploaded: i.r2Key !== null })),
  };
}

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().max(60).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  lowStock: z.enum(["1"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

/** Productos del panel (HU-28 a HU-30). Las fotos se agregan en US3 y el stock en US4. */
export const productRoutes = new Hono<AppEnv>()
  .get("/products", zValidator("query", listQuery, validationHook), async (c) => {
    const db = c.get("db");
    const f = c.req.valid("query");
    const where: SQL[] = [];
    if (f.q) where.push(ilike(product.searchText, `%${normalizeSearch(f.q).replace(/[%_\\]/g, "\\$&")}%`));
    if (f.category) where.push(eq(category.slug, f.category));
    if (f.status) where.push(eq(product.active, f.status === "active"));
    // Stock bajo (clarificación 3): un producto simple con 5 o menos, o uno con alguna variante activa con 5 o menos.
    if (f.lowStock)
      where.push(
        sql`((not ${product.hasVariants} and ${product.stock} <= 5) or exists(select 1 from product_variant v where v.product_id = ${product.id} and v.active and v.stock <= 5))`,
      );
    const cond = where.length ? and(...where) : undefined;
    const [{ total } = { total: 0 }] = await db
      .select({ total: count() })
      .from(product)
      .innerJoin(category, eq(category.id, product.categoryId))
      .where(cond);
    const rows = await db
      .select({
        id: product.id, slug: product.slug, name: product.name, brand: brand.name, category: category.name,
        priceCents: product.priceCents, maxPriceCents: product.maxPriceCents, stock: product.stock, hasVariants: product.hasVariants,
        active: product.active,
        imageUrl: sql<string | null>`(select ${productImage.url} from ${productImage} where ${productImage.productId} = ${product.id} order by ${productImage.position} limit 1)`,
      })
      .from(product)
      .innerJoin(brand, eq(brand.id, product.brandId))
      .innerJoin(category, eq(category.id, product.categoryId))
      .where(cond)
      .orderBy(desc(product.createdAt), asc(product.id))
      .limit(PAGE)
      .offset((f.page - 1) * PAGE);
    const vrows = rows.length
      ? await db.select().from(productVariant).where(inArray(productVariant.productId, rows.map((r) => r.id))).orderBy(asc(productVariant.priceCents), asc(productVariant.sku))
      : [];
    const body: Page<AdminProductRow> = {
      items: rows.map((r) => {
        const mine = vrows.filter((v) => v.productId === r.id);
        return {
          ...r,
          variantCount: mine.length,
          lowVariants: mine.filter((v) => v.active && v.stock <= 5).map((v) => ({ label: variantLabel(v), stock: v.stock })),
          imageUrl: r.imageUrl ?? GENERIC_IMAGE,
        };
      }),
      total,
      page: f.page,
      pageSize: PAGE,
    };
    return c.json(body);
  })
  .get("/products/:id", async (c) => c.json(await loadAdminProduct(c.get("db"), c.req.param("id"))))
  .post("/products", zValidator("json", productBody, validationHook), async (c) => {
    const body = c.req.valid("json");
    const adminId = c.get("user")!.id;
    const id = await c.get("db").transaction(async (tx) => {
      const brandName = await checkRefs(tx, body.brandId, body.categoryId);
      const id = crypto.randomUUID();
      await tx.insert(product).values({
        id,
        slug: await uniqueSlug(tx, body.name),
        name: body.name,
        brandId: body.brandId,
        categoryId: body.categoryId,
        description: body.description,
        specs: body.specs,
        priceCents: body.priceCents,
        compareAtCents: body.compareAtCents,
        stock: body.stock,
        tagline: body.tagline ?? "",
        highlights: body.highlights ?? [],
        active: body.active,
        searchText: buildSearchText(body.name, brandName, body.description),
      });
      await recordMovement(tx, {
        productId: id, delta: body.stock, before: 0, after: body.stock, source: "inicial",
        reason: "Stock inicial", actor: { type: "administrador", userId: adminId },
      });
      await audit(tx, adminId, {
        action: "producto_creado", entityType: "producto", entityId: id, entityLabel: body.name,
        detail: `Producto creado: ${body.name} a ${formatPEN(body.priceCents)} con stock ${body.stock}`,
        after: { priceCents: body.priceCents, stock: body.stock, active: body.active },
      });
      return id;
    });
    return c.json(await loadAdminProduct(c.get("db"), id), 201);
  })
  .patch("/products/:id", zValidator("json", productBody, validationHook), async (c) => {
    const body = c.req.valid("json");
    const id = c.req.param("id");
    const adminId = c.get("user")!.id;
    await c.get("db").transaction(async (tx) => {
      const [current] = await tx.select().from(product).where(eq(product.id, id));
      if (!current) throw new AppError(404, "NOT_FOUND", "El producto no existe.");
      const brandName = await checkRefs(tx, body.brandId, body.categoryId);
      // Frase y destacados (HU-57): si el cuerpo no los trae se conservan los actuales.
      const tagline = body.tagline ?? current.tagline;
      const highlights = body.highlights ?? current.highlights;
      const highlightsChanged = tagline !== current.tagline || JSON.stringify(highlights) !== JSON.stringify(current.highlights);
      // El stock no se edita aquí (FR-006): solo por ajustes, ventas y cancelaciones.
      await tx
        .update(product)
        .set({
          slug: current.name === body.name ? current.slug : await uniqueSlug(tx, body.name, id),
          name: body.name,
          brandId: body.brandId,
          categoryId: body.categoryId,
          description: body.description,
          specs: body.specs,
          tagline,
          highlights,
          // Con variantes, el precio sale de ellas (research R1).
          ...(current.hasVariants ? {} : { priceCents: body.priceCents, compareAtCents: body.compareAtCents }),
          searchText: buildSearchText(body.name, brandName, body.description),
        })
        .where(eq(product.id, id));
      const priceChanged = !current.hasVariants && current.priceCents !== body.priceCents;
      if (priceChanged) {
        await audit(tx, adminId, {
          action: "precio_cambiado", entityType: "producto", entityId: id, entityLabel: body.name,
          detail: `Precio de ${body.name}: ${formatPEN(current.priceCents)} → ${formatPEN(body.priceCents)}`,
          before: { priceCents: current.priceCents }, after: { priceCents: body.priceCents },
        });
      }
      // Una entrada por cambio relevante (research R5): la de frase y destacados reemplaza a la genérica.
      if (highlightsChanged) {
        await audit(tx, adminId, {
          action: "producto_editado", entityType: "producto", entityId: id, entityLabel: body.name,
          detail: `Frase y destacados de ${body.name} actualizados`,
          before: { tagline: current.tagline, highlights: current.highlights }, after: { tagline, highlights },
        });
      } else if (!priceChanged) {
        await audit(tx, adminId, {
          action: "producto_editado", entityType: "producto", entityId: id, entityLabel: body.name,
          detail: `Datos de ${body.name} actualizados`,
        });
      }
    });
    return c.json(await loadAdminProduct(c.get("db"), id));
  })
  .patch("/products/:id/status", zValidator("json", z.object({ active: z.boolean() }), validationHook), async (c) => {
    const { active } = c.req.valid("json");
    const id = c.req.param("id");
    await c.get("db").transaction(async (tx) => {
      const [p] = await tx.update(product).set({ active }).where(eq(product.id, id)).returning({ name: product.name });
      if (!p) throw new AppError(404, "NOT_FOUND", "El producto no existe.");
      await audit(tx, c.get("user")!.id, {
        action: "producto_estado", entityType: "producto", entityId: id, entityLabel: p.name,
        detail: `${p.name} ${active ? "activado" : "desactivado"}`, after: { active },
      });
    });
    return c.json(await loadAdminProduct(c.get("db"), id));
  });

/** Fotos del producto en R2 (HU-31, FR-009). */
export const productImageRoutes = new Hono<AppEnv>()
  .post("/products/:id/images", async (c) => {
    const form = await c.req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new AppError(400, "INVALID_IMAGE", "Adjunta una foto JPG, PNG o WebP.");
    return c.json(await uploadImage(c.get("db"), c.env.FOTOS, c.req.param("id"), file, c.get("user")!.id), 201);
  })
  .patch("/products/:id/images/:imageId", zValidator("json", z.object({ alt: z.string().trim().min(1, "Escribe el texto alternativo.").max(150) }), validationHook), async (c) => {
    await updateImageAlt(c.get("db"), c.req.param("id"), c.req.param("imageId"), c.req.valid("json").alt, c.get("user")!.id);
    return c.json(await loadAdminProduct(c.get("db"), c.req.param("id")));
  })
  .post("/products/:id/images/:imageId/move", zValidator("json", z.object({ direction: z.enum(["up", "down"]) }), validationHook), async (c) => {
    await moveImage(c.get("db"), c.req.param("id"), c.req.param("imageId"), c.req.valid("json").direction, c.get("user")!.id);
    return c.json(await loadAdminProduct(c.get("db"), c.req.param("id")));
  })
  .post("/products/:id/images/:imageId/main", async (c) => {
    await makeMainImage(c.get("db"), c.req.param("id"), c.req.param("imageId"), c.get("user")!.id);
    return c.json(await loadAdminProduct(c.get("db"), c.req.param("id")));
  })
  .delete("/products/:id/images/:imageId", async (c) => {
    await deleteImage(c.get("db"), c.env.FOTOS, c.req.param("id"), c.req.param("imageId"), c.get("user")!.id);
    return c.json(await loadAdminProduct(c.get("db"), c.req.param("id")));
  });
