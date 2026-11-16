import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { OrderDetail, Receipt } from "@shared/types";
import { api, ids, iphoneVariants, placeOrder, resetDb, signUp, withDb } from "./helpers";

let u: Awaited<ReturnType<typeof signUp>>;
beforeEach(async () => {
  await resetDb();
  u = await signUp({ name: "Ana Pérez", email: "ana@prueba.pe" });
});

const receipt = (number: string, cookie: string | undefined = u.cookie) => api(`/orders/${number}/receipt`, { cookie });

describe("HU-52, FR-027: comprobante de un pedido", () => {
  it("HU-52: devuelve el pedido con los datos de la tienda y del cliente", async () => {
    const { number } = await placeOrder(u.cookie, [{ productId: ids.p3 }], { delivery: "delivery" });
    const res = await receipt(number!);
    expect(res.status).toBe(200);
    const r = (await res.json()) as Receipt;
    expect(r).toMatchObject({
      number,
      status: "pending_payment",
      store: { name: "R Cube", whatsappNumber: "51987654321", pickupAddress: "Av. Ejemplo 123, Miraflores, Lima" },
      customer: { name: "Ana Pérez", email: "ana@prueba.pe", phone: "987654321" },
      shipping: { address: "Av. Larco 123", district: "Miraflores" },
    });
    expect(r.items).toEqual([expect.objectContaining({ name: "Galaxy S23", quantity: 1, unitPriceCents: 299900, lineTotalCents: 299900 })]);
  });

  it("HU-52, RN-04, RN-14: incluye variante, cupón, envío, total, base imponible e IGV con los montos congelados", async () => {
    await iphoneVariants();
    await withDb((db) =>
      db.execute(sql`insert into coupon (id, code, kind, value, starts_on, ends_on, max_uses) values ('c1', 'BIENVENIDO10', 'percent', 10, '2020-01-01', '2999-12-31', 50)`),
    );
    const { number } = await placeOrder(u.cookie, [{ productId: ids.p10, variantId: ids.variants.v256, quantity: 2 }], {
      delivery: "delivery",
      couponCode: "BIENVENIDO10",
      payment: { method: "card", cardNumber: "4111111111111111", expMonth: 12, expYear: 2030, cvv: "123" },
    });
    const before = (await (await receipt(number!)).json()) as Receipt;
    expect(before.items[0]).toMatchObject({ variantLabel: "256 GB · Negro", sku: "IP15-256-NG", quantity: 2 });
    expect(before.couponCode).toBe("BIENVENIDO10");
    expect(before.totals).toMatchObject({ subtotalCents: 999800, shippingCents: 1500, discountCents: 99980, totalCents: 999800 + 1500 - 99980 });
    expect(before.totals.taxableBaseCents + before.totals.igvCents).toBe(before.totals.totalCents);
    expect(before.payment).toMatchObject({ method: "card", cardLast4: "1111", status: "approved" });
    expect(JSON.stringify(before)).not.toMatch(/4111111111111111/); // nunca el número completo (RNF-06)

    // RN-07: cambiar precios o el cupón después no altera el comprobante.
    await withDb((db) => db.execute(sql`update product_variant set price_cents = 1000; update coupon set value = 50`));
    expect(((await (await receipt(number!)).json()) as Receipt).totals).toEqual(before.totals);
  });

  it("HU-52: un pedido Pendiente de pago o Cancelado muestra su estado real", async () => {
    const { number } = await placeOrder(u.cookie, [{ productId: ids.p3 }]);
    expect(((await (await receipt(number!)).json()) as Receipt).status).toBe("pending_payment");
    await api(`/orders/${number}/cancel`, { method: "POST", cookie: u.cookie, json: { reason: "no_lo_necesito" } });
    const cancelled = (await (await receipt(number!)).json()) as Receipt;
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.payment.status).not.toBe("approved");
  });

  it("HU-52: coincide con el detalle del pedido", async () => {
    const { number } = await placeOrder(u.cookie, [{ productId: ids.p3 }]);
    const r = (await (await receipt(number!)).json()) as Receipt;
    const o = (await (await api(`/orders/${number}`, { cookie: u.cookie })).json()) as OrderDetail;
    expect(r.totals).toEqual(o.totals);
    expect(r.items).toEqual(o.items);
  });
});

describe("HU-52, FR-028, RN-08: acceso", () => {
  it("el pedido de otro cliente responde 404, sin datos", async () => {
    const { number } = await placeOrder(u.cookie, [{ productId: ids.p3 }]);
    const other = await signUp();
    const res = await receipt(number!, other.cookie);
    expect(res.status).toBe(404);
    expect(JSON.stringify(await res.json())).not.toContain("ana@prueba.pe");
  });

  it("un pedido inexistente responde 404 y sin sesión 401", async () => {
    expect((await receipt("RC-999999")).status).toBe(404);
    expect((await api("/orders/RC-000001/receipt")).status).toBe(401);
  });
});
