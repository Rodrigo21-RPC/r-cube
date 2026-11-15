import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { runSeed } from "@db/seed-data";
import { withDb } from "./helpers";

const passwords = { admin: "admin-prueba-123", customer: "cliente-prueba-123" };

async function counts() {
  return withDb(async (db) => {
    const one = async (q: ReturnType<typeof sql>) =>
      Number(((await db.execute(q)) as unknown as { n: string }[])[0]!.n);
    return {
      active: await one(sql`select count(*) n from product where active`),
      inactive: await one(sql`select count(*) n from product where not active`),
      categories: await one(sql`select count(*) n from category`),
      brands: await one(sql`select count(*) n from brand`),
      admins: await one(sql`select count(*) n from "user" where role = 'administrador'`),
      customers: await one(sql`select count(*) n from "user" where role = 'cliente'`),
      orders: await one(sql`select count(*) n from orders`),
      statuses: await one(sql`select count(distinct status) n from orders`),
      zones: await one(sql`select count(*) n from delivery_zone`),
      methods: await one(sql`select cardinality(enabled_methods) n from store_settings where id = 1`),
      out: await one(sql`select count(*) n from product where active and stock = 0`),
      low: await one(sql`select count(*) n from product where active and stock between 1 and 5`),
      offers: await one(sql`select count(*) n from product where active and compare_at_cents > price_cents`),
      categoryNames: ((await db.execute(sql`select name from category order by sort_order`)) as unknown as { name: string }[]).map((r) => r.name),
      lastNumber: ((await db.execute(sql`select max(number) n from orders`)) as unknown as { n: string }[])[0]!.n,
    };
  });
}

describe("FR-035, FR-036: datos de demostración", () => {
  it("FR-035: cumple los mínimos de REQUISITOS §6 y es repetible", async () => {
    await withDb((db) => runSeed(db, passwords));
    const first = await counts();
    expect(first.active).toBeGreaterThanOrEqual(24);
    expect(first.inactive).toBeGreaterThanOrEqual(1);
    expect(first.categoryNames).toEqual(["Celulares", "Laptops", "Tablets", "Accesorios y repuestos"]);
    expect(first.brands).toBeGreaterThanOrEqual(6);
    expect(first.admins).toBe(1);
    expect(first.customers).toBe(5);
    expect(first.orders).toBe(8);
    expect(first.statuses).toBeGreaterThanOrEqual(4);
    expect(first.zones).toBe(3);
    expect(first.methods).toBe(4);
    expect(first.lastNumber).toBe("RC-000008");

    await withDb((db) => runSeed(db, passwords));
    expect(await counts()).toEqual(first);
  });

  it("FR-028: el historial de stock de cada producto suma su stock actual", async () => {
    const mismatches = await withDb(async (db) =>
      (await db.execute(sql`select p.id from product p
        left join stock_movement m on m.product_id = p.id
        group by p.id, p.stock having coalesce(sum(m.delta), 0) <> p.stock`)) as unknown as { id: string }[],
    );
    expect(mismatches).toEqual([]);
    const sources = await withDb(async (db) =>
      ((await db.execute(sql`select distinct source from stock_movement order by source`)) as unknown as { source: string }[]).map((r) => r.source),
    );
    expect(sources).toEqual(["cancelacion", "inicial", "venta"]);
  });

  it("FR-036: hay productos agotados, con pocas unidades y en oferta", async () => {
    const c = await counts();
    expect(c.out).toBeGreaterThanOrEqual(1);
    expect(c.low).toBeGreaterThanOrEqual(1);
    expect(c.offers).toBeGreaterThanOrEqual(3);
  });
});
