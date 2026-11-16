import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { schema } from "@db/client";
import type { ProductCard } from "@shared/types";
import { api, ids, resetDb, withDb } from "./helpers";

type Extra = { id: string; brand: string; category?: string; stock?: number; active?: boolean };

async function addProducts(list: Extra[]) {
  await withDb((db) =>
    db.insert(schema.product).values(
      list.map((p, i) => ({
        id: p.id, slug: p.id, name: `Producto ${p.id}`, brandId: p.brand, categoryId: p.category ?? ids.catPhones, description: "Prueba", specs: [],
        priceCents: 100000 + i, stock: p.stock ?? 5, active: p.active ?? true, searchText: `producto ${p.id}`,
      })),
    ),
  );
}

/** Un pedido pagado con las unidades vendidas de cada producto (cuenta para «más vendidos»). */
async function sold(units: Record<string, number>) {
  await withDb(async (db) => {
    const [u] = (await db.execute(sql`insert into "user" (id, name, email, email_verified, role) values ('u-venta', 'Cliente', 'v@prueba.pe', true, 'cliente') returning id`)) as unknown as { id: string }[];
    await db.execute(sql`insert into orders (id, number, user_id, status, delivery_method, shipping_cents, subtotal_cents, total_cents, taxable_base_cents, igv_cents, payment_method)
      values ('o-venta', 'RC-000099', ${u!.id}, 'paid', 'pickup', 0, 1, 1, 1, 0, 'card')`);
    let i = 0;
    for (const [productId, quantity] of Object.entries(units))
      await db.execute(sql`insert into order_item (id, order_id, product_id, product_name, unit_price_cents, quantity, line_total_cents)
        values (${`oi-${i++}`}, 'o-venta', ${productId}, 'x', 100, ${quantity}, ${quantity * 100})`);
  });
}

const related = async (slug: string) => (await api(`/catalog/products/${slug}/related`)).json() as Promise<ProductCard[]>;

beforeEach(resetDb);

describe("HU-51, FR-026: productos relacionados", () => {
  it("HU-51: devuelve hasta 4 de la misma categoría, sin el producto actual, con foto, nombre y precio", async () => {
    await addProducts(["a1", "a2", "a3", "a4", "a5"].map((id) => ({ id, brand: ids.brandB })));
    const list = await related(ids.p3);
    expect(list).toHaveLength(4);
    expect(list.map((p) => p.id)).not.toContain(ids.p3);
    expect(list[0]).toMatchObject({ slug: expect.any(String), name: expect.any(String), priceCents: expect.any(Number), imageUrl: expect.any(String) });
  });

  it("HU-51: solo incluye productos de la misma categoría, activos y con stock", async () => {
    await addProducts([
      { id: "ok", brand: ids.brandB },
      { id: "laptop", brand: ids.brandB, category: ids.catLaptops },
      { id: "apagado", brand: ids.brandB, active: false },
      { id: "agotado", brand: ids.brandB, stock: 0 },
    ]);
    expect((await related(ids.p3)).map((p) => p.id).sort()).toEqual([ids.p10, "ok"].sort()); // el iPhone también es un celular activo con stock
  });

  it("HU-51: excluye los productos de una marca o categoría inactiva", async () => {
    await withDb(async (db) => {
      await db.insert(schema.brand).values({ id: "brand-off", name: "Marca apagada", slug: "marca-apagada", active: false });
      await db.insert(schema.category).values({ id: "cat-off", name: "Apagada", slug: "apagada", active: false, sortOrder: 9 });
    });
    await addProducts([{ id: "marca-off", brand: "brand-off" }, { id: "bueno", brand: ids.brandB }]);
    expect((await related(ids.p3)).map((p) => p.id)).not.toContain("marca-off");
    // En una categoría inactiva el producto de origen tampoco ofrece relacionados.
    await addProducts([{ id: "en-cat-off", brand: ids.brandB, category: "cat-off" }, { id: "en-cat-off-2", brand: ids.brandB, category: "cat-off" }]);
    expect(await related("en-cat-off")).toEqual([]);
  });

  it("HU-51: prioriza la misma marca y luego los más vendidos, de forma estable", async () => {
    await addProducts([
      { id: "s1", brand: ids.brandB }, { id: "s2", brand: ids.brandB }, { id: "s3", brand: ids.brandB },
      { id: "a1", brand: ids.brandA }, { id: "a2", brand: ids.brandA },
    ]);
    await sold({ s1: 1, s2: 7, s3: 4, a1: 1, a2: 9, [ids.p10]: 3 });
    const first = (await related(ids.p3)).map((p) => p.id);
    // Samsung por ventas (s2 7, s3 4, s1 1) y, para completar 4, el Apple más vendido (a2 9).
    expect(first).toEqual(["s2", "s3", "s1", "a2"]);
    expect((await related(ids.p3)).map((p) => p.id)).toEqual(first);
  });

  it("HU-51: un pedido cancelado no cuenta como venta", async () => {
    await addProducts([{ id: "s1", brand: ids.brandB }, { id: "s2", brand: ids.brandB }]);
    await sold({ s1: 9, s2: 1 });
    await withDb((db) => db.execute(sql`update orders set status = 'cancelled'`));
    expect((await related(ids.p3)).slice(0, 2).map((p) => p.id)).toEqual(["s1", "s2"]); // empatan en 0 y se ordenan por id
  });

  it("HU-51: con pocos candidatos devuelve menos de 4 y sin ninguno devuelve una lista vacía", async () => {
    expect((await related(ids.p3)).map((p) => p.id)).toEqual([ids.p10]);
    expect(await related(ids.p0)).toEqual([]); // el único laptop
  });

  it("HU-51: un producto inexistente o inactivo responde 404", async () => {
    expect((await api("/catalog/products/no-existe/related")).status).toBe(404);
    expect((await api(`/catalog/products/${ids.pOff}/related`)).status).toBe(404);
  });
});
