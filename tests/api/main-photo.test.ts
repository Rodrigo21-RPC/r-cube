import { beforeEach, describe, expect, it } from "vitest";
import type { CartQuote, CatalogPage, FavoriteItem } from "@shared/types";
import { api, ids, makeImages, makeVariants, resetDb, signInAdmin, signUp } from "./helpers";

const photos = [
  { id: "foto-a", position: 0, url: "/img/productos/galeria/foto-a.webp" },
  { id: "foto-b", position: 1, url: "/img/productos/galeria/foto-b.webp" },
  { id: "foto-c", position: 2, url: "/img/productos/galeria/foto-c.webp", origin: "tarjeta" as const },
];

const cardOf = async () => ((await (await api("/catalog/products")).json()) as CatalogPage).items.find((p) => p.id === ids.p3)!.imageUrl;
const cartOf = async (extra: object = {}) =>
  ((await (await api("/cart/quote", { method: "POST", json: { items: [{ productId: ids.p3, quantity: 1, ...extra }] } })).json()) as CartQuote).lines[0]!.imageUrl;
const favoriteOf = async (cookie: string) => ((await (await api("/favorites", { cookie })).json()) as { items: FavoriteItem[] }).items[0]!.product.imageUrl;

let customer: Awaited<ReturnType<typeof signUp>>;

beforeEach(async () => {
  await resetDb();
  await makeImages(ids.p3, photos);
  customer = await signUp();
  await api(`/favorites/${ids.p3}`, { method: "PUT", cookie: customer.cookie });
});

describe("HU-54, FR-034: carrito, catálogo y favoritos siguen usando la foto principal", () => {
  it("FR-034: la tarjeta del catálogo, la línea del carrito y los favoritos usan la foto de posición 0", async () => {
    expect(await cardOf()).toBe(photos[0]!.url);
    expect(await cartOf()).toBe(photos[0]!.url);
    expect(await favoriteOf(customer.cookie)).toBe(photos[0]!.url);
  });

  it("FR-034: al marcar otra foto como principal, las tres pasan a usar esa", async () => {
    const admin = await signInAdmin();
    const res = await api(`/admin/products/${ids.p3}/images/foto-b/main`, { method: "POST", cookie: admin.cookie, json: {} });
    expect(res.status).toBe(200);
    expect(await cardOf()).toBe(photos[1]!.url);
    expect(await cartOf()).toBe(photos[1]!.url);
    expect(await favoriteOf(customer.cookie)).toBe(photos[1]!.url);
  });

  it("HU-44, FR-034: la línea de una variante con foto propia usa la de la variante", async () => {
    await makeVariants(ids.p3, [{ id: "var-p3-a", sku: "P3-A", storage: "128 GB", priceCents: 299900, stock: 3, imageId: "foto-c" }]);
    expect(await cartOf({ variantId: "var-p3-a" })).toBe(photos[2]!.url);
  });
});
