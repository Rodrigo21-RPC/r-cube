import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { FavoriteItem } from "@shared/types";
import { api, ids, iphoneVariants, resetDb, rowsOf, signInAdmin, signUp } from "./helpers";

let u: Awaited<ReturnType<typeof signUp>>;
beforeEach(async () => {
  await resetDb();
  u = await signUp();
});

const put = (productId: string, cookie: string | null = u.cookie) => api(`/favorites/${productId}`, { method: "PUT", cookie: cookie ?? undefined });
const del = (productId: string, cookie: string | null = u.cookie) => api(`/favorites/${productId}`, { method: "DELETE", cookie: cookie ?? undefined });
const idsOf = async (cookie = u.cookie) => ((await (await api("/favorites/ids", { cookie })).json()) as { ids: string[] }).ids;
const items = async (cookie = u.cookie) => ((await (await api("/favorites", { cookie })).json()) as { items: FavoriteItem[] }).items;

describe("HU-45, FR-009: agregar y quitar favoritos", () => {
  it("HU-45: PUT es idempotente y deja una sola fila", async () => {
    expect((await put(ids.p3)).status).toBe(204);
    expect((await put(ids.p3)).status).toBe(204);
    expect(await rowsOf(sql`select 1 from favorite`)).toHaveLength(1);
    expect(await idsOf()).toEqual([ids.p3]);
  });

  it("HU-45: DELETE quita y también es idempotente", async () => {
    await put(ids.p3);
    expect((await del(ids.p3)).status).toBe(204);
    expect((await del(ids.p3)).status).toBe(204);
    expect(await idsOf()).toEqual([]);
  });

  it("HU-45: un producto inexistente responde 404", async () => {
    expect((await put("no-existe")).status).toBe(404);
  });

  it("HU-45: sin sesión responde 401 y una cuenta de administrador 403", async () => {
    expect((await put(ids.p3, null)).status).toBe(401);
    expect((await api("/favorites")).status).toBe(401);
    const admin = await signInAdmin();
    expect((await put(ids.p3, admin.cookie)).status).toBe(403);
  });

  it("HU-45: la lista pertenece a la cuenta y cada cliente ve solo la suya", async () => {
    await put(ids.p3);
    const other = await signUp();
    expect(await idsOf(other.cookie)).toEqual([]);
    expect(await items(other.cookie)).toEqual([]);
    await put(ids.p10, other.cookie);
    expect(await idsOf()).toEqual([ids.p3]);
  });
});

describe("HU-45, FR-010: Mis favoritos", () => {
  it("HU-45: devuelve las tarjetas del más reciente al más antiguo con su disponibilidad actual", async () => {
    await put(ids.p3);
    await put(ids.p10);
    await put(ids.p0); // agotado
    await put(ids.pOff); // inactivo: se conserva para poder quitarlo
    const list = await items();
    expect(list.map((i) => i.product.id)).toEqual([ids.pOff, ids.p0, ids.p10, ids.p3]);
    expect(list.map((i) => i.available)).toEqual([false, false, true, true]);
    expect(list[3]!.product).toMatchObject({ name: "Galaxy S23", priceCents: 299900, hasVariants: false });
  });

  it("HU-45, HU-44: un favorito con variantes lo indica para llevar al detalle", async () => {
    await iphoneVariants();
    await put(ids.p10);
    const [fav] = await items();
    expect(fav!.product).toMatchObject({ hasVariants: true, priceCents: 459900, maxPriceCents: 519900 });
    expect(fav!.available).toBe(true);
  });

  it("HU-45: pasa a no disponible si el producto se desactiva o se agota después", async () => {
    await put(ids.p3);
    await api(`/admin/products/${ids.p3}/status`, { method: "PATCH", cookie: (await signInAdmin()).cookie, json: { active: false } });
    expect((await items())[0]!.available).toBe(false);
  });
});
