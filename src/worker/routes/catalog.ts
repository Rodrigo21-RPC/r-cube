import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, max, min, gt, ne, sql, type SQL } from "drizzle-orm";
import { schema } from "@db/client";
import type { Db } from "@db/client";
import { licenseUrl } from "@shared/photo-credit";
import { normalizeSearch } from "@shared/search";
import { variantLabel } from "@shared/variant";
import type { Availability, CatalogPage, Facets, HomeData, PhotoCredits, ProductCard, ProductDetail } from "@shared/types";
import { AppError, validationHook, type AppEnv } from "../middleware";

const { product, brand, category, productImage, productVariant } = schema;
export const PAGE_SIZE = 12;
export const GENERIC_IMAGE = "/img/generico.svg";

export function availabilityOf(stock: number): Availability {
  return stock <= 0 ? "out" : stock <= 5 ? "low" : "in_stock";
}

const mainImage = sql<string | null>`(select ${productImage.url} from ${productImage}
  where ${productImage.productId} = ${product.id} order by ${productImage.position} limit 1)`;

/** Columnas de una tarjeta de producto (HU-01). */
export const cardColumns = {
  id: product.id,
  slug: product.slug,
  name: product.name,
  brand: brand.name,
  priceCents: product.priceCents,
  compareAtCents: product.compareAtCents,
  stock: product.stock,
  hasVariants: product.hasVariants,
  maxPriceCents: product.maxPriceCents,
  imageUrl: mainImage,
};

interface CardRow {
  id: string;
  slug: string;
  name: string;
  brand: string;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  hasVariants: boolean;
  maxPriceCents: number | null;
  imageUrl: string | null;
}

export function toCard(r: CardRow): ProductCard {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    brand: r.brand,
    priceCents: r.priceCents,
    compareAtCents: r.compareAtCents,
    stock: r.stock,
    availability: availabilityOf(r.stock),
    imageUrl: r.imageUrl ?? GENERIC_IMAGE,
    imageAlt: r.name,
    hasVariants: r.hasVariants,
    // Rango solo si hay variantes con distinto precio (HU-43, FR-003).
    maxPriceCents: r.hasVariants && r.maxPriceCents !== null && r.maxPriceCents > r.priceCents ? r.maxPriceCents : null,
  };
}

/** Consulta base de tarjetas activas con marca y categoría activas. */
export function cardsQuery(db: Db) {
  return db
    .select(cardColumns)
    .from(product)
    .innerJoin(brand, eq(brand.id, product.brandId))
    .innerJoin(category, eq(category.id, product.categoryId));
}

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().max(60).optional(),
  brand: z.string().max(300).optional(),
  min: z.coerce.number().int().min(0).optional(),
  max: z.coerce.number().int().min(0).optional(),
  available: z.enum(["1", "true"]).optional(),
  sort: z.enum(["relevance", "price_asc", "price_desc", "newest"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

const plainName = sql`translate(lower(${product.name}), 'áéíóúüñ', 'aeiouun')`;
const plainBrand = sql`translate(lower(${brand.name}), 'áéíóúüñ', 'aeiouun')`;

const HOME_SIZE = 8;

const soldUnits = sql<number>`coalesce((select sum(oi.quantity) from order_item oi
  join orders o on o.id = oi.order_id where oi.product_id = ${product.id} and o.status <> 'cancelled'), 0)`;

export const catalogRoutes = new Hono<AppEnv>()
  /** Portada: categorías, ofertas, más vendidos y novedades (HU-06). */
  /** Créditos de las fotos: las externas con autor, licencia y origen, y los productos con fotos del proyecto (HU-58). */
  .get("/photo-credits", async (c) => {
    const rows = await c
      .get("db")
      .select({
        productName: product.name,
        productSlug: product.slug,
        imageUrl: productImage.url,
        alt: productImage.alt,
        origin: productImage.origin,
        author: productImage.creditAuthor,
        license: productImage.creditLicense,
        sourceUrl: productImage.creditUrl,
      })
      .from(productImage)
      .innerJoin(product, eq(product.id, productImage.productId))
      .where(and(eq(product.active, true), inArray(productImage.origin, ["externa", "proyecto"])))
      .orderBy(sql`lower(${product.name})`, asc(product.id), asc(productImage.position));
    const seen = new Set<string>();
    const body: PhotoCredits = {
      external: rows
        .filter((r) => r.origin === "externa")
        .map((r) => ({
          productName: r.productName, productSlug: r.productSlug, imageUrl: r.imageUrl, alt: r.alt,
          author: r.author, license: r.license, licenseUrl: licenseUrl(r.license), sourceUrl: r.sourceUrl,
        })),
      project: rows
        .filter((r) => r.origin === "proyecto" && !seen.has(r.productSlug) && seen.add(r.productSlug))
        .map((r) => ({ productName: r.productName, productSlug: r.productSlug })),
    };
    return c.json(body);
  })
  .get("/home", async (c) => {
    const db = c.get("db");
    const active = and(eq(product.active, true), eq(brand.active, true), eq(category.active, true));
    const [categories, offers, bestSellers, newest] = await Promise.all([
      db
        .select({
          slug: category.slug,
          name: category.name,
          imageUrl: sql<string | null>`(select pi.url from product_image pi join product p on p.id = pi.product_id
            where p.category_id = "category"."id" and p.active and pi.url <> ${GENERIC_IMAGE}
            order by p.created_at desc, pi.position limit 1)`,
        })
        .from(category)
        .where(eq(category.active, true))
        .orderBy(asc(category.sortOrder)),
      cardsQuery(db)
        .where(and(active, gt(product.compareAtCents, product.priceCents)))
        .orderBy(desc(sql`(${product.compareAtCents} - ${product.priceCents})::float / ${product.compareAtCents}`), asc(product.id))
        .limit(HOME_SIZE),
      cardsQuery(db)
        .where(and(active, gt(soldUnits, 0)))
        .orderBy(desc(soldUnits), desc(product.createdAt), asc(product.id))
        .limit(HOME_SIZE),
      cardsQuery(db).where(active).orderBy(desc(product.createdAt), asc(product.id)).limit(HOME_SIZE),
    ]);
    const body: HomeData = {
      categories: categories.map((cat) => ({ ...cat, imageUrl: cat.imageUrl ?? GENERIC_IMAGE })),
      offers: offers.map(toCard),
      bestSellers: bestSellers.map(toCard),
      newest: newest.map(toCard),
    };
    return c.json(body);
  })
  .get("/products", zValidator("query", listQuery, validationHook), async (c) => {
    const db = c.get("db");
    const f = c.req.valid("query");
    const term = f.q ? normalizeSearch(f.q) : "";
    const where: SQL[] = [eq(product.active, true), eq(brand.active, true), eq(category.active, true)];
    if (term) where.push(ilike(product.searchText, `%${term.replace(/[%_\\]/g, "\\$&")}%`));
    if (f.category) where.push(eq(category.slug, f.category));
    const brands = f.brand?.split(",").filter(Boolean);
    if (brands?.length) where.push(inArray(brand.slug, brands));
    if (f.min !== undefined) where.push(gte(product.priceCents, f.min * 100));
    if (f.max !== undefined) where.push(lte(product.priceCents, f.max * 100));
    if (f.available) where.push(gt(product.stock, 0));

    const sort = f.sort ?? (term ? "relevance" : "newest");
    const pattern = `%${term}%`;
    const orderBy =
      sort === "price_asc"
        ? [asc(product.priceCents), asc(product.id)]
        : sort === "price_desc"
          ? [desc(product.priceCents), asc(product.id)]
          : sort === "relevance" && term
            ? [
                sql`case when ${plainName} like ${pattern} then 0 when ${plainBrand} like ${pattern} then 1 else 2 end`,
                desc(product.createdAt),
                asc(product.id),
              ]
            : [desc(product.createdAt), asc(product.id)];

    const [{ total } = { total: 0 }] = await db
      .select({ total: count() })
      .from(product)
      .innerJoin(brand, eq(brand.id, product.brandId))
      .innerJoin(category, eq(category.id, product.categoryId))
      .where(and(...where));
    const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(f.page, lastPage);
    const rows = await cardsQuery(db)
      .where(and(...where))
      .orderBy(...orderBy)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    const body: CatalogPage = { items: rows.map(toCard), total, page, pageSize: PAGE_SIZE };
    if (f.q) body.query = f.q;
    return c.json(body);
  })
  .get("/products/:slug", async (c) => {
    const db = c.get("db");
    const [row] = await db
      .select({ ...cardColumns, description: product.description, specs: product.specs, tagline: product.tagline, highlights: product.highlights, categoryName: category.name, categorySlug: category.slug })
      .from(product)
      .innerJoin(brand, eq(brand.id, product.brandId))
      .innerJoin(category, eq(category.id, product.categoryId))
      .where(and(eq(product.slug, c.req.param("slug")), eq(product.active, true)));
    if (!row) throw new AppError(404, "NOT_FOUND", "Este producto no existe o ya no está disponible.");
    const images = await db
      .select({ url: productImage.url, alt: productImage.alt })
      .from(productImage)
      .where(eq(productImage.productId, row.id))
      .orderBy(asc(productImage.position));
    const variants = await db
      .select({
        v: productVariant,
        imageUrl: sql<string | null>`(select ${productImage.url} from ${productImage} where ${productImage.id} = ${productVariant.imageId})`,
      })
      .from(productVariant)
      .where(and(eq(productVariant.productId, row.id), eq(productVariant.active, true)))
      .orderBy(asc(productVariant.priceCents), asc(productVariant.sku));
    const body: ProductDetail = {
      ...toCard(row),
      tagline: row.tagline,
      highlights: row.highlights,
      description: row.description,
      specs: row.specs,
      category: { name: row.categoryName, slug: row.categorySlug },
      images: images.length ? images : [{ url: GENERIC_IMAGE, alt: row.name }],
      variants: variants.map(({ v, imageUrl }) => ({
        id: v.id, sku: v.sku, label: variantLabel(v), color: v.color, storage: v.storage, ram: v.ram, priceCents: v.priceCents,
        stock: v.stock, availability: availabilityOf(v.stock), imageUrl,
      })),
    };
    return c.json(body);
  })
  /** Hasta 4 productos de la misma categoría, disponibles, la misma marca primero y luego los más vendidos (HU-51). */
  .get("/products/:slug/related", async (c) => {
    const db = c.get("db");
    const [current] = await db
      .select({ id: product.id, brandId: product.brandId, categoryId: product.categoryId })
      .from(product)
      .where(and(eq(product.slug, c.req.param("slug")), eq(product.active, true)));
    if (!current) throw new AppError(404, "NOT_FOUND", "Este producto no existe o ya no está disponible.");
    const rows = await cardsQuery(db)
      .where(
        and(
          eq(product.categoryId, current.categoryId),
          ne(product.id, current.id),
          eq(product.active, true),
          eq(brand.active, true),
          eq(category.active, true),
          gt(product.stock, 0),
        ),
      )
      .orderBy(sql`case when ${product.brandId} = ${current.brandId} then 0 else 1 end`, desc(soldUnits), asc(product.id))
      .limit(4);
    return c.json(rows.map(toCard));
  })
  .get("/facets", async (c) => {
    const db = c.get("db");
    const active = and(eq(product.active, true), eq(brand.active, true), eq(category.active, true));
    const categories = await db
      .select({ slug: category.slug, name: category.name, count: count(product.id) })
      .from(category)
      .innerJoin(product, eq(product.categoryId, category.id))
      .innerJoin(brand, eq(brand.id, product.brandId))
      .where(active)
      .groupBy(category.id)
      .orderBy(asc(category.sortOrder));
    const brands = await db
      .select({ slug: brand.slug, name: brand.name, count: count(product.id) })
      .from(brand)
      .innerJoin(product, eq(product.brandId, brand.id))
      .innerJoin(category, eq(category.id, product.categoryId))
      .where(active)
      .groupBy(brand.id)
      .orderBy(asc(brand.name));
    const [price] = await db
      .select({ minCents: min(product.priceCents), maxCents: max(product.priceCents) })
      .from(product)
      .innerJoin(brand, eq(brand.id, product.brandId))
      .innerJoin(category, eq(category.id, product.categoryId))
      .where(active);
    const body: Facets = {
      categories,
      brands,
      price: { minCents: price?.minCents ?? 0, maxCents: price?.maxCents ?? 0 },
    };
    return c.json(body);
  });
