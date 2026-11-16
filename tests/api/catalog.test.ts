import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { CatalogPage, Facets, ProductDetail } from "@shared/types";
import { api, ids, resetDb, signInAdmin, withDb } from "./helpers";
import { buildSearchText } from "@shared/search";
import { schema } from "@db/client";

const get = async <T>(path: string) => {
  const res = await api(path);
  return { status: res.status, body: (await res.json()) as T };
};

beforeAll(async () => {
  await resetDb();
  // 14 productos activos extra para probar la paginación de 12.
  await withDb(async (db) => {
    await db.insert(schema.product).values(
      Array.from({ length: 14 }, (_, i) => ({
        id: `extra-${i}`,
        slug: `extra-${i}`,
        name: `Accesorio ${String(i).padStart(2, "0")}`,
        brandId: ids.brandB,
        categoryId: ids.catLaptops,
        description: "Accesorio genérico",
        priceCents: 1000 + i * 100,
        stock: 20,
        searchText: buildSearchText(`Accesorio ${i}`, "Samsung", "Accesorio genérico"),
        createdAt: new Date(`2025-12-${String(i + 1).padStart(2, "0")}`),
      })),
    );
  });
});

describe("HU-01: catálogo paginado", () => {
  it("HU-01: 12 productos por página y solo activos", async () => {
    const { status, body } = await get<CatalogPage>("/catalog/products");
    expect(status).toBe(200);
    expect(body.pageSize).toBe(12);
    expect(body.items).toHaveLength(12);
    expect(body.total).toBe(17);
    expect(body.items.every((p) => p.id !== ids.pOff)).toBe(true);
    const page2 = await get<CatalogPage>("/catalog/products?page=2");
    expect(page2.body.items).toHaveLength(5);
  });

  it("HU-01: cada tarjeta trae foto, nombre, precio y disponibilidad", async () => {
    const { body } = await get<CatalogPage>("/catalog/products?q=iphone");
    const card = body.items[0]!;
    expect(card).toMatchObject({ name: "iPhone 15 Pro", priceCents: 499900, availability: "in_stock" });
    expect(card.imageUrl).toBe("/img/productos/celular-iphone-15-pro.jpg");
    expect(card.imageAlt).toBe("iPhone 15 Pro");
  });

  it("HU-01: un producto sin foto usa la imagen genérica", async () => {
    const { body } = await get<CatalogPage>("/catalog/products?q=galaxy");
    expect(body.items[0]!.imageUrl).toBe("/img/generico.svg");
  });

  it("HU-01: página fuera de rango devuelve la última página válida", async () => {
    const { body } = await get<CatalogPage>("/catalog/products?page=99");
    expect(body.page).toBe(2);
    expect(body.items).toHaveLength(5);
  });
});

describe("HU-02: búsqueda por texto", () => {
  it("HU-02: ignora mayúsculas y tildes y busca en nombre, marca y descripción", async () => {
    expect((await get<CatalogPage>("/catalog/products?q=IPHONE")).body.total).toBe(1);
    expect((await get<CatalogPage>("/catalog/products?q=apple")).body.total).toBe(2);
    expect((await get<CatalogPage>("/catalog/products?q=c%C3%81MARA")).body.total).toBe(3);
  });

  it("HU-02: devuelve el término buscado y total 0 sin coincidencias", async () => {
    const { body } = await get<CatalogPage>("/catalog/products?q=zzzz");
    expect(body.total).toBe(0);
    expect(body.items).toEqual([]);
    expect(body.query).toBe("zzzz");
  });

  it("HU-02: un producto inactivo no aparece aunque coincida", async () => {
    expect((await get<CatalogPage>("/catalog/products?q=retirado")).body.total).toBe(0);
  });
});

describe("HU-03: filtros combinables", () => {
  it("HU-03: categoría + marca + rango de precio + disponibles", async () => {
    const { body } = await get<CatalogPage>(
      "/catalog/products?category=celulares&brand=apple,samsung&min=2000&max=5000&available=1",
    );
    expect(body.items.map((p) => p.id).sort()).toEqual([ids.p10, ids.p3].sort());
    const onlyAvailable = await get<CatalogPage>("/catalog/products?category=laptops&available=1");
    expect(onlyAvailable.body.items.some((p) => p.id === ids.p0)).toBe(false);
  });

  it("HU-03: facetas con categorías y marcas activas y rango de precios", async () => {
    const { body } = await get<Facets>("/catalog/facets");
    expect(body.categories.map((c) => c.slug)).toEqual(["celulares", "laptops"]);
    expect(body.categories[0]!.count).toBe(2);
    expect(body.brands.map((b) => b.slug).sort()).toEqual(["apple", "samsung"]);
    expect(body.price.maxCents).toBe(499900);
  });

  it("HU-03: parámetros inválidos responden 400", async () => {
    expect((await api("/catalog/products?sort=raro")).status).toBe(400);
  });
});

describe("HU-04: orden", () => {
  const order = async (sort: string, page = 1) =>
    (await get<CatalogPage>(`/catalog/products?sort=${sort}&page=${page}`)).body.items.map((p) => p.priceCents);

  it("HU-04: precio menor y mayor, estables al paginar", async () => {
    const asc = [...(await order("price_asc")), ...(await order("price_asc", 2))];
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = [...(await order("price_desc")), ...(await order("price_desc", 2))];
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    expect(new Set(asc).size).toBe(asc.length);
  });

  it("HU-04: novedad primero lo más reciente", async () => {
    const { body } = await get<CatalogPage>("/catalog/products?sort=newest&category=celulares");
    expect(body.items.map((p) => p.id)).toEqual([ids.p10, ids.p3]);
  });

  it("HU-04: relevancia pone primero las coincidencias en el nombre", async () => {
    await withDb((db) =>
      db.execute(sql`UPDATE product SET description = 'Funda compatible con Galaxy', search_text = 'accesorio 00 samsung funda compatible con galaxy' WHERE id = 'extra-0'`),
    );
    const { body } = await get<CatalogPage>("/catalog/products?q=galaxy&sort=relevance");
    expect(body.items[0]!.id).toBe(ids.p3);
    expect(body.items[1]!.id).toBe("extra-0");
  });
});

describe("HU-05: detalle de producto", () => {
  it("HU-05: detalle completo con disponibilidad baja", async () => {
    const { status, body } = await get<ProductDetail>(`/catalog/products/${ids.p3}`);
    expect(status).toBe(200);
    expect(body).toMatchObject({ name: "Galaxy S23", brand: "Samsung", stock: 3, availability: "low" });
    expect(body.specs).toEqual([{ label: "RAM", value: "8 GB" }]);
    expect(body.category.slug).toBe("celulares");
    expect(body.images.length).toBeGreaterThanOrEqual(1);
  });

  it("HU-05: agotado con stock 0", async () => {
    const { body } = await get<ProductDetail>(`/catalog/products/${ids.p0}`);
    expect(body.availability).toBe("out");
  });

  it("HU-05, RN-06: producto inactivo o inexistente responde 404", async () => {
    expect((await api(`/catalog/products/${ids.pOff}`)).status).toBe(404);
    expect((await api("/catalog/products/no-existe")).status).toBe(404);
  });
});

describe("HU-56, FR-014 a FR-017: frase y destacados en el detalle", () => {
  it("HU-56: el detalle devuelve la frase y los destacados del producto", async () => {
    await withDb((db) =>
      db.execute(sql`update product set tagline = 'Fulgor cuántico en tu bolsillo', highlights = ${JSON.stringify(["Batería eterna de litio", "Pantalla de 120 Hz"])}::jsonb where id = ${ids.p3}`),
    );
    const { body } = await get<ProductDetail>(`/catalog/products/${ids.p3}`);
    expect(body.tagline).toBe("Fulgor cuántico en tu bolsillo");
    expect(body.highlights).toEqual(["Batería eterna de litio", "Pantalla de 120 Hz"]);
  });

  it("HU-56, FR-015: un producto sin frase ni destacados devuelve cadena vacía y lista vacía", async () => {
    const { body } = await get<ProductDetail>(`/catalog/products/${ids.p10}`);
    expect(body.tagline).toBe("");
    expect(body.highlights).toEqual([]);
  });

  it("HU-54: las fotos del detalle siguen siendo { url, alt } sin más campos", async () => {
    const { body } = await get<ProductDetail>(`/catalog/products/${ids.p10}`);
    expect(body.images.length).toBeGreaterThanOrEqual(1);
    for (const image of body.images) expect(Object.keys(image).sort()).toEqual(["alt", "url"]);
  });

  it("HU-56, FR-017: la búsqueda del catálogo no encuentra productos por la frase ni por los destacados", async () => {
    for (const q of ["fulgor", "cuántico", "eterna", "litio"]) {
      const { body } = await get<CatalogPage>(`/catalog/products?q=${encodeURIComponent(q)}`);
      expect(body.items.map((i) => i.id), q).not.toContain(ids.p3);
    }
  });

  it("HU-56, FR-017: la búsqueda del panel tampoco considera la frase ni los destacados", async () => {
    const admin = await signInAdmin();
    for (const q of ["fulgor", "eterna"]) {
      const res = await api(`/admin/products?q=${encodeURIComponent(q)}`, { cookie: admin.cookie });
      const body = (await res.json()) as { items: { id: string }[] };
      expect(body.items.map((i) => i.id), q).not.toContain(ids.p3);
    }
  });
});
