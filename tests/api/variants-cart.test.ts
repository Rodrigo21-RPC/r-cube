import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { CartQuote, CatalogPage, OrderDetail, ProductDetail } from "@shared/types";
import { api, ids, iphoneVariants, makeVariants, placeOrder, resetDb, rowsOf, signUp, withDb } from "./helpers";

const V = ids.variants;
let u: Awaited<ReturnType<typeof signUp>>;

beforeEach(async () => {
  await resetDb();
  await iphoneVariants(); // 128 GB Negro (4), 256 GB Negro (5), 256 GB Azul (1)
  u = await signUp();
});

const putVariant = (variantId: string | undefined, quantity = 1, productId: string = ids.p10) =>
  api(`/cart/items/${productId}`, { method: "PUT", cookie: u.cookie, json: { quantity, variantId } });
const cart = async (cookie = u.cookie) => (await (await api("/cart", { cookie })).json()) as CartQuote;
const variantStock = async (id: string) => Number((await rowsOf(sql`select stock from product_variant where id = ${id}`))[0]!.stock);
const productStock = async (id: string) => Number((await rowsOf(sql`select stock from product where id = ${id}`))[0]!.stock);

describe("HU-44: detalle con variantes", () => {
  it("HU-44: devuelve solo las variantes activas con etiqueta, precio y disponibilidad, ordenadas por precio", async () => {
    await withDb((db) => db.execute(sql`update product_variant set active = false where id = ${V.v256blue}`));
    await withDb((db) => db.execute(sql`update product set max_price_cents = 499900, stock = 9 where id = ${ids.p10}`));
    const d = (await (await api(`/catalog/products/${ids.p10}`)).json()) as ProductDetail;
    expect(d).toMatchObject({ hasVariants: true, priceCents: 459900, maxPriceCents: 499900, stock: 9 });
    expect(d.variants.map((v) => v.id)).toEqual([V.v128, V.v256]);
    expect(d.variants[0]).toMatchObject({ sku: "IP15-128-NG", label: "128 GB · Negro", priceCents: 459900, stock: 4, availability: "low" });
  });
});

describe("HU-44, FR-006, RN-01: carrito con variantes", () => {
  it("HU-44: agrega una variante y la línea trae su etiqueta, SKU, precio y stock máximo", async () => {
    const res = await putVariant(V.v256, 2);
    expect(res.status).toBe(200);
    const q = (await res.json()) as CartQuote;
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0]).toMatchObject({
      productId: ids.p10, variantId: V.v256, variantLabel: "256 GB · Negro", sku: "IP15-256-NG",
      unitPriceCents: 499900, quantity: 2, maxQuantity: 5, lineTotalCents: 999800, available: true,
    });
  });

  it("HU-44: sin variante en un producto con variantes responde 400 VARIANT_REQUIRED", async () => {
    const res = await putVariant(undefined);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("VARIANT_REQUIRED");
  });

  it("HU-44: una variante de otro producto o inexistente responde 404", async () => {
    await makeVariants(ids.p3, [{ id: "g1", sku: "GAL-1", storage: "128 GB", priceCents: 290000, stock: 2 }]);
    expect((await putVariant("g1")).status).toBe(404);
    expect((await putVariant("no-existe")).status).toBe(404);
  });

  it("RN-01: se limita al stock de la variante y una variante agotada responde 409 STOCK", async () => {
    const q = (await (await putVariant(V.v256, 9)).json()) as CartQuote;
    expect(q.lines[0]).toMatchObject({ quantity: 5, maxQuantity: 5 });
    await withDb((db) => db.execute(sql`update product_variant set stock = 0 where id = ${V.v256blue}`));
    const res = await putVariant(V.v256blue);
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("STOCK");
  });

  it("FR-006: la misma variante suma y variantes distintas son líneas distintas; se quita una sin afectar la otra", async () => {
    await putVariant(V.v128, 1);
    await putVariant(V.v256, 2);
    await api("/cart/merge", { method: "POST", cookie: u.cookie, json: { items: [{ productId: ids.p10, variantId: V.v256, quantity: 1 }] } });
    const q = await cart();
    expect(q.lines.map((l) => [l.variantId, l.quantity])).toEqual([[V.v128, 1], [V.v256, 3]]);
    expect(q.totals.subtotalCents).toBe(459900 + 3 * 499900);
    const after = (await (await api(`/cart/items/${ids.p10}?variantId=${V.v128}`, { method: "DELETE", cookie: u.cookie })).json()) as CartQuote;
    expect(after.lines.map((l) => l.variantId)).toEqual([V.v256]);
  });

  it("HU-44: el visitante cotiza con variantes", async () => {
    const res = await api("/cart/quote", { method: "POST", json: { items: [{ productId: ids.p10, variantId: V.v128, quantity: 2 }] } });
    const q = (await res.json()) as CartQuote;
    expect(q.lines[0]).toMatchObject({ variantId: V.v128, unitPriceCents: 459900, quantity: 2 });
    expect(q.totals.subtotalCents).toBe(919800);
  });

  it("clarificación 1: una línea sin variante de un producto que ya tiene variantes pide elegir una y no se puede pagar", async () => {
    await withDb((db) => db.execute(sql`insert into cart_item (id, user_id, product_id, quantity, seen_price_cents) values ('legacy', ${u.user.id}, ${ids.p10}, 1, 499900)`));
    const q = await cart();
    expect(q.lines[0]).toMatchObject({ productId: ids.p10, variantId: null, available: false });
    expect(q.warnings).toEqual([expect.objectContaining({ type: "choose_variant" })]);
    expect(q.totals.subtotalCents).toBe(0);
    const res = await api("/checkout/orders", {
      method: "POST", cookie: u.cookie,
      json: { delivery: { method: "pickup" }, payment: { method: "transfer" }, expectedTotalCents: 0 },
    });
    expect(res.status).toBe(409);
    expect(await rowsOf(sql`select 1 from orders`)).toEqual([]);
    expect(await productStock(ids.p10)).toBe(10);
  });

  it("HU-13: avisa cambio de precio y agotado de la variante", async () => {
    await putVariant(V.v256, 1);
    await withDb((db) => db.execute(sql`update product_variant set price_cents = 509900 where id = ${V.v256}`));
    expect((await cart()).warnings).toEqual([expect.objectContaining({ type: "price_changed", message: expect.stringContaining("256 GB · Negro") })]);
    await withDb((db) => db.execute(sql`update product_variant set stock = 0 where id = ${V.v256}`));
    const q = await cart();
    expect(q.lines[0]).toMatchObject({ available: false });
    expect(q.warnings).toEqual([expect.objectContaining({ type: "unavailable" })]);
  });
});

describe("HU-44, FR-007, RN-02, RN-07: pedido con variante", () => {
  it("HU-44: el pedido congela variante, SKU y precio, y descuenta la variante y el producto con su movimiento", async () => {
    const { status, number } = await placeOrder(u.cookie, [{ productId: ids.p10, variantId: V.v256, quantity: 2 }]);
    expect(status).toBe(201);
    expect(await variantStock(V.v256)).toBe(3);
    expect(await productStock(ids.p10)).toBe(8);
    expect(await rowsOf(sql`select variant_id, variant_label, sku, unit_price_cents, quantity from order_item`)).toEqual([
      expect.objectContaining({ variant_id: V.v256, variant_label: "256 GB · Negro", sku: "IP15-256-NG", unit_price_cents: 499900, quantity: 2 }),
    ]);
    expect(await rowsOf(sql`select variant_id, delta, stock_before, stock_after, source from stock_movement where source = 'venta'`)).toEqual([
      expect.objectContaining({ variant_id: V.v256, delta: -2, stock_before: 5, stock_after: 3 }),
    ]);
    // RN-07: cambiar el precio después no altera el pedido.
    await withDb((db) => db.execute(sql`update product_variant set price_cents = 100000 where id = ${V.v256}`));
    const o = (await (await api(`/orders/${number}`, { cookie: u.cookie })).json()) as OrderDetail;
    expect(o.items[0]).toMatchObject({ variantLabel: "256 GB · Negro", sku: "IP15-256-NG", unitPriceCents: 499900 });
  });

  it("RN-10: cancelar devuelve el stock a la variante y al producto", async () => {
    const { number } = await placeOrder(u.cookie, [{ productId: ids.p10, variantId: V.v128, quantity: 3 }]);
    const res = await api(`/orders/${number}/cancel`, { method: "POST", cookie: u.cookie, json: { reason: "no_lo_necesito" } });
    expect(res.status).toBe(200);
    expect(await variantStock(V.v128)).toBe(4);
    expect(await productStock(ids.p10)).toBe(10);
    expect(await rowsOf(sql`select variant_id, delta from stock_movement where source = 'cancelacion'`)).toEqual([
      expect.objectContaining({ variant_id: V.v128, delta: 3 }),
    ]);
  });

  it("FR-008: un producto sin variantes se compra exactamente como antes", async () => {
    const { status, number } = await placeOrder(u.cookie, [{ productId: ids.p3, quantity: 1 }]);
    expect(status).toBe(201);
    const o = (await (await api(`/orders/${number}`, { cookie: u.cookie })).json()) as OrderDetail;
    expect(o.items[0]).toMatchObject({ variantLabel: null, sku: null, unitPriceCents: 299900 });
    expect(await productStock(ids.p3)).toBe(2);
  });

  it("SC-004, RN-02: dos checkouts a la vez por la última unidad de una variante: uno 201 y otro 409 STOCK", async () => {
    const other = await signUp();
    for (const c of [u.cookie, other.cookie]) {
      expect((await api(`/cart/items/${ids.p10}`, { method: "PUT", cookie: c, json: { quantity: 1, variantId: V.v256blue } })).status).toBe(200);
    }
    const buy = (cookie: string) =>
      api("/checkout/orders", {
        method: "POST", cookie,
        json: { delivery: { method: "pickup" }, payment: { method: "transfer" }, expectedTotalCents: 519900 },
      });
    const results = await Promise.all([buy(u.cookie), buy(other.cookie)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const loser = results.find((r) => r.status === 409)!;
    expect(((await loser.json()) as { error: { code: string } }).error.code).toBe("STOCK");
    expect(await variantStock(V.v256blue)).toBe(0);
    expect(await productStock(ids.p10)).toBe(9);
    expect(await rowsOf(sql`select 1 from orders`)).toHaveLength(1);
  });
});

describe("HU-43, FR-003: catálogo con el precio «desde»", () => {
  const list = async (qs: string) => (await (await api(`/catalog/products?${qs}`)).json()) as CatalogPage;

  it("las tarjetas traen hasVariants y maxPriceCents; el orden usa el precio «desde»", async () => {
    const page = await list("sort=price_asc");
    expect(page.items.map((p) => p.id)).toEqual([ids.p3, ids.p0, ids.p10]); // 2,999 < 3,999 < desde 4,599
    expect(page.items[2]).toMatchObject({ hasVariants: true, priceCents: 459900, maxPriceCents: 519900 });
    expect(page.items[0]).toMatchObject({ hasVariants: false, maxPriceCents: null });
  });

  it("el filtro por precio usa el precio «desde»", async () => {
    expect((await list("min=4000&max=4600")).items.map((p) => p.id)).toEqual([ids.p10]);
    expect((await list("min=4700")).items).toEqual([]);
  });
});
