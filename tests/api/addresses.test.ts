import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { Address, CheckoutOptions, Me, OrderDetail } from "@shared/types";
import { api, ids, resetDb, rowsOf, signUp } from "./helpers";

let u: Awaited<ReturnType<typeof signUp>>;
beforeEach(async () => {
  await resetDb();
  u = await signUp({ name: "Ana Pérez" });
});

const body = (o: Record<string, unknown> = {}) => ({
  label: "Casa", recipientName: "Ana Pérez", phone: "987654321", line: "Av. Larco 123", district: "Miraflores", reference: "Frente al parque", ...o,
});
const create = (o: Record<string, unknown> = {}, cookie = u.cookie) => api("/account/addresses", { method: "POST", cookie, json: body(o) });
const list = async (cookie = u.cookie) => (await (await api("/account/addresses", { cookie })).json()) as Address[];
const defaults = async () => rowsOf(sql`select id from address where is_default`);

describe("HU-48, FR-016: crear y validar", () => {
  it("HU-48: crea una dirección y la devuelve", async () => {
    const res = await create();
    expect(res.status).toBe(201);
    expect((await res.json()) as Address).toMatchObject({ label: "Casa", recipientName: "Ana Pérez", phone: "987654321", line: "Av. Larco 123", district: "Miraflores", reference: "Frente al parque", isDefault: true });
  });

  it("FR-033: valida cada campo con su mensaje", async () => {
    const res = await create({ label: "A", recipientName: "A", phone: "123", line: "abc", district: "A", reference: "x".repeat(161) });
    expect(res.status).toBe(400);
    const { fields } = ((await res.json()) as { error: { fields: Record<string, string> } }).error;
    expect(Object.keys(fields).sort()).toEqual(["district", "label", "line", "phone", "recipientName", "reference"]);
  });

  it("HU-48: la referencia es opcional", async () => {
    expect((await create({ reference: "" })).status).toBe(201);
    expect((await create({ label: "Trabajo", reference: undefined })).status).toBe(201);
  });

  it("HU-48: sin sesión responde 401", async () => {
    expect((await api("/account/addresses")).status).toBe(401);
  });

  it("FR-016: la dirección 11 responde 409 TOO_MANY_ADDRESSES", async () => {
    for (let i = 0; i < 10; i++) expect((await create({ label: `Dir ${i + 10}` })).status).toBe(201);
    const res = await create({ label: "Dir extra" });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("TOO_MANY_ADDRESSES");
  });
});

describe("HU-48, FR-017: predeterminada única", () => {
  it("HU-48: la primera queda predeterminada y la lista pone primero la predeterminada y luego las más nuevas", async () => {
    const a = (await (await create({ label: "Casa" })).json()) as Address;
    const b = (await (await create({ label: "Trabajo" })).json()) as Address;
    const c = (await (await create({ label: "Estudio" })).json()) as Address;
    expect([a.isDefault, b.isDefault, c.isDefault]).toEqual([true, false, false]);
    expect((await list()).map((x) => x.label)).toEqual(["Casa", "Estudio", "Trabajo"]);
  });

  it("HU-48: marcar otra como predeterminada deja una sola", async () => {
    await create({ label: "Casa" });
    const b = (await (await create({ label: "Trabajo" })).json()) as Address;
    const res = await api(`/account/addresses/${b.id}/default`, { method: "POST", cookie: u.cookie, json: {} });
    expect(res.status).toBe(200);
    expect(await defaults()).toEqual([{ id: b.id }]);
    expect((await list())[0]).toMatchObject({ label: "Trabajo", isDefault: true });
  });

  it("HU-48: borrar la predeterminada promueve la más reciente; borrar la única deja la lista vacía", async () => {
    const a = (await (await create({ label: "Casa" })).json()) as Address;
    await create({ label: "Trabajo" });
    const c = (await (await create({ label: "Estudio" })).json()) as Address;
    expect((await api(`/account/addresses/${a.id}`, { method: "DELETE", cookie: u.cookie })).status).toBe(204);
    expect(await defaults()).toEqual([{ id: c.id }]);
    for (const x of await list()) await api(`/account/addresses/${x.id}`, { method: "DELETE", cookie: u.cookie });
    expect(await list()).toEqual([]);
  });

  it("HU-48: editar cambia los datos y no la predeterminada", async () => {
    const a = (await (await create()).json()) as Address;
    const res = await api(`/account/addresses/${a.id}`, { method: "PATCH", cookie: u.cookie, json: body({ label: "Casa mamá", district: "Surco" }) });
    expect(res.status).toBe(200);
    expect((await res.json()) as Address).toMatchObject({ label: "Casa mamá", district: "Surco", isDefault: true });
  });

  it("RN-08: las direcciones de otro cliente responden 404", async () => {
    const a = (await (await create()).json()) as Address;
    const other = await signUp();
    expect((await api(`/account/addresses/${a.id}`, { method: "PATCH", cookie: other.cookie, json: body() })).status).toBe(404);
    expect((await api(`/account/addresses/${a.id}`, { method: "DELETE", cookie: other.cookie })).status).toBe(404);
    expect((await api(`/account/addresses/${a.id}/default`, { method: "POST", cookie: other.cookie, json: {} })).status).toBe(404);
    expect(await list(other.cookie)).toEqual([]);
  });
});

describe("FR-019: /account/me usa la dirección predeterminada (compatibilidad con la 001)", () => {
  it("HU-09: guardar el perfil con dirección crea «Principal» y la vuelve a leer", async () => {
    const res = await api("/account/me", {
      method: "PATCH", cookie: u.cookie,
      json: { name: "Ana Pérez", phone: "987654321", address: { line: "Av. Arequipa 100", district: "Lince", reference: "Frente al parque" } },
    });
    expect(res.status).toBe(200);
    expect(await list()).toEqual([expect.objectContaining({ label: "Principal", line: "Av. Arequipa 100", district: "Lince", reference: "Frente al parque", isDefault: true })]);
    expect(((await (await api("/account/me", { cookie: u.cookie })).json()) as Me).address).toEqual({ line: "Av. Arequipa 100", district: "Lince", reference: "Frente al parque" });
  });

  it("HU-09: guardar de nuevo actualiza la misma dirección y una dirección vacía no borra nada", async () => {
    const patch = (address: Record<string, string>) =>
      api("/account/me", { method: "PATCH", cookie: u.cookie, json: { name: "Ana Pérez", phone: "987654321", address } });
    await patch({ line: "Av. Arequipa 100", district: "Lince", reference: "" });
    await patch({ line: "Jr. Carabaya 220", district: "Cercado", reference: "" });
    expect(await list()).toHaveLength(1);
    expect((await list())[0]).toMatchObject({ line: "Jr. Carabaya 220", district: "Cercado" });
    await patch({ line: "", district: "", reference: "" });
    expect((await list())[0]).toMatchObject({ line: "Jr. Carabaya 220" });
  });

  it("HU-09: leer el perfil sin direcciones devuelve la dirección vacía", async () => {
    expect(((await (await api("/account/me", { cookie: u.cookie })).json()) as Me).address).toEqual({ line: "", district: "", reference: "" });
  });
});

describe("HU-48, FR-018: checkout con dirección guardada", () => {
  const order = async (delivery: Record<string, unknown>, expectedTotalCents = 299900 + 1500) => {
    await api(`/cart/items/${ids.p3}`, { method: "PUT", cookie: u.cookie, json: { quantity: 1 } });
    return api("/checkout/orders", {
      method: "POST", cookie: u.cookie,
      json: { delivery, payment: { method: "transfer" }, expectedTotalCents },
    });
  };

  it("HU-48: las opciones traen las direcciones con la predeterminada primero", async () => {
    await create({ label: "Casa" });
    await create({ label: "Trabajo" });
    const o = (await (await api("/checkout/options", { cookie: u.cookie })).json()) as CheckoutOptions;
    expect(o.addresses.map((a) => [a.label, a.isDefault])).toEqual([["Casa", true], ["Trabajo", false]]);
  });

  it("HU-48: el pedido congela los datos de la dirección elegida aunque se edite o borre después", async () => {
    const a = (await (await create({ label: "Casa", recipientName: "María Ríos", phone: "912345678", line: "Av. Larco 123", district: "Miraflores", reference: "Piso 2" })).json()) as Address;
    const res = await order({ method: "delivery", zoneId: ids.zone, addressId: a.id });
    expect(res.status).toBe(201);
    const { order: o } = (await res.json()) as { order: OrderDetail };
    await api(`/account/addresses/${a.id}`, { method: "PATCH", cookie: u.cookie, json: body({ line: "Otra calle 999", district: "Surco" }) });
    await api(`/account/addresses/${a.id}`, { method: "DELETE", cookie: u.cookie });
    const saved = (await (await api(`/orders/${o.number}`, { cookie: u.cookie })).json()) as OrderDetail;
    expect(saved.shipping).toEqual({ name: "María Ríos", phone: "912345678", address: "Av. Larco 123", district: "Miraflores", reference: "Piso 2" });
  });

  it("HU-48: un addressId inexistente o ajeno responde 400 en delivery.addressId y no crea pedido", async () => {
    const other = await signUp();
    const mine = (await (await create({}, other.cookie)).json()) as Address;
    for (const addressId of ["no-existe", mine.id]) {
      const res = await order({ method: "delivery", zoneId: ids.zone, addressId });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: { fields: Record<string, string> } }).error.fields).toHaveProperty("delivery.addressId");
    }
    expect(await rowsOf(sql`select 1 from orders`)).toEqual([]);
  });

  it("HU-48: sin addressId se sigue usando la dirección escrita a mano («Otra dirección»)", async () => {
    const res = await order({ method: "delivery", zoneId: ids.zone, name: "Pedro Gil", phone: "955443322", address: "Calle Los Pinos 15", district: "San Isidro" });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { order: OrderDetail }).order.shipping).toMatchObject({ name: "Pedro Gil", address: "Calle Los Pinos 15" });
  });

  it("HU-48: el recojo en tienda no pide dirección", async () => {
    const res = await order({ method: "pickup" }, 299900);
    expect(res.status).toBe(201);
    expect(((await res.json()) as { order: OrderDetail }).order.shipping).toBeNull();
  });
});
