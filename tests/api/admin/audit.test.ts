import { beforeEach, describe, expect, it } from "vitest";
import type { AuditRow, Page } from "@shared/admin-types";
import { api, ids, resetDb, signInAdmin, signUp } from "../helpers";

let admin: Awaited<ReturnType<typeof signInAdmin>>;

beforeEach(async () => {
  await resetDb();
  admin = await signInAdmin();
});

const audit = async (qs = "") => (await (await api(`/admin/audit?${qs}`, { cookie: admin.cookie })).json()) as Page<AuditRow>;
const post = (path: string, json: Record<string, unknown>, method = "POST") => api(`/admin${path}`, { method, cookie: admin.cookie, json });

describe("HU-42, SC-006: registro de auditoría", () => {
  it("HU-42: lista precio, stock, pago, estado, bloqueo y configuración del más nuevo al más antiguo", async () => {
    const u = await signUp({ name: "Mateo Quispe", email: "mateo@prueba.pe" });
    await api(`/cart/items/${ids.p3}`, { method: "PUT", cookie: u.cookie, json: { quantity: 1 } });
    const { order } = (await (await api("/checkout/orders", {
      method: "POST",
      cookie: u.cookie,
      json: { delivery: { method: "pickup" }, payment: { method: "transfer" }, expectedTotalCents: 299900 },
    })).json()) as { order: { number: string } };

    const product = (await (await api(`/admin/products/${ids.p10}`, { cookie: admin.cookie })).json()) as Record<string, unknown>;
    expect((await post(`/products/${ids.p10}`, { ...product, priceCents: 459900 }, "PATCH")).status).toBe(200);
    expect((await post(`/products/${ids.p10}/stock-adjustments`, { delta: 2, reason: "Conteo de almacén" })).status).toBe(201);
    expect((await post(`/orders/${order.number}/payment/confirm`, {})).status).toBe(200);
    expect((await post(`/orders/${order.number}/status`, { to: "preparing", expectedStatus: "paid" })).status).toBe(200);
    expect((await post(`/customers/${u.user.id}/block`, {})).status).toBe(200);
    const settings = (await (await api("/admin/settings", { cookie: admin.cookie })).json()) as Record<string, unknown>;
    expect((await post("/settings", { ...settings, bankName: "Banco Nuevo" }, "PATCH")).status).toBe(200);

    const page = await audit();
    expect(page.pageSize).toBe(30);
    expect(page.items.map((r) => r.action)).toEqual([
      "configuracion",
      "cliente_bloqueado",
      "pedido_estado",
      "pago_confirmado",
      "stock_ajustado",
      "precio_cambiado",
    ]);
    expect(page.items[1]).toMatchObject({ actorName: "Admin Pruebas", entityType: "cliente", entityLabel: "Mateo Quispe" });
    expect(page.items.every((r) => r.detail && r.createdAt)).toBe(true);

    const filtered = await audit("action=stock_ajustado");
    expect(filtered.total).toBe(1);
    expect(filtered.items[0]!.detail).toContain("Conteo de almacén");
  });

  it("HU-42: pagina de 30 en 30 y rechaza acciones desconocidas", async () => {
    for (let i = 0; i < 31; i++) await post(`/products/${ids.p10}/stock-adjustments`, { delta: 1, reason: `Ingreso ${i}` });
    expect((await audit()).items).toHaveLength(30);
    const p2 = await audit("page=2");
    expect(p2).toMatchObject({ total: 31, page: 2 });
    expect(p2.items).toHaveLength(1);
    expect((await api("/admin/audit?action=borrar_todo", { cookie: admin.cookie })).status).toBe(400);
  });

  it("HU-42: el registro es de solo lectura y exige administrador", async () => {
    for (const method of ["PUT", "PATCH", "DELETE"]) expect((await api("/admin/audit", { method, cookie: admin.cookie, json: {} })).status).toBe(404);
    const u = await signUp();
    expect((await api("/admin/audit", { cookie: u.cookie })).status).toBe(403);
  });
});
