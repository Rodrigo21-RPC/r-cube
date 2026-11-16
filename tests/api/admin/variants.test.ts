import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { AdminProduct, AdminProductRow, AdminSummary, AdminVariant, Page, StockMovementDto } from "@shared/admin-types";
import { api, ids, iphoneVariants, makeVariants, resetDb, rowsOf, signInAdmin, signUp, withDb } from "../helpers";

let admin: Awaited<ReturnType<typeof signInAdmin>>;
beforeEach(async () => {
  await resetDb();
  admin = await signInAdmin();
});

const body = (o: Record<string, unknown> = {}) => ({
  sku: "MBA-256-GR", storage: "256 GB", color: "Gris", ram: "", priceCents: 399900, stock: 3, imageId: null, active: true, ...o,
});
const create = (productId: string, o: Record<string, unknown> = {}) =>
  api(`/admin/products/${productId}/variants`, { method: "POST", cookie: admin.cookie, json: body(o) });
const edit = (variantId: string, o: Record<string, unknown> = {}) =>
  api(`/admin/variants/${variantId}`, { method: "PATCH", cookie: admin.cookie, json: body(o) });
const product = async (id: string) => (await (await api(`/admin/products/${id}`, { cookie: admin.cookie })).json()) as AdminProduct;
const fieldsOf = async (res: Response) => ((await res.json()) as { error: { code: string; fields?: Record<string, string> } }).error;
const audits = (action: string) => rowsOf(sql`select detail, data from audit_log where action = ${action} order by created_at`);

describe("HU-43, FR-001: crear variantes", () => {
  it("HU-43: crea variantes con stock inicial y el producto pasa a mostrar rango de precios y stock total", async () => {
    const r1 = await create(ids.p0);
    expect(r1.status).toBe(201);
    expect((await r1.json()) as AdminVariant).toMatchObject({ sku: "MBA-256-GR", label: "256 GB · Gris", priceCents: 399900, stock: 3, active: true, sold: false });
    expect((await create(ids.p0, { sku: "mba-512-gr", storage: "512 GB", priceCents: 499900, stock: 2 })).status).toBe(201);

    const p = await product(ids.p0);
    expect(p).toMatchObject({ hasVariants: true, priceCents: 399900, maxPriceCents: 499900, stock: 5 });
    expect(p.variants.map((v) => v.sku)).toEqual(["MBA-256-GR", "MBA-512-GR"]); // el SKU se guarda en mayúsculas

    const list = (await (await api("/admin/products?q=macbook", { cookie: admin.cookie })).json()) as Page<AdminProductRow>;
    expect(list.items[0]).toMatchObject({ hasVariants: true, variantCount: 2, priceCents: 399900, maxPriceCents: 499900, stock: 5 });

    const moves = await rowsOf(sql`select m.delta, m.source, v.sku from stock_movement m join product_variant v on v.id = m.variant_id where m.product_id = ${ids.p0} order by v.sku`);
    expect(moves).toEqual([
      expect.objectContaining({ delta: 3, source: "inicial", sku: "MBA-256-GR" }),
      expect.objectContaining({ delta: 2, source: "inicial", sku: "MBA-512-GR" }),
    ]);
  });

  it("HU-43: la primera variante de un producto con stock propio lo pasa a sus variantes y lo deja en el historial", async () => {
    expect((await create(ids.p10, { sku: "IP15-128-NG", storage: "128 GB", color: "Negro", stock: 4 })).status).toBe(201);
    expect((await product(ids.p10)).stock).toBe(4);
    const moves = await rowsOf(sql`select delta, source, variant_id, reason from stock_movement where product_id = ${ids.p10} order by created_at, delta`);
    expect(moves).toEqual([
      expect.objectContaining({ delta: -10, source: "ajuste", variant_id: null, reason: expect.stringContaining("pasó a sus variantes") }),
      expect.objectContaining({ delta: 4, source: "inicial" }),
    ]);
  });

  it("FR-002: un SKU repetido responde 409 DUPLICATE_SKU con el error en el campo", async () => {
    await create(ids.p0);
    const res = await create(ids.p3, { storage: "512 GB" });
    expect(res.status).toBe(409);
    const e = await fieldsOf(res);
    expect(e.code).toBe("DUPLICATE_SKU");
    expect(e.fields).toEqual({ sku: "Ese SKU ya existe" });
  });

  it("FR-002: la misma combinación de atributos en un producto responde 409 DUPLICATE_COMBINATION", async () => {
    await create(ids.p0);
    const res = await create(ids.p0, { sku: "OTRO-SKU" });
    expect(res.status).toBe(409);
    expect((await fieldsOf(res)).code).toBe("DUPLICATE_COMBINATION");
  });

  it("FR-033: valida atributos, SKU, precio y stock con un error por campo", async () => {
    const res = await create(ids.p0, { sku: "a", storage: "", color: "", ram: "", priceCents: 0, stock: -1 });
    expect(res.status).toBe(400);
    const { fields } = await fieldsOf(res);
    expect(Object.keys(fields!)).toEqual(expect.arrayContaining(["sku", "storage", "priceCents", "stock"]));
  });

  it("FR-001: la variante 21 de un producto responde 409 TOO_MANY_VARIANTS", async () => {
    await makeVariants(ids.p0, Array.from({ length: 20 }, (_, i) => ({ id: `v${i}`, sku: `MBA-${i + 100}`, storage: `${i + 1} GB`, priceCents: 100000 + i, stock: 1 })));
    const res = await create(ids.p0, { sku: "MBA-EXTRA", storage: "999 GB" });
    expect(res.status).toBe(409);
    expect((await fieldsOf(res)).code).toBe("TOO_MANY_VARIANTS");
  });

  it("FR-001: la foto de la variante debe ser una foto del mismo producto", async () => {
    const res = await create(ids.p3, { imageId: "img-1" }); // img-1 es del iPhone
    expect(res.status).toBe(400);
    expect((await fieldsOf(res)).fields).toHaveProperty("imageId");
    expect((await create(ids.p10, { sku: "IP15-X", imageId: "img-1" })).status).toBe(201);
  });

  it("FR-034: crear una variante escribe la auditoría", async () => {
    await create(ids.p0);
    expect(await audits("variante")).toEqual([expect.objectContaining({ detail: expect.stringContaining("MBA-256-GR") })]);
  });
});

describe("HU-43, FR-001, FR-034: editar, desactivar y borrar", () => {
  it("HU-43: editar cambia precio y atributos pero no el stock, y audita con antes y después", async () => {
    await iphoneVariants();
    const res = await edit(ids.variants.v256, { sku: "IP15-256-NG", storage: "256 GB", color: "Negro", priceCents: 479900, stock: 99 });
    expect(res.status).toBe(200);
    expect((await res.json()) as AdminVariant).toMatchObject({ priceCents: 479900, stock: 5 });
    const p = await product(ids.p10);
    expect(p).toMatchObject({ priceCents: 459900, maxPriceCents: 519900, stock: 10 });
    const [log] = await audits("variante");
    expect(log!.data).toMatchObject({ before: { priceCents: 499900 }, after: { priceCents: 479900 } });
  });

  it("HU-43, RN-06: desactivar saca la variante del stock y del precio y queda auditado", async () => {
    await iphoneVariants();
    const res = await edit(ids.variants.v128, { sku: "IP15-128-NG", storage: "128 GB", color: "Negro", priceCents: 459900, active: false });
    expect(res.status).toBe(200);
    expect(await product(ids.p10)).toMatchObject({ priceCents: 499900, stock: 6 });
    expect((await audits("variante")).length).toBe(1);
  });

  it("HU-43: borrar una variante nunca vendida responde 204, recalcula el producto y audita", async () => {
    await iphoneVariants();
    const res = await api(`/admin/variants/${ids.variants.v256blue}`, { method: "DELETE", cookie: admin.cookie });
    expect(res.status).toBe(204);
    expect(await product(ids.p10)).toMatchObject({ maxPriceCents: 499900, stock: 9 });
    expect((await audits("variante")).length).toBe(1);
  });

  it("RN-06: una variante que ya está en un pedido no se borra y se ofrece desactivarla", async () => {
    await iphoneVariants();
    const u = await signUp();
    await withDb(async (db) => {
      await db.execute(sql`insert into orders (id, number, user_id, status, delivery_method, shipping_cents, subtotal_cents, total_cents,
        taxable_base_cents, igv_cents, payment_method) values ('o1', 'RC-000001', ${u.user.id}, 'paid', 'pickup', 0, 459900, 459900, 389746, 70154, 'card')`);
      await db.execute(sql`insert into order_item (id, order_id, product_id, variant_id, product_name, unit_price_cents, quantity, line_total_cents)
        values ('oi1', 'o1', ${ids.p10}, ${ids.variants.v128}, 'iPhone 15 Pro', 459900, 1, 459900)`);
    });
    expect(((await (await api(`/admin/products/${ids.p10}/variants`, { cookie: admin.cookie })).json()) as AdminVariant[]).find((v) => v.id === ids.variants.v128)!.sold).toBe(true);
    const res = await api(`/admin/variants/${ids.variants.v128}`, { method: "DELETE", cookie: admin.cookie });
    expect(res.status).toBe(409);
    expect((await fieldsOf(res)).code).toBe("VARIANT_SOLD");
  });

  it("HU-43: editar un producto con variantes no cambia su precio ni su stock (salen de las variantes)", async () => {
    await iphoneVariants();
    const res = await api(`/admin/products/${ids.p10}`, {
      method: "PATCH", cookie: admin.cookie,
      json: { name: "iPhone 15 Pro Max", brandId: ids.brandA, categoryId: ids.catPhones, description: "Nuevo texto", specs: [], priceCents: 1000, compareAtCents: null, stock: 0, active: true },
    });
    expect(res.status).toBe(200);
    expect(await product(ids.p10)).toMatchObject({ name: "iPhone 15 Pro Max", priceCents: 459900, maxPriceCents: 519900, stock: 10 });
    expect(await audits("precio_cambiado")).toEqual([]);
  });

  it("HU-43: borrar la última variante devuelve el producto a su modo simple", async () => {
    await makeVariants(ids.p0, [{ id: "solo", sku: "MBA-SOLO", storage: "256 GB", priceCents: 400000, stock: 2 }]);
    expect((await api("/admin/variants/solo", { method: "DELETE", cookie: admin.cookie })).status).toBe(204);
    expect(await product(ids.p0)).toMatchObject({ hasVariants: false, maxPriceCents: null, stock: 0, priceCents: 400000 });
  });
});

describe("HU-43, FR-004: stock por variante y su historial", () => {
  it("HU-43: ajustar el stock de una variante registra el movimiento con su variante", async () => {
    await iphoneVariants();
    const res = await api(`/admin/products/${ids.p10}/stock-adjustments`, {
      method: "POST", cookie: admin.cookie, json: { delta: 2, reason: "Conteo de almacén", variantId: ids.variants.v256 },
    });
    expect(res.status).toBe(201);
    expect(await product(ids.p10)).toMatchObject({ stock: 12 });
    const page = (await (await api(`/admin/products/${ids.p10}/stock-movements`, { cookie: admin.cookie })).json()) as Page<StockMovementDto>;
    expect(page.items[0]).toMatchObject({ delta: 2, source: "ajuste", variantLabel: "256 GB · Negro", reason: "Conteo de almacén" });
  });

  it("HU-43: sin variantId en un producto con variantes responde 400 VARIANT_REQUIRED", async () => {
    await iphoneVariants();
    const res = await api(`/admin/products/${ids.p10}/stock-adjustments`, { method: "POST", cookie: admin.cookie, json: { delta: 1, reason: "Prueba" } });
    expect(res.status).toBe(400);
    expect((await fieldsOf(res)).code).toBe("VARIANT_REQUIRED");
  });

  it("FR-012: un ajuste que dejaría la variante en negativo responde 409 y no cambia nada", async () => {
    await iphoneVariants();
    const res = await api(`/admin/products/${ids.p10}/stock-adjustments`, {
      method: "POST", cookie: admin.cookie, json: { delta: -9, reason: "Merma", variantId: ids.variants.v256blue },
    });
    expect(res.status).toBe(409);
    expect((await product(ids.p10)).stock).toBe(10);
  });

  it("clarificación 3: el stock bajo cuenta cada variante activa con 5 unidades o menos, con producto y variante", async () => {
    const before = (await (await api("/admin/summary", { cookie: admin.cookie })).json()) as AdminSummary;
    expect(before.cards.lowStock).toBe(2); // Galaxy S23 (3) y MacBook (0)
    await iphoneVariants(); // 4, 5 y 1 unidades
    const after = (await (await api("/admin/summary", { cookie: admin.cookie })).json()) as AdminSummary;
    expect(after.cards.lowStock).toBe(5); // 3 variantes + Galaxy + MacBook; el iPhone ya no cuenta como producto
    const list = (await (await api("/admin/products?lowStock=1", { cookie: admin.cookie })).json()) as Page<AdminProductRow>;
    const iphone = list.items.find((p) => p.id === ids.p10)!;
    expect(iphone.lowVariants).toEqual(expect.arrayContaining([
      { label: "128 GB · Negro", stock: 4 }, { label: "256 GB · Negro", stock: 5 }, { label: "256 GB · Azul", stock: 1 },
    ]));
  });
});
