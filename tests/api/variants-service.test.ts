import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { applyStockChange } from "@worker/services/stock";
import { syncProductFromVariants } from "@worker/services/variants";
import { ids, iphoneVariants, makeVariants, resetDb, rowsOf, withDb } from "./helpers";

beforeEach(resetDb);

const actor = { type: "sistema", userId: null } as const;
const productRow = async (id: string) =>
  (await rowsOf(sql`select price_cents, max_price_cents, stock, has_variants from product where id = ${id}`))[0]!;
const variantStock = async (id: string) => Number((await rowsOf(sql`select stock from product_variant where id = ${id}`))[0]!.stock);
const sync = (productId: string) => withDb((db) => db.transaction((tx) => syncProductFromVariants(tx, productId)));
const sumOfVariants = async (productId: string) =>
  Number((await rowsOf(sql`select coalesce(sum(stock),0) as s from product_variant where product_id = ${productId} and active`))[0]!.s);

describe("HU-43, FR-003: syncProductFromVariants (invariante 1)", () => {
  it("HU-43: el producto queda con el precio «desde», el precio máximo, el stock total y has_variants", async () => {
    await iphoneVariants();
    await withDb((db) => db.execute(sql`update product set price_cents = 1, max_price_cents = null, stock = 0, has_variants = false where id = ${ids.p10}`));
    await sync(ids.p10);
    expect(await productRow(ids.p10)).toMatchObject({ price_cents: 459900, max_price_cents: 519900, stock: 10, has_variants: true });
  });

  it("HU-43: las variantes inactivas no cuentan en el precio ni en el stock", async () => {
    await iphoneVariants();
    await withDb((db) => db.execute(sql`update product_variant set active = false where id = ${ids.variants.v128}`));
    await sync(ids.p10);
    expect(await productRow(ids.p10)).toMatchObject({ price_cents: 499900, max_price_cents: 519900, stock: 6 });
  });

  it("HU-43: si todas están inactivas, el stock es 0 y el precio sigue siendo el menor de todas", async () => {
    await iphoneVariants();
    await withDb((db) => db.execute(sql`update product_variant set active = false where product_id = ${ids.p10}`));
    await sync(ids.p10);
    expect(await productRow(ids.p10)).toMatchObject({ price_cents: 459900, max_price_cents: null, stock: 0, has_variants: true });
  });

  it("FR-008: un producto sin variantes no se toca", async () => {
    await sync(ids.p3);
    expect(await productRow(ids.p3)).toMatchObject({ price_cents: 299900, max_price_cents: null, stock: 3, has_variants: false });
  });
});

describe("HU-43, FR-004: applyStockChange con variante (invariante 2)", () => {
  it("HU-43: descuenta de la variante, registra el movimiento con su variante y sincroniza el producto", async () => {
    await iphoneVariants();
    await withDb((db) =>
      db.transaction((tx) =>
        applyStockChange(tx, { productId: ids.p10, variantId: ids.variants.v256, delta: -2, source: "ajuste", reason: "Merma", actor }),
      ),
    );
    expect(await variantStock(ids.variants.v256)).toBe(3);
    expect((await productRow(ids.p10)).stock).toBe(8);
    expect(await rowsOf(sql`select variant_id, delta, stock_before, stock_after, source from stock_movement where product_id = ${ids.p10}`)).toEqual([
      expect.objectContaining({ variant_id: ids.variants.v256, delta: -2, stock_before: 5, stock_after: 3, source: "ajuste" }),
    ]);
  });

  it("FR-012: un descuento que dejaría la variante en negativo responde NEGATIVE_STOCK y no cambia nada", async () => {
    await iphoneVariants();
    await expect(
      withDb((db) =>
        db.transaction((tx) =>
          applyStockChange(tx, { productId: ids.p10, variantId: ids.variants.v256blue, delta: -2, source: "venta", actor }),
        ),
      ),
    ).rejects.toMatchObject({ code: "NEGATIVE_STOCK" });
    expect(await variantStock(ids.variants.v256blue)).toBe(1);
    expect((await productRow(ids.p10)).stock).toBe(10);
    expect(await rowsOf(sql`select 1 from stock_movement`)).toEqual([]);
  });

  it("RN-02: devolver stock (cancelación) suma a la variante y al producto", async () => {
    await iphoneVariants();
    await withDb((db) =>
      db.transaction((tx) =>
        applyStockChange(tx, { productId: ids.p10, variantId: ids.variants.v128, delta: 3, source: "cancelacion", actor }),
      ),
    );
    expect(await variantStock(ids.variants.v128)).toBe(7);
    expect((await productRow(ids.p10)).stock).toBe(13);
  });

  it("SC-004: dos descuentos simultáneos de variantes del mismo producto dejan el producto exacto", async () => {
    await makeVariants(ids.p10, [
      { id: "va", sku: "VAR-A", storage: "64 GB", priceCents: 400000, stock: 6 },
      { id: "vb", sku: "VAR-B", storage: "128 GB", priceCents: 450000, stock: 6 },
    ]);
    await Promise.all(
      ["va", "vb"].map((variantId) =>
        withDb((db) =>
          db.transaction((tx) => applyStockChange(tx, { productId: ids.p10, variantId, delta: -4, source: "venta", actor })),
        ),
      ),
    );
    expect(await variantStock("va")).toBe(2);
    expect(await variantStock("vb")).toBe(2);
    expect((await productRow(ids.p10)).stock).toBe(await sumOfVariants(ids.p10));
    expect((await productRow(ids.p10)).stock).toBe(4);
  });
});
