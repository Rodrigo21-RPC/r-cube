import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { CheckoutOptions, OrderDetail } from "@shared/types";
import { taxableBase } from "@shared/money";
import { api, ids, makeAdmin, resetDb, signUp, withDb } from "./helpers";

beforeEach(resetDb);

type Row = Record<string, unknown>;
const rows = (q: ReturnType<typeof sql>) => withDb(async (db) => (await db.execute(q)) as unknown as Row[]);
const stockOf = async (id: string) => Number((await rows(sql`select stock from product where id = ${id}`))[0]!.stock);

const pickup = { method: "pickup" };
const delivery = { method: "delivery", zoneId: ids.zone, name: "Ana Pérez", phone: "987654321", address: "Av. Larco 743", district: "Miraflores", reference: "" };
const goodCard = { method: "card", cardNumber: "4111 1111 1111 1111", expMonth: 12, expYear: 2030, cvv: "123" };

async function customerWithCart(items: [string, number][] = [[ids.p10, 1]]) {
  const u = await signUp();
  for (const [id, q] of items) await api(`/cart/items/${id}`, { method: "PUT", cookie: u.cookie, json: { quantity: q } });
  return u;
}

async function order(cookie: string, body: Record<string, unknown>) {
  const cart = (await (await api("/cart", { cookie })).json()) as { totals: { totalCents: number } };
  const zoneCost = (body.delivery as { method: string }).method === "delivery" ? 1500 : 0;
  return api("/checkout/orders", {
    method: "POST",
    cookie,
    json: { expectedTotalCents: cart.totals.totalCents + zoneCost, ...body },
  });
}

describe("FR-016: acceso al checkout", () => {
  it("FR-016: sin sesión 401 y administrador 403", async () => {
    expect((await api("/checkout/options")).status).toBe(401);
    const u = await signUp();
    await makeAdmin(u.user.id);
    const res = await api("/checkout/options", { cookie: u.cookie });
    expect(res.status).toBe(403);
  });

  it("HU-14, HU-17, HU-18: opciones con zonas activas, métodos, datos de pago y dirección del perfil", async () => {
    const u = await signUp();
    const o = (await (await api("/checkout/options", { cookie: u.cookie })).json()) as CheckoutOptions;
    expect(o.zones).toEqual([{ id: ids.zone, name: "Lima Centro", costCents: 1500 }]);
    expect(o.methods).toEqual(["card", "yape_plin", "transfer", "whatsapp"]);
    expect(o.yape.number).toBe("987654321");
    expect(o.bank.cci).toBe("00219100000000000000");
    expect(o.address.phone).toBe("987654321");
  });
});

describe("HU-14, HU-15: entrega", () => {
  it("HU-14: recojo en tienda sin costo de envío", async () => {
    const u = await customerWithCart();
    const res = await order(u.cookie, { delivery: pickup, payment: goodCard });
    expect(res.status).toBe(201);
    const { order: o } = (await res.json()) as { order: OrderDetail };
    expect(o.totals.shippingCents).toBe(0);
    expect(o.deliveryMethod).toBe("pickup");
    expect(o.pickupAddress).toContain("Miraflores");
  });

  it("HU-14: delivery suma el costo fijo de la zona", async () => {
    const u = await customerWithCart();
    const { order: o } = (await (await order(u.cookie, { delivery, payment: goodCard })).json()) as { order: OrderDetail };
    expect(o.totals.shippingCents).toBe(1500);
    expect(o.totals.totalCents).toBe(499900 + 1500);
    expect(o.zoneName).toBe("Lima Centro");
  });

  it("HU-15: delivery exige nombre, teléfono, dirección y distrito", async () => {
    const u = await customerWithCart();
    const res = await order(u.cookie, { delivery: { method: "delivery", zoneId: ids.zone, name: "", phone: "1", address: "", district: "" }, payment: goodCard });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { fields: Record<string, string> } };
    expect(Object.keys(body.error.fields)).toEqual(
      expect.arrayContaining(["delivery.name", "delivery.phone", "delivery.address", "delivery.district"]),
    );
  });

  it("Edge: una zona desactivada responde 400 y pide elegir otra", async () => {
    const u = await customerWithCart();
    const res = await order(u.cookie, { delivery: { ...delivery, zoneId: ids.zoneOff }, payment: goodCard });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { fields: Record<string, string> } }).error.fields["delivery.zoneId"]).toMatch(/otra zona/);
  });
});

describe("HU-16: tarjeta simulada", () => {
  it("HU-16, HU-21: 4111 aprueba, el pedido queda Pagado y el stock baja", async () => {
    const u = await customerWithCart([[ids.p10, 2]]);
    const res = await order(u.cookie, { delivery: pickup, payment: goodCard });
    expect(res.status).toBe(201);
    const { order: o } = (await res.json()) as { order: OrderDetail };
    expect(o.status).toBe("paid");
    expect(o.number).toBe("RC-000001");
    expect(o.payment).toMatchObject({ method: "card", cardLast4: "1111" });
    expect(await stockOf(ids.p10)).toBe(8);
  });

  it("RNF-06: nunca se guarda el número completo ni el CVV", async () => {
    const u = await customerWithCart();
    await order(u.cookie, { delivery: pickup, payment: { ...goodCard, cvv: "987" } });
    const dump = JSON.stringify(await rows(sql`select * from payment`)) + JSON.stringify(await rows(sql`select * from orders`));
    expect(dump).not.toContain("4111111111111111");
    expect(dump).not.toContain("4111 1111 1111 1111");
    expect(dump).not.toContain("987");
  });

  it("HU-16: 4000…0002 rechaza con 402, sin pedido, sin cambio de stock y con el carrito intacto", async () => {
    const u = await customerWithCart();
    const res = await order(u.cookie, { delivery: pickup, payment: { ...goodCard, cardNumber: "4000 0000 0000 0002" } });
    expect(res.status).toBe(402);
    expect((await rows(sql`select id from orders`)).length).toBe(0);
    expect(await stockOf(ids.p10)).toBe(10);
    expect((await rows(sql`select id from cart_item`)).length).toBe(1);
  });

  it("HU-16: tarjeta con datos inválidos responde 400 por campo", async () => {
    const u = await customerWithCart();
    const res = await order(u.cookie, { delivery: pickup, payment: { ...goodCard, cvv: "1" } });
    expect(res.status).toBe(400);
  });
});

describe("HU-17, HU-18, HU-20: pagos pendientes", () => {
  it("HU-17: Yape exige código de 6 a 12 dígitos y deja el pedido Pendiente de pago", async () => {
    const u = await customerWithCart();
    expect((await order(u.cookie, { delivery: pickup, payment: { method: "yape_plin", operationCode: "12" } })).status).toBe(400);
    expect((await order(u.cookie, { delivery: pickup, payment: { method: "yape_plin" } })).status).toBe(400);
    const res = await order(u.cookie, { delivery: pickup, payment: { method: "yape_plin", operationCode: "12345678" } });
    expect(res.status).toBe(201);
    const { order: o } = (await res.json()) as { order: OrderDetail };
    expect(o.status).toBe("pending_payment");
    expect(o.payment.operationCode).toBe("12345678");
  });

  it("HU-18: transferencia con número de operación opcional queda Pendiente de pago", async () => {
    const u = await customerWithCart();
    const res = await order(u.cookie, { delivery: pickup, payment: { method: "transfer" } });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { order: OrderDetail }).order.status).toBe("pending_payment");
  });

  it("HU-20: WhatsApp queda Pendiente de pago y devuelve el enlace wa.me", async () => {
    const u = await customerWithCart();
    const res = await order(u.cookie, { delivery, payment: { method: "whatsapp" } });
    const body = (await res.json()) as { order: OrderDetail; whatsappUrl: string };
    expect(body.order.status).toBe("pending_payment");
    expect(body.whatsappUrl).toMatch(/^https:\/\/wa\.me\/51987654321\?text=/);
    expect(decodeURIComponent(body.whatsappUrl)).toContain(body.order.number);
  });

  it("FR-019: un método desactivado no se acepta", async () => {
    await withDb((db) => db.execute(sql`update store_settings set enabled_methods = '{card}'`));
    const u = await customerWithCart();
    expect((await order(u.cookie, { delivery: pickup, payment: { method: "transfer" } })).status).toBe(400);
  });
});

describe("HU-21, RN-01 a RN-07: integridad del pedido", () => {
  it("RN-03: números correlativos RC-000001, RC-000002", async () => {
    const u = await customerWithCart();
    const a = (await (await order(u.cookie, { delivery: pickup, payment: goodCard })).json()) as { order: OrderDetail };
    await api(`/cart/items/${ids.p10}`, { method: "PUT", cookie: u.cookie, json: { quantity: 1 } });
    const b = (await (await order(u.cookie, { delivery: pickup, payment: goodCard })).json()) as { order: OrderDetail };
    expect([a.order.number, b.order.number]).toEqual(["RC-000001", "RC-000002"]);
  });

  it("RN-04, RN-14: totales y desglose calculados en el servidor", async () => {
    const u = await customerWithCart([[ids.p10, 1], [ids.p3, 2]]);
    const { order: o } = (await (await order(u.cookie, { delivery, payment: goodCard })).json()) as { order: OrderDetail };
    const total = 499900 + 2 * 299900 + 1500;
    expect(o.totals).toMatchObject({ subtotalCents: 499900 + 599800, shippingCents: 1500, discountCents: 0, totalCents: total });
    expect(o.totals.taxableBaseCents).toBe(taxableBase(total));
    expect(o.totals.igvCents).toBe(total - taxableBase(total));
  });

  it("HU-13: si el total esperado difiere responde 409 PRICE_CHANGED sin crear pedido", async () => {
    const u = await customerWithCart();
    const res = await api("/checkout/orders", { method: "POST", cookie: u.cookie, json: { delivery: pickup, payment: goodCard, expectedTotalCents: 100 } });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("PRICE_CHANGED");
    expect((await rows(sql`select id from orders`)).length).toBe(0);
  });

  it("RN-07: el precio queda congelado en la línea del pedido", async () => {
    const u = await customerWithCart();
    const { order: o } = (await (await order(u.cookie, { delivery: pickup, payment: goodCard })).json()) as { order: OrderDetail };
    await withDb((db) => db.execute(sql`update product set price_cents = 1000, name = 'Cambiado' where id = ${ids.p10}`));
    const again = (await (await api(`/orders/${o.number}`, { cookie: u.cookie })).json()) as OrderDetail;
    expect(again.items[0]).toMatchObject({ name: "iPhone 15 Pro", unitPriceCents: 499900 });
  });

  it("HU-21: el carrito queda vacío tras crear el pedido", async () => {
    const u = await customerWithCart();
    await order(u.cookie, { delivery: pickup, payment: goodCard });
    expect((await rows(sql`select id from cart_item`)).length).toBe(0);
  });

  it("HU-21: carrito vacío responde 400", async () => {
    const u = await signUp();
    const res = await api("/checkout/orders", { method: "POST", cookie: u.cookie, json: { delivery: pickup, payment: goodCard, expectedTotalCents: 0 } });
    expect(res.status).toBe(400);
  });

  it("RN-01, RN-02: dos compras simultáneas de la última unidad: una 201 y otra 409", async () => {
    await withDb((db) => db.execute(sql`update product set stock = 1 where id = ${ids.p3}`));
    const a = await customerWithCart([[ids.p3, 1]]);
    const b = await customerWithCart([[ids.p3, 1]]);
    const [ra, rb] = await Promise.all([
      order(a.cookie, { delivery: pickup, payment: goodCard }),
      order(b.cookie, { delivery: pickup, payment: goodCard }),
    ]);
    expect([ra.status, rb.status].sort()).toEqual([201, 409]);
    const loser = ra.status === 409 ? ra : rb;
    expect(((await loser.json()) as { error: { code: string } }).error.code).toBe("STOCK");
    expect(await stockOf(ids.p3)).toBe(0);
    expect((await rows(sql`select id from orders`)).length).toBe(1);
  });
});
