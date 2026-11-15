import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { AdminProduct, Page, StockMovementDto } from "@shared/admin-types";
import { api, ids, resetDb, rowsOf, signInAdmin, signUp } from "../helpers";

let admin: Awaited<ReturnType<typeof signInAdmin>>;
beforeEach(async () => {
  await resetDb();
  admin = await signInAdmin();
});

const adjust = (delta: unknown, reason: unknown) =>
  api(`/admin/products/${ids.p3}/stock-adjustments`, { method: "POST", cookie: admin.cookie, json: { delta, reason } });
const history = async () =>
  (await (await api(`/admin/products/${ids.p3}/stock-movements`, { cookie: admin.cookie })).json()) as Page<StockMovementDto>;

describe("HU-33: ajustes de stock con historial", () => {
  it("HU-33: +5 con motivo deja el stock en 8 y queda en el historial con autor", async () => {
    const res = await adjust(5, "Llegada de mercadería");
    expect(res.status).toBe(201);
    expect(((await res.json()) as AdminProduct).stock).toBe(8);
    const h = await history();
    expect(h.items[0]).toMatchObject({ delta: 5, stockBefore: 3, stockAfter: 8, source: "ajuste", reason: "Llegada de mercadería", actor: "Admin Pruebas" });
    expect((await rowsOf(sql`select action, detail from audit_log`)).map((r) => r.action)).toContain("stock_ajustado");
  });

  it("HU-33: un ajuste que deja el stock negativo se rechaza sin cambios", async () => {
    const res = await adjust(-4, "Producto dañado");
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("NEGATIVE_STOCK");
    expect(Number((await rowsOf(sql`select stock from product where id = ${ids.p3}`))[0]!.stock)).toBe(3);
  });

  it("HU-33: cantidad 0 o sin motivo dan error por campo", async () => {
    const r1 = await adjust(0, "Algo");
    const r2 = await adjust(2, "");
    expect([r1.status, r2.status]).toEqual([400, 400]);
    expect(Object.keys(((await r1.json()) as { error: { fields: object } }).error.fields)).toContain("delta");
    expect(Object.keys(((await r2.json()) as { error: { fields: object } }).error.fields)).toContain("reason");
  });

  it("HU-33: el historial muestra ventas y cancelaciones con su N.º, del más nuevo al más antiguo", async () => {
    const u = await signUp();
    await api(`/cart/items/${ids.p3}`, { method: "PUT", cookie: u.cookie, json: { quantity: 1 } });
    const { order } = (await (await api("/checkout/orders", {
      method: "POST",
      cookie: u.cookie,
      json: { delivery: { method: "pickup" }, payment: { method: "transfer" }, expectedTotalCents: 299900 },
    })).json()) as { order: { number: string } };
    await api(`/orders/${order.number}/cancel`, { method: "POST", cookie: u.cookie, json: { reason: "no_lo_necesito" } });
    const h = await history();
    expect(h.items.map((m) => [m.source, m.delta, m.orderNumber])).toEqual([
      ["cancelacion", 1, order.number],
      ["venta", -1, order.number],
    ]);
  });
});
