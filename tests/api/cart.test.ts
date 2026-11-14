import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { CartQuote } from "@shared/types";
import { taxableBase } from "@shared/money";
import { api, ids, resetDb, signUp, withDb } from "./helpers";

beforeEach(resetDb);

const quote = async (items: unknown) =>
  (await (await api("/cart/quote", { method: "POST", json: { items } })).json()) as CartQuote;

describe("HU-11: carrito con totales del servidor", () => {
  it("HU-11: subtotal por línea y total con desglose de IGV", async () => {
    const q = await quote([{ productId: ids.p10, quantity: 2 }, { productId: ids.p3, quantity: 1 }]);
    expect(q.lines.map((l) => [l.productId, l.quantity, l.lineTotalCents])).toEqual([
      [ids.p10, 2, 999800],
      [ids.p3, 1, 299900],
    ]);
    expect(q.totals.subtotalCents).toBe(1299700);
    expect(q.totals.totalCents).toBe(1299700);
    expect(q.totals.taxableBaseCents).toBe(taxableBase(1299700));
    expect(q.totals.igvCents).toBe(1299700 - taxableBase(1299700));
    expect(q.warnings).toEqual([]);
  });

  it("RN-01: la cantidad se limita al stock y avisa", async () => {
    const q = await quote([{ productId: ids.p3, quantity: 9 }]);
    expect(q.lines[0]).toMatchObject({ quantity: 3, maxQuantity: 3 });
    expect(q.warnings).toEqual([expect.objectContaining({ productId: ids.p3, type: "stock_reduced" })]);
  });

  it("RNF-07: ignora precios enviados por el navegador", async () => {
    const q = await quote([{ productId: ids.p10, quantity: 1, unitPriceCents: 1 }]);
    expect(q.lines[0]!.unitPriceCents).toBe(499900);
  });

  it("HU-13: agotados, inactivos o inexistentes quedan no disponibles y fuera del total", async () => {
    const q = await quote([
      { productId: ids.p0, quantity: 1 },
      { productId: ids.pOff, quantity: 1 },
      { productId: "no-existe", quantity: 1 },
      { productId: ids.p3, quantity: 1 },
    ]);
    expect(q.lines.filter((l) => !l.available).map((l) => l.productId).sort()).toEqual([ids.p0, ids.pOff].sort());
    expect(q.totals.totalCents).toBe(299900);
    expect(q.warnings.filter((w) => w.type === "unavailable")).toHaveLength(3);
  });

  it("HU-13: el carrito de la cuenta avisa cuando cambió el precio desde que se agregó", async () => {
    const u = await signUp();
    await api(`/cart/items/${ids.p10}`, { method: "PUT", cookie: u.cookie, json: { quantity: 1 } });
    await withDb((db) => db.execute(sql`update product set price_cents = 459900 where id = ${ids.p10}`));
    const q = (await (await api("/cart", { cookie: u.cookie })).json()) as CartQuote;
    expect(q.lines[0]!.unitPriceCents).toBe(459900);
    expect(q.warnings).toEqual([expect.objectContaining({ type: "price_changed", productId: ids.p10 })]);
    const again = (await (await api("/cart", { cookie: u.cookie })).json()) as CartQuote;
    expect(again.warnings).toEqual([]);
  });

  it("HU-11: cantidades inválidas responden 400", async () => {
    expect((await api("/cart/quote", { method: "POST", json: { items: [{ productId: ids.p3, quantity: 0 }] } })).status).toBe(400);
  });
});

describe("HU-12: carrito de la cuenta y fusión", () => {
  it("HU-12: PUT y DELETE sobre el carrito de la cuenta, con límite de stock", async () => {
    const u = await signUp();
    expect((await api(`/cart/items/${ids.p3}`, { method: "PUT", cookie: u.cookie, json: { quantity: 5 } })).status).toBe(200);
    let q = (await (await api("/cart", { cookie: u.cookie })).json()) as CartQuote;
    expect(q.lines[0]!.quantity).toBe(3);
    await api(`/cart/items/${ids.p3}`, { method: "DELETE", cookie: u.cookie });
    q = (await (await api("/cart", { cookie: u.cookie })).json()) as CartQuote;
    expect(q.lines).toEqual([]);
  });

  it("HU-12: la fusión suma cantidades sin duplicar productos y respeta el stock", async () => {
    const u = await signUp();
    await api(`/cart/items/${ids.p10}`, { method: "PUT", cookie: u.cookie, json: { quantity: 2 } });
    await api(`/cart/items/${ids.p3}`, { method: "PUT", cookie: u.cookie, json: { quantity: 2 } });
    const res = await api("/cart/merge", {
      method: "POST",
      cookie: u.cookie,
      json: { items: [{ productId: ids.p10, quantity: 1 }, { productId: ids.p3, quantity: 5 }] },
    });
    expect(res.status).toBe(200);
    const q = (await res.json()) as CartQuote;
    expect(q.lines.map((l) => [l.productId, l.quantity])).toEqual([
      [ids.p10, 3],
      [ids.p3, 3],
    ]);
  });

  it("HU-12: el carrito de la cuenta exige sesión", async () => {
    expect((await api("/cart")).status).toBe(401);
  });
});
