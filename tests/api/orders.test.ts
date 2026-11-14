import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { OrderDetail, OrderSummary } from "@shared/types";
import { api, ids, resetDb, signUp, withDb } from "./helpers";

beforeEach(resetDb);

type Row = Record<string, unknown>;
const rows = (q: ReturnType<typeof sql>) => withDb(async (db) => (await db.execute(q)) as unknown as Row[]);
const stockOf = async (id: string) => Number((await rows(sql`select stock from product where id = ${id}`))[0]!.stock);

async function buy(cookie: string, productId = ids.p3, quantity = 1, payment: Record<string, unknown> = { method: "transfer" }) {
  await api(`/cart/items/${productId}`, { method: "PUT", cookie, json: { quantity } });
  const cart = (await (await api("/cart", { cookie })).json()) as { totals: { totalCents: number } };
  const res = await api("/checkout/orders", {
    method: "POST",
    cookie,
    json: { delivery: { method: "pickup" }, payment, expectedTotalCents: cart.totals.totalCents },
  });
  return ((await res.json()) as { order: OrderDetail }).order;
}

const setStatus = (number: string, status: string) =>
  withDb((db) => db.execute(sql`update orders set status = ${status} where number = ${number}`));

describe("HU-22: lista de mis pedidos", () => {
  it("HU-22, RN-08: solo los propios, del más nuevo al más antiguo", async () => {
    const a = await signUp();
    const b = await signUp();
    const first = await buy(a.cookie);
    await withDb((db) => db.execute(sql`update orders set created_at = now() - interval '1 day' where number = ${first.number}`));
    const second = await buy(a.cookie, ids.p10);
    await buy(b.cookie);
    const res = (await (await api("/orders", { cookie: a.cookie })).json()) as { items: OrderSummary[]; total: number };
    expect(res.total).toBe(2);
    expect(res.items.map((o) => o.number)).toEqual([second.number, first.number]);
    expect(res.items[0]).toMatchObject({ status: "pending_payment", totalCents: 499900 });
  });

  it("HU-22: sin sesión 401", async () => {
    expect((await api("/orders")).status).toBe(401);
  });
});

describe("HU-23: detalle con línea de tiempo", () => {
  it("HU-23: muestra productos, montos, pago, entrega y eventos", async () => {
    const u = await signUp();
    const o = await buy(u.cookie, ids.p10, 1, { method: "card", cardNumber: "4111111111111111", expMonth: 12, expYear: 2030, cvv: "123" });
    const d = (await (await api(`/orders/${o.number}`, { cookie: u.cookie })).json()) as OrderDetail;
    expect(d.items[0]).toMatchObject({ name: "iPhone 15 Pro", quantity: 1, unitPriceCents: 499900 });
    expect(d.payment).toMatchObject({ method: "card", cardLast4: "1111" });
    expect(d.events).toEqual([expect.objectContaining({ fromStatus: null, toStatus: "paid", actor: "cliente" })]);
    expect(d.canCancel).toBe(true);
  });

  it("RN-08: un pedido ajeno responde 404", async () => {
    const a = await signUp();
    const b = await signUp();
    const o = await buy(a.cookie);
    expect((await api(`/orders/${o.number}`, { cookie: b.cookie })).status).toBe(404);
    expect((await api(`/orders/${o.number}/cancel`, { method: "POST", cookie: b.cookie, json: { reason: "otro", detail: "x" } })).status).toBe(404);
  });

  it("RN-06, RN-07: el detalle conserva nombre y precio aunque el producto se desactive", async () => {
    const u = await signUp();
    const o = await buy(u.cookie, ids.p10);
    await withDb((db) => db.execute(sql`update product set active = false, price_cents = 1 where id = ${ids.p10}`));
    const d = (await (await api(`/orders/${o.number}`, { cookie: u.cookie })).json()) as OrderDetail;
    expect(d.items[0]).toMatchObject({ name: "iPhone 15 Pro", unitPriceCents: 499900 });
  });
});

describe("HU-24: cancelar un pedido", () => {
  it.each(["pending_payment", "paid", "preparing"])("HU-24, RN-10: desde %s devuelve el stock y registra el motivo", async (status) => {
    const u = await signUp();
    const o = await buy(u.cookie, ids.p3, 2);
    await setStatus(o.number, status);
    expect(await stockOf(ids.p3)).toBe(1);
    const res = await api(`/orders/${o.number}/cancel`, { method: "POST", cookie: u.cookie, json: { reason: "no_lo_necesito" } });
    expect(res.status).toBe(200);
    const d = (await res.json()) as OrderDetail;
    expect(d.status).toBe("cancelled");
    expect(d.canCancel).toBe(false);
    expect(d.events.at(-1)).toMatchObject({ toStatus: "cancelled", actor: "cliente", reason: "Ya no lo necesito" });
    expect(await stockOf(ids.p3)).toBe(3);
  });

  it.each(["shipped", "delivered", "cancelled"])("HU-24: desde %s responde 409 INVALID_TRANSITION", async (status) => {
    const u = await signUp();
    const o = await buy(u.cookie);
    await setStatus(o.number, status);
    const res = await api(`/orders/${o.number}/cancel`, { method: "POST", cookie: u.cookie, json: { reason: "me_equivoque" } });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("INVALID_TRANSITION");
  });

  it("HU-24: el motivo «otro» exige detalle", async () => {
    const u = await signUp();
    const o = await buy(u.cookie);
    expect((await api(`/orders/${o.number}/cancel`, { method: "POST", cookie: u.cookie, json: { reason: "otro" } })).status).toBe(400);
    const ok = await api(`/orders/${o.number}/cancel`, { method: "POST", cookie: u.cookie, json: { reason: "otro", detail: "Lo compré en tienda" } });
    expect(((await ok.json()) as OrderDetail).events.at(-1)!.reason).toBe("Otro: Lo compré en tienda");
  });
});
