import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { CartQuote, Facets } from "@shared/types";
import type { TaxonomyItem } from "@shared/admin-types";
import { api, ids, resetDb, rowsOf, signInAdmin, signUp } from "../helpers";

let admin: Awaited<ReturnType<typeof signInAdmin>>;
beforeEach(async () => {
  await resetDb();
  admin = await signInAdmin();
});

describe("HU-32: categorías y marcas", () => {
  it("HU-32: crea, renombra y rechaza nombres duplicados", async () => {
    const res = await api("/admin/categories", { method: "POST", cookie: admin.cookie, json: { name: "Tablets" } });
    expect(res.status).toBe(201);
    const cat = (await res.json()) as TaxonomyItem;
    expect(cat).toMatchObject({ name: "Tablets", slug: "tablets", active: true, activeProducts: 0 });
    expect((await api("/admin/categories", { method: "POST", cookie: admin.cookie, json: { name: "tablets" } })).status).toBe(409);
    const ren = await api(`/admin/categories/${cat.id}`, { method: "PATCH", cookie: admin.cookie, json: { name: "Tabletas" } });
    expect(((await ren.json()) as TaxonomyItem).name).toBe("Tabletas");
    const list = (await (await api("/admin/categories", { cookie: admin.cookie })).json()) as TaxonomyItem[];
    expect(list.find((c) => c.id === ids.catPhones)!.activeProducts).toBe(2);
  });

  it("HU-32: desactivar con productos activos avisa y pide confirmación", async () => {
    const r1 = await api(`/admin/categories/${ids.catPhones}`, { method: "PATCH", cookie: admin.cookie, json: { active: false } });
    expect(r1.status).toBe(409);
    expect(await r1.json()).toEqual({ error: expect.objectContaining({ code: "HAS_ACTIVE_PRODUCTS", count: 2 }) });
    const r2 = await api(`/admin/categories/${ids.catPhones}`, { method: "PATCH", cookie: admin.cookie, json: { active: false, confirm: true } });
    expect(r2.status).toBe(200);
    const facets = (await (await api("/catalog/facets")).json()) as Facets;
    expect(facets.categories.map((c) => c.slug)).not.toContain("celulares");
    expect((await rowsOf(sql`select action from audit_log`)).map((r) => r.action)).toContain("categoria");
  });

  it("Edge Cases: un producto de una marca desactivada queda no disponible en el carrito y no se puede comprar", async () => {
    const u = await signUp();
    await api(`/cart/items/${ids.p3}`, { method: "PUT", cookie: u.cookie, json: { quantity: 1 } });
    const r = await api(`/admin/brands/${ids.brandB}`, { method: "PATCH", cookie: admin.cookie, json: { active: false, confirm: true } });
    expect(r.status).toBe(200);
    const quote = (await (await api("/cart/quote", { method: "POST", json: { items: [{ productId: ids.p3, quantity: 1 }] } })).json()) as CartQuote;
    expect(quote.lines[0]!.available).toBe(false);
    const res = await api("/checkout/orders", {
      method: "POST",
      cookie: u.cookie,
      json: { delivery: { method: "pickup" }, payment: { method: "transfer" }, expectedTotalCents: 299900 },
    });
    expect(res.status).toBe(409);
  });
});
