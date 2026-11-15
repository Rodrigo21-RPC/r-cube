import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { AdminOrderDetail, AdminOrderRow, Page } from "@shared/admin-types";
import { api, ids, resetDb, rowsOf, signInAdmin, signUp, withDb } from "../helpers";

let admin: Awaited<ReturnType<typeof signInAdmin>>;
let numbers: { pickup: string; delivery: string; pending: string };

async function buy(cookie: string, delivery: Record<string, unknown>, payment: Record<string, unknown>) {
  await api(`/cart/items/${ids.p10}`, { method: "PUT", cookie, json: { quantity: 1 } });
  const cart = (await (await api("/cart", { cookie })).json()) as { totals: { totalCents: number } };
  const extra = delivery.method === "delivery" ? 1500 : 0;
  const res = await api("/checkout/orders", { method: "POST", cookie, json: { delivery, payment, expectedTotalCents: cart.totals.totalCents + extra } });
  return ((await res.json()) as { order: { number: string } }).order.number;
}

const card = { method: "card", cardNumber: "4111111111111111", expMonth: 12, expYear: 2030, cvv: "123" };
const delivery = { method: "delivery", zoneId: ids.zone, name: "Ana Pérez", phone: "987654321", address: "Av. Larco 743", district: "Miraflores" };

beforeEach(async () => {
  await resetDb();
  admin = await signInAdmin();
  const ana = await signUp({ name: "Ana Pérez", email: "ana@prueba.pe" });
  const luis = await signUp({ name: "Luis Rojas", email: "luis@prueba.pe" });
  numbers = {
    pickup: await buy(ana.cookie, { method: "pickup" }, card),
    delivery: await buy(luis.cookie, delivery, card),
    pending: await buy(ana.cookie, { method: "pickup" }, { method: "transfer" }),
  };
});

const list = async (qs: string) => (await (await api(`/admin/orders?${qs}`, { cookie: admin.cookie })).json()) as Page<AdminOrderRow>;
const detail = async (n: string) => (await (await api(`/admin/orders/${n}`, { cookie: admin.cookie })).json()) as AdminOrderDetail;
const change = (n: string, body: Record<string, unknown>) => api(`/admin/orders/${n}/status`, { method: "POST", cookie: admin.cookie, json: body });

describe("HU-34: lista y filtros de pedidos", () => {
  it("HU-34: filtra por estado, método, texto y fechas, del más nuevo al más antiguo", async () => {
    expect((await list("")).items.map((o) => o.number)).toEqual([numbers.pending, numbers.delivery, numbers.pickup]);
    expect((await list("status=pending_payment")).items.map((o) => o.number)).toEqual([numbers.pending]);
    expect((await list("method=card")).total).toBe(2);
    expect((await list("q=luis")).items.map((o) => o.number)).toEqual([numbers.delivery]);
    expect((await list(`q=${numbers.pickup}`)).total).toBe(1);
    expect((await list("q=ana%40prueba")).total).toBe(2);
    const today = new Date().toISOString().slice(0, 10);
    expect((await list(`from=${today}&to=${today}`)).total).toBe(3);
    expect((await list("from=2020-01-01&to=2020-01-02")).total).toBe(0);
    expect((await list("")).pageSize).toBe(20);
  });
});

describe("HU-35, FR-016, FR-017: detalle y cambio de estado", () => {
  it("HU-35: el detalle trae cliente y las transiciones permitidas según la entrega", async () => {
    const p = await detail(numbers.pickup);
    expect(p.customer).toMatchObject({ name: "Ana Pérez", email: "ana@prueba.pe" });
    expect(p.allowedTransitions.sort()).toEqual(["cancelled", "preparing"]);
    await change(numbers.pickup, { to: "preparing", expectedStatus: "paid" });
    expect((await detail(numbers.pickup)).allowedTransitions.sort()).toEqual(["cancelled", "delivered"]);
    await change(numbers.delivery, { to: "preparing", expectedStatus: "paid" });
    expect((await detail(numbers.delivery)).allowedTransitions.sort()).toEqual(["cancelled", "shipped"]);
  });

  it("HU-35: un cambio válido queda en la línea de tiempo con el administrador y en la auditoría", async () => {
    const res = await change(numbers.delivery, { to: "preparing", expectedStatus: "paid" });
    expect(res.status).toBe(200);
    const d = (await res.json()) as AdminOrderDetail;
    expect(d.status).toBe("preparing");
    expect(d.events.at(-1)).toMatchObject({ fromStatus: "paid", toStatus: "preparing", actor: "administrador" });
    expect((await rowsOf(sql`select action from audit_log`)).map((r) => r.action)).toContain("pedido_estado");
  });

  it("HU-35: transición inválida → 409 INVALID_TRANSITION; estado desactualizado → 409 STATE_CHANGED", async () => {
    const r1 = await change(numbers.delivery, { to: "delivered", expectedStatus: "paid" });
    expect(((await r1.json()) as { error: { code: string } }).error.code).toBe("INVALID_TRANSITION");
    const r2 = await change(numbers.delivery, { to: "preparing", expectedStatus: "pending_payment" });
    expect(r2.status).toBe(409);
    expect(((await r2.json()) as { error: { code: string } }).error.code).toBe("STATE_CHANGED");
  });

  it("FR-019: Pendiente de pago → Pagado no se hace por esta ruta", async () => {
    const r = await change(numbers.pending, { to: "paid", expectedStatus: "pending_payment" });
    expect(r.status).toBe(409);
  });

  it("HU-35, RN-10: cancelar exige motivo y devuelve el stock", async () => {
    expect((await change(numbers.delivery, { to: "cancelled", expectedStatus: "paid" })).status).toBe(400);
    const before = Number((await rowsOf(sql`select stock from product where id = ${ids.p10}`))[0]!.stock);
    const r = await change(numbers.delivery, { to: "cancelled", expectedStatus: "paid", reason: "Sin stock en almacén" });
    expect(r.status).toBe(200);
    const d = (await r.json()) as AdminOrderDetail;
    expect(d.events.at(-1)).toMatchObject({ toStatus: "cancelled", actor: "administrador", reason: "Sin stock en almacén" });
    expect(Number((await rowsOf(sql`select stock from product where id = ${ids.p10}`))[0]!.stock)).toBe(before + 1);
  });
});

describe("HU-37: exportar a CSV", () => {
  it("HU-37: respeta los filtros y trae las columnas pedidas", async () => {
    const res = await api("/admin/orders/export.csv?method=card", { cookie: admin.cookie });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="pedidos-/);
    const text = new TextDecoder().decode(await res.arrayBuffer());
    const lines = text.replace(/^﻿/, "").trim().split("\r\n");
    expect(lines[0]).toBe("N.º,Fecha,Cliente,Total,Método,Estado");
    expect(lines).toHaveLength(3);
    expect(text).toContain("Ana Pérez");
    expect(text).toContain("Tarjeta");
  });

  it("HU-37: más de 10 000 filas → 422 TOO_MANY_ROWS", async () => {
    await withDb((db) =>
      db.execute(sql`insert into orders (id, number, user_id, status, delivery_method, shipping_cents, subtotal_cents,
        total_cents, taxable_base_cents, igv_cents, payment_method)
        select 'bulk-' || g, 'RC-9' || lpad(g::text, 6, '0'), (select id from "user" where email = 'ana@prueba.pe'),
          'delivered', 'pickup', 0, 100, 100, 85, 15, 'card' from generate_series(1, 10001) g`),
    );
    const res = await api("/admin/orders/export.csv", { cookie: admin.cookie });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("TOO_MANY_ROWS");
  });
});
