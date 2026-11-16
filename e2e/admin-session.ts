import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

type Cookies = Awaited<ReturnType<BrowserContext["cookies"]>>;
const cache = new Map<string, Cookies>();

/**
 * Inicia sesión una sola vez por proceso y por cuenta y reutiliza la cookie: el ingreso tiene límite de intentos
 * (RNF-05) y no debe repetirse en cada prueba. Las contraseñas salen de SEED_ADMIN_PASSWORD y
 * SEED_CUSTOMER_PASSWORD (.env local o entorno de CI).
 */
async function cookiesFor(browser: Browser, key: string, login: (page: Page) => Promise<void>): Promise<Cookies> {
  const hit = cache.get(key);
  if (hit) return hit;
  const context = await browser.newContext({ baseURL: "http://localhost:4173" });
  const page = await context.newPage();
  await login(page);
  const cookies = await context.cookies();
  await context.close();
  cache.set(key, cookies);
  return cookies;
}

export function adminCookies(browser: Browser): Promise<Cookies> {
  return cookiesFor(browser, "admin", async (page) => {
    const password = process.env.SEED_ADMIN_PASSWORD ?? "";
    expect(password, "Falta SEED_ADMIN_PASSWORD en .env o en el entorno").not.toBe("");
    await page.goto("/admin");
    await page.getByLabel("Correo").fill("admin@rcube.pe");
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar al panel" }).click();
    await expect(page.getByRole("heading", { name: "Resumen", exact: true })).toBeVisible();
  });
}

/** Cliente de demostración (por defecto Mateo, dueño del pedido RC-000001). */
export function customerCookies(browser: Browser, email = "mateo@demo.pe"): Promise<Cookies> {
  return cookiesFor(browser, email, async (page) => {
    const password = process.env.SEED_CUSTOMER_PASSWORD ?? "";
    expect(password, "Falta SEED_CUSTOMER_PASSWORD en .env o en el entorno").not.toBe("");
    await page.goto("/ingresar");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(page).not.toHaveURL(/ingresar/);
  });
}

export const unique = (prefix = "e2e") => `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;

/** Registra un cliente nuevo por la interfaz y deja la sesión abierta en `page`. */
export async function registerCustomer(page: Page, email = `${unique()}@prueba.pe`, name = "Cliente Extras E2E") {
  await page.goto("/registro");
  await page.getByLabel("Nombre completo").fill(name);
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Celular").fill("987654321");
  await page.getByLabel("Contraseña").fill("clave-e2e-123");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).not.toHaveURL(/registro/);
  return email;
}

/** Compra por la API con la sesión de `page` (tarjeta de prueba, recojo en tienda) y devuelve el N.º de pedido. */
export async function buyByApi(page: Page, productId: string, opts: { variantId?: string } = {}): Promise<string> {
  await page.request.put(`/api/cart/items/${productId}`, { data: { quantity: 1, variantId: opts.variantId } });
  const cart = (await (await page.request.get("/api/cart")).json()) as { totals: { totalCents: number } };
  const res = await page.request.post("/api/checkout/orders", {
    data: {
      delivery: { method: "pickup" },
      payment: { method: "card", cardNumber: "4111111111111111", expMonth: 12, expYear: 2030, cvv: "123" },
      expectedTotalCents: cart.totals.totalCents,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { order: { number: string } }).order.number;
}

/** Cambia el estado de un pedido con la cuenta de administrador (genera avisos y, al entregar, permite reseñar). */
export async function adminSetStatus(browser: Browser, number: string, to: string, expectedStatus: string) {
  const context = await browser.newContext({ baseURL: "http://localhost:4173" });
  await context.addCookies(await adminCookies(browser));
  const res = await context.request.post(`/api/admin/orders/${number}/status`, { data: { to, expectedStatus } });
  expect(res.status(), await res.text()).toBe(200);
  await context.close();
}
