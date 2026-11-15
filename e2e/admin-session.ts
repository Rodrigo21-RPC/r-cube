import { expect, type Browser, type BrowserContext } from "@playwright/test";

type Cookies = Awaited<ReturnType<BrowserContext["cookies"]>>;
let cached: Cookies | null = null;

/**
 * Inicia sesión como administrador una sola vez por proceso y reutiliza la cookie:
 * el ingreso tiene límite de intentos (RNF-05) y no debe repetirse en cada prueba.
 * La contraseña sale de SEED_ADMIN_PASSWORD (.env local o entorno de CI).
 */
export async function adminCookies(browser: Browser): Promise<Cookies> {
  if (cached) return cached;
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  expect(password, "Falta SEED_ADMIN_PASSWORD en .env o en el entorno").not.toBe("");
  const context = await browser.newContext({ baseURL: "http://localhost:4173" });
  const page = await context.newPage();
  await page.goto("/admin");
  await page.getByLabel("Correo").fill("admin@rcube.pe");
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar al panel" }).click();
  await expect(page.getByRole("heading", { name: "Resumen", exact: true })).toBeVisible();
  cached = await context.cookies();
  await context.close();
  return cached;
}
