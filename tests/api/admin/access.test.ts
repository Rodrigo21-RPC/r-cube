import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { api, resetDb, signInAdmin, signUp, withDb } from "../helpers";

beforeEach(resetDb);

describe("HU-26, FR-002: el panel exige rol de administrador", () => {
  it("HU-26: sin sesión responde 401 sin datos", async () => {
    const res = await api("/admin/summary");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: expect.objectContaining({ code: "UNAUTHENTICATED" }) });
  });

  it("HU-26: un cliente recibe 403 sin datos", async () => {
    const u = await signUp();
    const res = await api("/admin/summary", { cookie: u.cookie });
    expect(res.status).toBe(403);
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(["error"]);
  });

  it("HU-26: un administrador accede", async () => {
    const a = await signInAdmin();
    expect((await api("/admin/summary", { cookie: a.cookie })).status).toBe(200);
  });
});

describe("HU-26, FR-002, RNF-05: ninguna ruta del panel responde sin rol de administrador", () => {
  const ROUTES: [string, string][] = [
    ["GET", "/admin/summary"], ["GET", "/admin/products"], ["POST", "/admin/products"], ["GET", "/admin/products/x"],
    ["PATCH", "/admin/products/x"], ["PATCH", "/admin/products/x/status"], ["POST", "/admin/products/x/images"],
    ["GET", "/admin/products/x/stock-movements"], ["POST", "/admin/products/x/stock-adjustments"],
    ["GET", "/admin/categories"], ["POST", "/admin/categories"], ["GET", "/admin/brands"], ["POST", "/admin/brands"],
    ["GET", "/admin/orders"], ["GET", "/admin/orders/export.csv"], ["GET", "/admin/orders/RC-000001"],
    ["POST", "/admin/orders/RC-000001/status"], ["GET", "/admin/payments/pending"],
    ["POST", "/admin/orders/RC-000001/payment/confirm"], ["POST", "/admin/orders/RC-000001/payment/reject"],
    ["GET", "/admin/settings"], ["PATCH", "/admin/settings"], ["POST", "/admin/zones"], ["PATCH", "/admin/zones/x"],
    ["GET", "/admin/customers"], ["GET", "/admin/customers/x"], ["POST", "/admin/customers/x/block"],
    ["POST", "/admin/customers/x/unblock"], ["GET", "/admin/audit"],
    // Feature 003: variantes, cupones y moderación de reseñas.
    ["GET", "/admin/products/x/variants"], ["POST", "/admin/products/x/variants"], ["PATCH", "/admin/variants/x"], ["DELETE", "/admin/variants/x"],
    ["GET", "/admin/coupons"], ["POST", "/admin/coupons"], ["PATCH", "/admin/coupons/x"], ["DELETE", "/admin/coupons/x"],
    ["GET", "/admin/reviews"], ["POST", "/admin/reviews/x/hide"], ["POST", "/admin/reviews/x/show"],
  ];

  it("RNF-05: sin sesión 401 y con sesión de cliente 403, sin tocar datos", async () => {
    const u = await signUp();
    for (const [method, path] of ROUTES) {
      const anon = await api(path, { method, json: method === "GET" ? undefined : {} });
      expect(anon.status, `${method} ${path} sin sesión`).toBe(401);
      const cust = await api(path, { method, cookie: u.cookie, json: method === "GET" ? undefined : {} });
      expect(cust.status, `${method} ${path} como cliente`).toBe(403);
    }
  });

  it("HU-31: /api/media rechaza claves fuera de productos/ y escapes mal formados con 404", async () => {
    for (const key of ["otro/x.png", "productos/../x.png", "productos/%E0%A4%A"]) {
      expect((await api(`/media/${key}`)).status, key).toBe(404);
    }
  });
});

describe("FR-032, RN-08: las rutas de cliente nuevas exigen sesión de un cliente no bloqueado", () => {
  const CUSTOMER_ROUTES: [string, string][] = [
    ["GET", "/favorites"], ["GET", "/favorites/ids"], ["PUT", "/favorites/x"], ["DELETE", "/favorites/x"],
    ["GET", "/account/addresses"], ["POST", "/account/addresses"], ["PATCH", "/account/addresses/x"], ["POST", "/account/addresses/x/default"], ["DELETE", "/account/addresses/x"],
    ["GET", "/notifications/summary"], ["GET", "/notifications"], ["POST", "/notifications/read-all"], ["POST", "/notifications/x/read"],
    ["GET", "/orders/RC-000001/receipt"], ["POST", "/catalog/products/x/reviews"],
  ];
  const call = (method: string, path: string, cookie?: string) => api(path, { method, cookie, json: method === "GET" || method === "DELETE" ? undefined : {} });

  it("sin sesión responden 401 sin datos", async () => {
    for (const [method, path] of CUSTOMER_ROUTES) expect((await call(method, path)).status, `${method} ${path}`).toBe(401);
  });

  it("un cliente bloqueado queda como sin sesión (401) en todas", async () => {
    const u = await signUp();
    await withDb((db) => db.execute(sql`update "user" set blocked = true where id = ${u.user.id}`));
    for (const [method, path] of CUSTOMER_ROUTES) expect((await call(method, path, u.cookie)).status, `${method} ${path}`).toBe(401);
  });

  it("favoritos, avisos y comprobante no los usa una cuenta de administrador (403)", async () => {
    const a = await signInAdmin();
    for (const [method, path] of [["GET", "/favorites"], ["GET", "/notifications/summary"], ["POST", "/catalog/products/x/reviews"]] as const)
      expect((await call(method, path, a.cookie)).status, `${method} ${path}`).toBe(403);
  });
});
