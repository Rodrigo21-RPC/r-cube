import { expect, type Browser } from "@playwright/test";
import { adminCookies } from "./admin-session";

/** Crea por la API del panel un producto de prueba (sin fotos) y devuelve su id, nombre y ruta (HU-56, HU-57). */
export async function createProduct(browser: Browser, extra: { tagline?: string; highlights?: string[] } = {}, prefix = "Producto de prueba") {
  const context = await browser.newContext({ baseURL: "http://localhost:4173" });
  await context.addCookies(await adminCookies(browser));
  const list = (await (await context.request.get("/api/admin/products")).json()) as { items: { id: string }[] };
  const base = (await (await context.request.get(`/api/admin/products/${list.items[0]!.id}`)).json()) as { brandId: string; categoryId: string };
  const name = `${prefix} ${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const res = await context.request.post("/api/admin/products", {
    data: { name, brandId: base.brandId, categoryId: base.categoryId, description: "Producto creado por una prueba", priceCents: 15900, stock: 4, active: true, ...extra },
  });
  expect(res.status(), await res.text()).toBe(201);
  const created = (await res.json()) as { id: string; slug: string };
  await context.close();
  return { id: created.id, name, path: `/producto/${created.slug}` };
}

/** Desactiva los productos de prueba para que no aparezcan como «relacionados» en otras pruebas. */
export async function deactivateProducts(browser: Browser, ids: string[]) {
  if (ids.length === 0) return;
  const context = await browser.newContext({ baseURL: "http://localhost:4173" });
  await context.addCookies(await adminCookies(browser));
  for (const id of ids) await context.request.patch(`/api/admin/products/${id}/status`, { data: { active: false } });
  await context.close();
}
