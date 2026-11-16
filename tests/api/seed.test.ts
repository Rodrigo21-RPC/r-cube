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

describe("FR-036, SC-009: datos de demostración de la feature 003", () => {
  const rows = (q: ReturnType<typeof sql>) => withDb(async (db) => (await db.execute(q)) as unknown as Record<string, unknown>[]);
  const one = async (q: ReturnType<typeof sql>) => Number((await rows(q))[0]!.n);

  it("HU-43: hay variantes en 3 productos, una agotada y una con foto propia", async () => {
    await withDb((db) => runSeed(db, passwords));
    expect(await one(sql`select count(*) n from product where has_variants`)).toBe(3);
    expect(await one(sql`select count(*) n from product_variant`)).toBeGreaterThanOrEqual(9);
    expect(await one(sql`select count(*) n from product_variant where stock = 0`)).toBeGreaterThanOrEqual(1);
    expect(await one(sql`select count(*) n from product_variant where image_id is not null`)).toBeGreaterThanOrEqual(1);
  });

  it("invariante 1: el resumen de cada producto con variantes coincide con sus variantes activas", async () => {
    const bad = await rows(sql`select p.id from product p where p.has_variants and (
      p.stock <> (select coalesce(sum(v.stock), 0) from product_variant v where v.product_id = p.id and v.active)
      or p.price_cents <> (select min(v.price_cents) from product_variant v where v.product_id = p.id and v.active)
      or p.max_price_cents is distinct from (select max(v.price_cents) from product_variant v where v.product_id = p.id and v.active))`);
    expect(bad).toEqual([]);
  });

  it("invariante 8: la suma de movimientos de cada producto y de cada variante es su stock actual", async () => {
    expect(await rows(sql`select p.id from product p left join stock_movement m on m.product_id = p.id
      group by p.id, p.stock having coalesce(sum(m.delta), 0) <> p.stock`)).toEqual([]);
    expect(await rows(sql`select v.id from product_variant v left join stock_movement m on m.variant_id = v.id
      group by v.id, v.stock having coalesce(sum(m.delta), 0) <> v.stock`)).toEqual([]);
  });

  it("HU-46, RN-09: las reseñas son solo de productos de pedidos Entregados y una está oculta", async () => {
    expect(await one(sql`select count(*) n from review`)).toBe(2);
    expect(await one(sql`select count(*) n from review where hidden`)).toBe(1);
    expect(await rows(sql`select r.id from review r where not exists (
      select 1 from order_item oi join orders o on o.id = oi.order_id
      where o.user_id = r.user_id and o.status = 'delivered' and oi.product_id = r.product_id)`)).toEqual([]);
    // Un pedido Entregado sin reseñar para probar el formulario.
    expect(await one(sql`select count(*) n from order_item oi join orders o on o.id = oi.order_id
      where o.status = 'delivered' and not exists (select 1 from review r where r.user_id = o.user_id and r.product_id = oi.product_id)`)).toBeGreaterThanOrEqual(1);
  });

  it("HU-45, HU-48: hay favoritos y direcciones, con una sola predeterminada por cliente", async () => {
    expect(await one(sql`select count(*) n from favorite`)).toBeGreaterThanOrEqual(8);
    expect(await one(sql`select count(*) n from address where is_default`)).toBe(5);
    expect(await rows(sql`select user_id from address group by user_id having count(*) filter (where is_default) <> 1`)).toEqual([]);
    expect(await one(sql`select count(*) n from (select user_id from address group by user_id having count(*) > 1) x`)).toBeGreaterThanOrEqual(2);
  });

  it("HU-50, invariante 5: los 3 cupones están vigente, vencido y agotado, y los usos coinciden con los pedidos no cancelados", async () => {
    const status = Object.fromEntries(
      (await rows(sql`select code, case when not active then 'inactive' when used_count >= max_uses then 'exhausted'
        when ends_on < (now() at time zone 'America/Lima')::date then 'expired' else 'active' end as s from coupon`)).map((r) => [r.code, r.s]),
    );
    expect(status).toEqual({ BIENVENIDO10: "active", VERANO5: "expired", ULTIMO: "exhausted" });
    expect(await rows(sql`select c.id from coupon c where c.used_count <>
      (select count(*) from orders o where o.coupon_id = c.id and o.status <> 'cancelled')`)).toEqual([]);
  });

  it("HU-49, RN-04: el pedido con cupón cumple total = productos + envío − descuento y base + IGV = total", async () => {
    expect(await rows(sql`select number from orders where coupon_id is not null and (
      total_cents <> subtotal_cents + shipping_cents - discount_cents or taxable_base_cents + igv_cents <> total_cents)`)).toEqual([]);
    expect(await one(sql`select count(*) n from orders where coupon_id is not null`)).toBe(1);
  });

  it("HU-53: hay avisos de los pedidos de demostración, algunos sin leer", async () => {
    expect(await one(sql`select count(*) n from notification`)).toBeGreaterThanOrEqual(8);
    expect(await one(sql`select count(*) n from notification where read_at is null`)).toBeGreaterThanOrEqual(1);
    expect(await one(sql`select count(*) n from notification where read_at is not null`)).toBeGreaterThanOrEqual(1);
  });
});

describe("FR-036, SC-009: fotos de demostración de la feature 004", () => {
  const rows = (q: ReturnType<typeof sql>) => withDb(async (db) => (await db.execute(q)) as unknown as Record<string, unknown>[]);

  it("HU-54, FR-032: toda foto de variante es de su mismo producto, y las fotos tienen origen y posiciones válidos", async () => {
    await withDb((db) => runSeed(db, passwords));
    expect(
      await rows(sql`select v.id from product_variant v join product_image i on i.id = v.image_id where i.product_id <> v.product_id`),
    ).toEqual([]);
    expect(await rows(sql`select id from product_image where origin not in ('subida','proyecto','externa','tarjeta')`)).toEqual([]);
    // posiciones 0..n-1 sin huecos y todo producto activo con al menos una foto
    expect(
      await rows(sql`select p.id from product p left join product_image i on i.product_id = p.id where p.active
        group by p.id having count(i.id) = 0 or min(i.position) <> 0 or max(i.position) <> count(i.id) - 1`),
    ).toEqual([]);
  });

  it("FR-021: ninguna foto externa de la demostración queda sin autor, licencia y enlace", async () => {
    expect(
      await rows(sql`select id from product_image where origin = 'externa' and (credit_author = '' or credit_license = '' or credit_url = '')`),
    ).toEqual([]);
  });
});
