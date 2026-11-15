import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { applyStockChange } from "@worker/services/stock";
import { api, ids, resetDb, rowsOf, signUp, withDb } from "../helpers";

beforeEach(resetDb);

const stockOf = async (id: string) => Number((await rowsOf(sql`select stock from product where id = ${id}`))[0]!.stock);
const movements = (id: string) =>
  rowsOf(sql`select m.delta, m.stock_before, m.stock_after, m.source, m.reason, o.number
    from stock_movement m left join orders o on o.id = m.order_id where m.product_id = ${id} order by m.created_at`);

describe("HU-33, FR-011, FR-012: applyStockChange", () => {
  it("HU-33: registra stock anterior y nuevo en el mismo cambio", async () => {
    await withDb((db) =>
      db.transaction((tx) =>
        applyStockChange(tx, { productId: ids.p3, delta: 5, source: "ajuste", reason: "Llegada", actor: { type: "sistema", userId: null } }),
      ),
    );
    expect(await stockOf(ids.p3)).toBe(8);
    expect(await movements(ids.p3)).toEqual([
      expect.objectContaining({ delta: 5, stock_before: 3, stock_after: 8, source: "ajuste", reason: "Llegada" }),
    ]);
  });

  it("FR-012: no deja el stock negativo ni registra nada", async () => {
    await expect(
      withDb((db) =>
        db.transaction((tx) =>
          applyStockChange(tx, { productId: ids.p3, delta: -4, source: "ajuste", reason: "Merma", actor: { type: "sistema", userId: null } }),
        ),
      ),
    ).rejects.toMatchObject({ code: "NEGATIVE_STOCK" });
    expect(await stockOf(ids.p3)).toBe(3);
    expect(await movements(ids.p3)).toEqual([]);
  });
});

describe("FR-013: ventas y cancelaciones registran movimientos", () => {
  it("FR-013: una compra registra venta y su cancelación registra cancelación, con el N.º de pedido", async () => {
    const u = await signUp();
    await api(`/cart/items/${ids.p3}`, { method: "PUT", cookie: u.cookie, json: { quantity: 2 } });
    const res = await api("/checkout/orders", {
      method: "POST",
      cookie: u.cookie,
      json: { delivery: { method: "pickup" }, payment: { method: "transfer" }, expectedTotalCents: 2 * 299900 },
    });
    const { order } = (await res.json()) as { order: { number: string } };
    await api(`/orders/${order.number}/cancel`, { method: "POST", cookie: u.cookie, json: { reason: "no_lo_necesito" } });
    expect(await movements(ids.p3)).toEqual([
      expect.objectContaining({ delta: -2, stock_before: 3, stock_after: 1, source: "venta", number: order.number }),
      expect.objectContaining({ delta: 2, stock_before: 1, stock_after: 3, source: "cancelacion", number: order.number }),
    ]);
    const sum = await withDb(async (db) =>
      Number(((await db.execute(sql`select coalesce(sum(delta),0) s from stock_movement where product_id = ${ids.p3}`)) as unknown as { s: string }[])[0]!.s),
    );
    expect(3 + sum).toBe(await stockOf(ids.p3));
  });
});
