import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { AdminProduct, AdminProductRow, Page } from "@shared/admin-types";
import { api, ids, resetDb, rowsOf, signInAdmin, signUp } from "../helpers";

let admin: Awaited<ReturnType<typeof signInAdmin>>;
beforeEach(async () => {
  await resetDb();
  admin = await signInAdmin();
});

const base = {
  name: "Tablet de prueba",
  brandId: ids.brandB,
  categoryId: ids.catPhones,
  description: "Tablet para pruebas",
  specs: [{ label: "Pantalla", value: "10 pulgadas" }],
  priceCents: 150000,
  compareAtCents: null,
  stock: 7,
  active: true,
};
const create = (body: Record<string, unknown>) => api("/admin/products", { method: "POST", cookie: admin.cookie, json: body });

describe("HU-28: crear y editar productos", () => {
  it("HU-28: crea el producto, registra el stock inicial y aparece en la tienda", async () => {
    const res = await create(base);
    expect(res.status).toBe(201);
    const p = (await res.json()) as AdminProduct;
    expect(p).toMatchObject({ name: "Tablet de prueba", stock: 7, priceCents: 150000, active: true });
    expect((await api(`/catalog/products/${p.slug}`)).status).toBe(200);
    expect(await rowsOf(sql`select source, delta, stock_after from stock_movement where product_id = ${p.id}`)).toEqual([
      { source: "inicial", delta: 7, stock_after: 7 },
    ]);
    expect((await rowsOf(sql`select action from audit_log`)).map((r) => r.action)).toContain("producto_creado");
  });

  it("HU-28: valida precio > 0, precio anterior mayor al precio, nombre y marca existente", async () => {
    const r1 = await create({ ...base, priceCents: 0, compareAtCents: 100, name: "", brandId: "no-existe" });
    expect(r1.status).toBe(400);
    const f = ((await r1.json()) as { error: { fields: Record<string, string> } }).error.fields;
    expect(Object.keys(f)).toEqual(expect.arrayContaining(["priceCents", "name"]));
    const r2 = await create({ ...base, compareAtCents: 150000 });
    expect(((await r2.json()) as { error: { fields: Record<string, string> } }).error.fields.compareAtCents).toBeDefined();
    const r3 = await create({ ...base, brandId: "no-existe" });
    expect(r3.status).toBe(400);
  });

  it("HU-28, FR-006, HU-42: editar no cambia el stock y el cambio de precio queda auditado", async () => {
    const res = await api(`/admin/products/${ids.p10}`, {
      method: "PATCH",
      cookie: admin.cookie,
      json: { ...base, name: "iPhone 15 Pro", priceCents: 459900, compareAtCents: 549900, stock: 999 },
    });
    expect(res.status).toBe(200);
    const p = (await res.json()) as AdminProduct;
    expect(p).toMatchObject({ priceCents: 459900, stock: 10 });
    const [log] = await rowsOf(sql`select detail, data from audit_log where action = 'precio_cambiado'`);
    expect(log!.data).toEqual({ before: { priceCents: 499900 }, after: { priceCents: 459900 } });
    expect(String(log!.detail)).toContain("S/ 4,599.00");
  });
});

describe("HU-29, RN-06: activar y desactivar", () => {
  it("HU-29: desactivar oculta el producto en la tienda y conserva sus pedidos", async () => {
    const u = await signUp();
    await api(`/cart/items/${ids.p3}`, { method: "PUT", cookie: u.cookie, json: { quantity: 1 } });
    const { order } = (await (await api("/checkout/orders", {
      method: "POST",
      cookie: u.cookie,
      json: { delivery: { method: "pickup" }, payment: { method: "transfer" }, expectedTotalCents: 299900 },
    })).json()) as { order: { number: string } };
    const res = await api(`/admin/products/${ids.p3}/status`, { method: "PATCH", cookie: admin.cookie, json: { active: false } });
    expect(res.status).toBe(200);
    expect((await api(`/catalog/products/${ids.p3}`)).status).toBe(404);
    const detail = (await (await api(`/orders/${order.number}`, { cookie: u.cookie })).json()) as { items: { name: string }[] };
    expect(detail.items[0]!.name).toBe("Galaxy S23");
    await api(`/admin/products/${ids.p3}/status`, { method: "PATCH", cookie: admin.cookie, json: { active: true } });
    expect((await api(`/catalog/products/${ids.p3}`)).status).toBe(200);
  });
});

describe("HU-30: buscar y filtrar la lista del panel", () => {
  const list = async (qs: string) =>
    (await (await api(`/admin/products?${qs}`, { cookie: admin.cookie })).json()) as Page<AdminProductRow>;

  it("HU-30: incluye inactivos, busca por nombre y filtra por categoría, estado y stock bajo", async () => {
    expect((await list("")).total).toBe(4);
    expect((await list("q=galaxy")).items.map((p) => p.id)).toEqual([ids.p3]);
    expect((await list("status=inactive")).items.map((p) => p.id)).toEqual([ids.pOff]);
    expect((await list("category=laptops")).items.map((p) => p.id)).toEqual([ids.p0]);
    expect((await list("lowStock=1&status=active")).items.map((p) => p.id).sort()).toEqual([ids.p0, ids.p3].sort());
    expect((await list("")).pageSize).toBe(20);
  });
});
