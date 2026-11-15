import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { AdminSummary } from "@shared/admin-types";
import { api, ids, resetDb, signInAdmin, signUp, withDb } from "../helpers";

let summary: AdminSummary;
let ms = 0;

/** Inserta un pedido de demostración con fecha relativa en horas (hora de Lima en las agregaciones). */
async function order(n: number, userId: string, status: string, total: number, hoursAgo: number, lines: [string, number][]) {
  await withDb(async (db) => {
    await db.execute(sql`insert into orders (id, number, user_id, status, delivery_method, shipping_cents, subtotal_cents,
      total_cents, taxable_base_cents, igv_cents, payment_method, created_at)
      values (${`o${n}`}, ${`RC-80000${n}`}, ${userId}, ${status}, 'pickup', 0, ${total}, ${total}, ${total}, 0, 'card',
        now() - make_interval(hours => ${hoursAgo}))`);
    for (const [i, [pid, q]] of lines.entries())
      await db.execute(sql`insert into order_item (id, order_id, product_id, product_name, unit_price_cents, quantity, line_total_cents)
        values (${`o${n}-${i}`}, ${`o${n}`}, ${pid}, 'x', 100, ${q}, ${100 * q})`);
  });
}

beforeAll(async () => {
  await resetDb();
  const c = await signUp();
  // "Hoy": creados ahora; "ayer": 30 horas atrás (siempre otro día en Lima).
  await order(1, c.user.id, "paid", 10000, 0, [[ids.p3, 2]]);
  await order(2, c.user.id, "preparing", 5000, 0, [[ids.p10, 1]]);
  await order(3, c.user.id, "pending_payment", 7000, 0, [[ids.p10, 1]]);
  await order(4, c.user.id, "cancelled", 9000, 0, [[ids.p3, 5]]);
  await order(5, c.user.id, "delivered", 3000, 30, [[ids.p0, 1]]);
  const a = await signInAdmin();
  await api("/admin/summary", { cookie: a.cookie }); // calienta el Worker
  const t = performance.now();
  const res = await api("/admin/summary", { cookie: a.cookie });
  ms = performance.now() - t;
  summary = (await res.json()) as AdminSummary;
});

describe("HU-27, FR-003, FR-004: resumen de la tienda", () => {
  it("HU-27: tarjetas con ventas de hoy, por preparar, por confirmar, clientes y stock bajo", () => {
    expect(summary.cards).toEqual({
      salesTodayCents: 15000, // pagado + preparando de hoy; sin pendientes ni cancelados
      toPrepare: 2,
      toConfirm: 1,
      customers: 1,
      lowStock: 2, // activos con stock ≤ 5: Galaxy (3) y MacBook (0)
    });
  });

  it("HU-27: ventas diarias de 30 días completos, incluidos días sin ventas", () => {
    expect(summary.salesByDay).toHaveLength(30);
    expect(summary.salesByDay.at(-1)!.totalCents).toBe(15000);
    expect(summary.salesByDay.reduce((s, d) => s + d.totalCents, 0)).toBe(18000);
    expect(summary.salesByDay.filter((d) => d.totalCents === 0).length).toBeGreaterThanOrEqual(27);
  });

  it("HU-27: ventas por categoría y top 5 por unidades sin pedidos cancelados ni pendientes", () => {
    expect(summary.salesByCategory).toEqual(
      expect.arrayContaining([{ name: "Celulares", totalCents: 300 }, { name: "Laptops", totalCents: 100 }]),
    );
    expect(summary.topProducts[0]).toMatchObject({ id: ids.p3, units: 2 });
    expect(summary.topProducts.length).toBeLessThanOrEqual(5);
  });

  it("HU-27: últimos 5 pedidos del más nuevo al más antiguo con cliente", () => {
    expect(summary.latestOrders).toHaveLength(5);
    expect(summary.latestOrders.at(-1)!.number).toBe("RC-800005");
    expect(summary.latestOrders[0]!.customerEmail).toMatch(/@prueba\.pe$/);
  });

  it("SC-004: con el Worker iniciado responde en menos de 2 s", () => {
    expect(ms).toBeLessThan(2000);
  });
});
