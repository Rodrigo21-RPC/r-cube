import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { HomeData } from "@shared/types";
import { api, ids, resetDb, signUp, withDb } from "./helpers";

let home: HomeData;

beforeAll(async () => {
  await resetDb();
  // Ventas: Galaxy (3 uds. en un pedido no cancelado) > MacBook (1 ud.) ; el iPhone solo en uno cancelado.
  const u = await signUp();
  await withDb(async (db) => {
    const mk = async (n: number, status: string, lines: [string, string, number][]) => {
      await db.execute(sql`insert into orders (id, number, user_id, status, delivery_method, shipping_cents, subtotal_cents,
        total_cents, taxable_base_cents, igv_cents, payment_method)
        values (${`o${n}`}, ${`RC-90000${n}`}, ${u.user.id}, ${status}, 'pickup', 0, 1, 1, 1, 0, 'card')`);
      for (const [i, [pid, name, q]] of lines.entries())
        await db.execute(sql`insert into order_item (id, order_id, product_id, product_name, unit_price_cents, quantity, line_total_cents)
          values (${`o${n}-${i}`}, ${`o${n}`}, ${pid}, ${name}, 1, ${q}, ${q})`);
    };
    await mk(1, "paid", [[ids.p3, "Galaxy S23", 3], [ids.p0, "MacBook Air M1", 1]]);
    await mk(2, "cancelled", [[ids.p10, "iPhone 15 Pro", 9]]);
  });
  home = (await (await api("/catalog/home")).json()) as HomeData;
});

describe("HU-06: página de inicio", () => {
  it("HU-06: categorías activas en orden", () => {
    expect(home.categories.map((c) => c.slug)).toEqual(["celulares", "laptops"]);
  });

  it("HU-06: ofertas solo con precio anterior mayor al actual", () => {
    expect(home.offers.map((p) => p.id)).toEqual([ids.p10]);
    expect(home.offers[0]!.compareAtCents).toBeGreaterThan(home.offers[0]!.priceCents);
  });

  it("HU-06: más vendidos por unidades en pedidos no cancelados", () => {
    expect(home.bestSellers.map((p) => p.id).slice(0, 2)).toEqual([ids.p3, ids.p0]);
  });

  it("HU-06: novedades por fecha de alta y sin inactivos", () => {
    expect(home.newest.map((p) => p.id)).toEqual([ids.p10, ids.p3, ids.p0]);
    const all = [...home.offers, ...home.bestSellers, ...home.newest].map((p) => p.id);
    expect(all).not.toContain(ids.pOff);
  });
});
