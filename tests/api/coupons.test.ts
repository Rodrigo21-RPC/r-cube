import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { limaToday } from "@shared/coupon";
import { taxableBase } from "@shared/money";
import type { AdminOrderDetail } from "@shared/admin-types";
import type { CartQuote, OrderDetail } from "@shared/types";
import { expirePendingOrders } from "@worker/cron";
import { api, ids, placeOrder, resetDb, rowsOf, signInAdmin, signUp, withDb } from "./helpers";

let u: Awaited<ReturnType<typeof signUp>>;

const day = (days: number) => new Date(new Date(`${limaToday()}T12:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);

async function addCoupon(code: string, o: { kind?: "percent" | "fixed"; value?: number; start?: number; end?: number; max?: number; used?: number; active?: boolean } = {}) {
  await withDb((db) =>
    db.execute(sql`insert into coupon (id, code, kind, value, starts_on, ends_on, max_uses, used_count, active)
      values (${`c-${code}`}, ${code}, ${o.kind ?? "percent"}, ${o.value ?? 10}, ${day(o.start ?? -1)}, ${day(o.end ?? 30)}, ${o.max ?? 50}, ${o.used ?? 0}, ${o.active ?? true})`),
  );
}

beforeEach(async () => {
  await resetDb();
  u = await signUp();
  await addCoupon("BIENVENIDO10");
});

const usedCount = async (code = "BIENVENIDO10") => Number((await rowsOf(sql`select used_count from coupon where code = ${code}`))[0]!.used_count);
const putP3 = (cookie = u.cookie) => api(`/cart/items/${ids.p3}`, { method: "PUT", cookie, json: { quantity: 1 } });
const quote = async (coupon?: string, cookie = u.cookie) => (await (await api(`/cart${coupon ? `?coupon=${encodeURIComponent(coupon)}` : ""}`, { cookie })).json()) as CartQuote;

describe("HU-49, FR-021, FR-022: cotización con cupón", () => {
  beforeEach(async () => {
    await putP3();
  });

  it("HU-49: un porcentaje descuenta de los productos, sin distinguir mayúsculas, y el desglose cumple RN-04 y RN-14", async () => {
    const q = await quote("bienvenido10");
    expect(q.coupon).toEqual({ code: "BIENVENIDO10", kind: "percent", value: 10, discountCents: 29990 });
    expect(q.couponError).toBeNull();
    expect(q.totals).toMatchObject({ subtotalCents: 299900, discountCents: 29990, totalCents: 269910 });
    expect(q.totals.taxableBaseCents).toBe(taxableBase(269910));
    expect(q.totals.taxableBaseCents + q.totals.igvCents).toBe(269910);
  });

  it("HU-49: un monto fijo descuenta ese monto", async () => {
    await addCoupon("MENOS5", { kind: "fixed", value: 500 });
    expect((await quote("MENOS5")).totals).toMatchObject({ discountCents: 500, totalCents: 299400 });
  });

  it("FR-022: el descuento nunca deja los productos por debajo de S/ 1.00", async () => {
    await addCoupon("ENORME", { kind: "fixed", value: 99_999_999 });
    expect((await quote("ENORME")).totals).toMatchObject({ discountCents: 299800, totalCents: 100 });
  });

  it("HU-49: cada motivo de rechazo trae su mensaje y el total no cambia", async () => {
    await addCoupon("APAGADO", { active: false });
    await addCoupon("FUTURO", { start: 3, end: 10 });
    await addCoupon("VENCIDO", { start: -20, end: -1 });
    await addCoupon("AGOTADO", { max: 2, used: 2 });
    const cases: [string, string, string][] = [
      ["NOEXISTE", "COUPON_NOT_FOUND", "El cupón no existe"],
      ["APAGADO", "COUPON_INACTIVE", "El cupón no está activo"],
      ["FUTURO", "COUPON_NOT_STARTED", "El cupón aún no está vigente"],
      ["VENCIDO", "COUPON_EXPIRED", "El cupón venció"],
      ["AGOTADO", "COUPON_EXHAUSTED", "El cupón ya no tiene usos"],
    ];
    for (const [code, errorCode, message] of cases) {
      const q = await quote(code);
      expect(q.coupon, code).toBeNull();
      expect(q.couponError, code).toEqual({ code: errorCode, message });
      expect(q.totals.totalCents, code).toBe(299900);
    }
  });

  it("HU-49: un cupón que vence hoy todavía vale", async () => {
    await addCoupon("HOY", { start: -3, end: 0 });
    expect((await quote("HOY")).coupon).toMatchObject({ code: "HOY" });
  });

  it("clarificación: con el carrito vacío el cupón no se aplica", async () => {
    await api(`/cart/items/${ids.p3}`, { method: "DELETE", cookie: u.cookie });
    const q = await quote("BIENVENIDO10");
    expect(q.coupon).toBeNull();
    expect(q.couponError).toBeNull();
  });

  it("HU-49: el visitante cotiza sin cupón aunque lo envíe", async () => {
    const res = await api("/cart/quote", { method: "POST", json: { items: [{ productId: ids.p3, quantity: 1 }], coupon: "BIENVENIDO10" } });
    const q = (await res.json()) as CartQuote;
    expect(q.coupon).toBeNull();
    expect(q.totals.totalCents).toBe(299900);
  });
});

describe("HU-49, RN-02, RN-04, RN-07: pedido con cupón", () => {
  it("HU-49: el pedido guarda código y descuento, consume un uso y el envío no se descuenta", async () => {
    const { status, number, body } = await placeOrder(u.cookie, [{ productId: ids.p3 }], { couponCode: "bienvenido10", delivery: "delivery" });
    expect(status).toBe(201);
    const o = (body as { order: OrderDetail }).order;
    expect(o.couponCode).toBe("BIENVENIDO10");
    expect(o.totals).toMatchObject({ subtotalCents: 299900, shippingCents: 1500, discountCents: 29990, totalCents: 299900 + 1500 - 29990 });
    expect(o.totals.taxableBaseCents + o.totals.igvCents).toBe(o.totals.totalCents);
    expect(await usedCount()).toBe(1);
    expect((await rowsOf(sql`select amount_cents from payment`))[0]).toMatchObject({ amount_cents: o.totals.totalCents });
    // RN-07: cambiar el cupón después no altera el pedido.
    await withDb((db) => db.execute(sql`update coupon set value = 50 where code = 'BIENVENIDO10'`));
    const saved = (await (await api(`/orders/${number}`, { cookie: u.cookie })).json()) as OrderDetail;
    expect(saved).toMatchObject({ couponCode: "BIENVENIDO10", totals: { discountCents: 29990 } });
  });

  it("RN-02: si el pedido falla por precio o por stock, el uso del cupón no se consume", async () => {
    await putP3();
    const price = await api("/checkout/orders", {
      method: "POST", cookie: u.cookie,
      json: { delivery: { method: "pickup" }, payment: { method: "transfer" }, expectedTotalCents: 1, couponCode: "BIENVENIDO10" },
    });
    expect(price.status).toBe(409);
    expect(await usedCount()).toBe(0);
    await withDb((db) => db.execute(sql`update product set stock = 0 where id = ${ids.p3}`));
    const stock = await api("/checkout/orders", {
      method: "POST", cookie: u.cookie,
      json: { delivery: { method: "pickup" }, payment: { method: "transfer" }, expectedTotalCents: 269910, couponCode: "BIENVENIDO10" },
    });
    expect(stock.status).toBe(409);
    expect(await usedCount()).toBe(0);
    expect(await rowsOf(sql`select 1 from orders`)).toEqual([]);
  });

  it("HU-49: un cupón inválido al pagar responde 409 con su código y no crea pedido", async () => {
    await addCoupon("VENCIDO", { start: -20, end: -1 });
    const { status, body } = await placeOrder(u.cookie, [{ productId: ids.p3 }], { couponCode: "VENCIDO", expectedTotalCents: 299900 });
    expect(status).toBe(409);
    expect((body as unknown as { error: { code: string; message: string } }).error).toMatchObject({ code: "COUPON_EXPIRED", message: "El cupón venció" });
    expect(await rowsOf(sql`select 1 from orders`)).toEqual([]);
    const unknown = await placeOrder(u.cookie, [{ productId: ids.p3 }], { couponCode: "NOEXISTE", expectedTotalCents: 299900 });
    expect((unknown.body as unknown as { error: { code: string } }).error.code).toBe("COUPON_NOT_FOUND");
  });

  it("SC-004, RN-02: dos pagos a la vez por el último uso: uno 201 y otro 409 COUPON_EXHAUSTED", async () => {
    await addCoupon("ULTIMO", { max: 1 });
    const other = await signUp();
    for (const c of [u.cookie, other.cookie]) await putP3(c);
    const buy = (cookie: string) =>
      api("/checkout/orders", {
        method: "POST", cookie,
        json: { delivery: { method: "pickup" }, payment: { method: "transfer" }, expectedTotalCents: 269910, couponCode: "ULTIMO" },
      });
    const results = await Promise.all([buy(u.cookie), buy(other.cookie)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const loser = results.find((r) => r.status === 409)!;
    expect(((await loser.json()) as { error: { code: string } }).error.code).toBe("COUPON_EXHAUSTED");
    expect(await usedCount("ULTIMO")).toBe(1);
    expect(await rowsOf(sql`select 1 from orders`)).toHaveLength(1);
    expect(Number((await rowsOf(sql`select stock from product where id = ${ids.p3}`))[0]!.stock)).toBe(2); // el perdedor no descontó stock
  });
});

describe("HU-49, FR-024: devolución del uso al cancelar", () => {
  async function pending() {
    const { number } = await placeOrder(u.cookie, [{ productId: ids.p3 }], { couponCode: "BIENVENIDO10" });
    expect(await usedCount()).toBe(1);
    return number!;
  }

  it("el cliente cancela su pedido", async () => {
    const number = await pending();
    expect((await api(`/orders/${number}/cancel`, { method: "POST", cookie: u.cookie, json: { reason: "no_lo_necesito" } })).status).toBe(200);
    expect(await usedCount()).toBe(0);
  });

  it("el administrador rechaza el pago", async () => {
    const number = await pending();
    const admin = await signInAdmin();
    const res = await api(`/admin/orders/${number}/payment/reject`, { method: "POST", cookie: admin.cookie, json: { reason: "Código inexistente" } });
    expect(res.status).toBe(200);
    expect(await usedCount()).toBe(0);
  });

  it("el administrador cancela el pedido", async () => {
    const number = await pending();
    const admin = await signInAdmin();
    const res = await api(`/admin/orders/${number}/status`, { method: "POST", cookie: admin.cookie, json: { to: "cancelled", expectedStatus: "pending_payment", reason: "Sin stock real" } });
    expect(res.status).toBe(200);
    expect(await usedCount()).toBe(0);
  });

  it("el pedido vence a las 24 h", async () => {
    await pending();
    await withDb((db) => db.execute(sql`update orders set created_at = now() - interval '25 hours'`));
    expect(await withDb((db) => expirePendingOrders(db))).toBe(1);
    expect(await usedCount()).toBe(0);
  });

  it("cancelar un pedido sin cupón no toca ningún cupón", async () => {
    const { number } = await placeOrder(u.cookie, [{ productId: ids.p3 }]);
    await addCoupon("OTRO", { used: 3 });
    await api(`/orders/${number}/cancel`, { method: "POST", cookie: u.cookie, json: { reason: "no_lo_necesito" } });
    expect(await usedCount("OTRO")).toBe(3);
  });
});

describe("HU-49: el panel muestra el cupón", () => {
  it("el detalle del pedido del panel trae el código y el descuento", async () => {
    const { number } = await placeOrder(u.cookie, [{ productId: ids.p3 }], { couponCode: "BIENVENIDO10" });
    const admin = await signInAdmin();
    const d = (await (await api(`/admin/orders/${number}`, { cookie: admin.cookie })).json()) as AdminOrderDetail;
    expect(d).toMatchObject({ couponCode: "BIENVENIDO10", totals: { discountCents: 29990 } });
  });
});
