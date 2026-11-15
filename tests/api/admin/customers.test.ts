import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { CustomerDetail, CustomerRow, Page } from "@shared/admin-types";
import { api, ids, resetDb, rowsOf, signIn, signInAdmin, signUp } from "../helpers";

let admin: Awaited<ReturnType<typeof signInAdmin>>;
let mateo: Awaited<ReturnType<typeof signUp>>;

async function buy(cookie: string, payment: Record<string, unknown>) {
  await api(`/cart/items/${ids.p3}`, { method: "PUT", cookie, json: { quantity: 1 } });
  const res = await api("/checkout/orders", { method: "POST", cookie, json: { delivery: { method: "pickup" }, payment, expectedTotalCents: 299900 } });
  return res;
}

beforeEach(async () => {
  await resetDb();
  admin = await signInAdmin();
  mateo = await signUp({ name: "Mateo Quispe", email: "mateo@prueba.pe" });
  await signUp({ name: "Lucía Huamán", email: "lucia@prueba.pe" });
  await buy(mateo.cookie, { method: "card", cardNumber: "4111111111111111", expMonth: 12, expYear: 2030, cvv: "123" });
  await buy(mateo.cookie, { method: "transfer" }); // pendiente: no suma al total gastado
});

const list = async (qs = "") => (await (await api(`/admin/customers?${qs}`, { cookie: admin.cookie })).json()) as Page<CustomerRow>;

describe("HU-38: lista de clientes", () => {
  it("HU-38: busca por nombre y correo; muestra pedidos y total gastado sin pendientes ni cancelados", async () => {
    const all = await list();
    expect(all.total).toBe(2); // el administrador no es cliente
    expect(all.pageSize).toBe(20);
    const m = (await list("q=mateo")).items[0]!;
    expect(m).toMatchObject({ name: "Mateo Quispe", orders: 2, spentCents: 299900, blocked: false });
    expect((await list("q=lucia%40prueba")).items.map((c) => c.email)).toEqual(["lucia@prueba.pe"]);
  });
});

describe("HU-39: detalle del cliente", () => {
  it("HU-39: datos, fecha de registro y pedidos", async () => {
    const d = (await (await api(`/admin/customers/${mateo.user.id}`, { cookie: admin.cookie })).json()) as CustomerDetail;
    expect(d).toMatchObject({ email: "mateo@prueba.pe", phone: "987654321", orders: 2 });
    expect(d.orderList).toHaveLength(2);
    expect(d.createdAt).toBeTruthy();
  });
});

describe("HU-40, RN-08: bloquear y reactivar", () => {
  it("HU-40: bloquear invalida sus sesiones e impide ingresar y comprar; reactivar lo devuelve", async () => {
    expect((await api(`/admin/customers/${mateo.user.id}/block`, { method: "POST", cookie: admin.cookie, json: {} })).status).toBe(200);
    expect((await api("/account/me", { cookie: mateo.cookie })).status).toBe(401);
    expect((await buy(mateo.cookie, { method: "transfer" })).status).toBe(401);
    const login = await signIn(mateo.email, mateo.password);
    expect(login.status).toBe(403);
    expect(((await login.json()) as { error: { message: string } }).error.message).toMatch(/bloqueada/);
    expect((await list("q=mateo")).items[0]!.blocked).toBe(true);

    expect((await api(`/admin/customers/${mateo.user.id}/unblock`, { method: "POST", cookie: admin.cookie, json: {} })).status).toBe(200);
    expect((await signIn(mateo.email, mateo.password)).status).toBe(200);
    const actions = (await rowsOf(sql`select action from audit_log order by created_at`)).map((r) => r.action);
    expect(actions).toEqual(["cliente_bloqueado", "cliente_reactivado"]);
  });

  it("HU-40: no se puede bloquear a un administrador", async () => {
    const res = await api(`/admin/customers/${admin.user.id}/block`, { method: "POST", cookie: admin.cookie, json: {} });
    expect(res.status).toBe(403);
  });
});
