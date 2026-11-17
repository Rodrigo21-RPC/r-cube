import { expect, test, type Browser, type Page } from "@playwright/test";
import { adminCookies, customerCookies } from "./admin-session";

/**
 * RNF-02, SC-007: ninguna pantalla de la tienda ni del panel se desplaza de lado. Se fuerza una fuente ancha (como la de
 * Linux en el CI) para que el resultado no dependa del sistema operativo.
 */
const WIDE = '*{font-family:Verdana,"DejaVu Sans",sans-serif !important}';

const VISITOR = ["/", "/catalogo", "/catalogo?category=laptops&sort=price_asc", "/catalogo?q=zzzzzz", "/producto/samsung-galaxy-s23-256-gb", "/producto/motorola-edge-60-pro", "/creditos-fotos", "/ingresar", "/registro", "/carrito", "/no-existe"];
const CUSTOMER = ["/carrito", "/checkout", "/cuenta", "/cuenta/direcciones", "/favoritos", "/avisos", "/pedidos", "/pedidos/RC-000001", "/pedidos/RC-000001/comprobante", "/pedido/RC-000001/confirmacion"];
const ADMIN = ["/admin", "/admin/productos", "/admin/productos/nuevo", "/admin/productos/prod-motorola-edge-60-pro", "/admin/categorias", "/admin/pedidos", "/admin/pedidos/RC-000001", "/admin/pagos", "/admin/clientes", "/admin/configuracion", "/admin/resenas", "/admin/cupones", "/admin/auditoria"];

async function overflowOf(page: Page, path: string, wide: boolean) {
  await page.goto(path);
  await expect(page.getByRole("main")).toBeVisible();
  await page.waitForLoadState("networkidle");
  if (wide) await page.addStyleTag({ content: WIDE });
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function check(browser: Browser, paths: string[], role: "visitante" | "cliente" | "admin", size: { width: number; height: number }, wide: boolean) {
  const context = await browser.newContext({ baseURL: "http://localhost:4173", viewport: size });
  if (role === "cliente") {
    await context.addCookies(await customerCookies(browser));
    await context.request.put("/api/cart/items/prod-huawei-p60", { data: { quantity: 1 } });
  }
  if (role === "admin") await context.addCookies(await adminCookies(browser));
  const page = await context.newPage();
  const failures: string[] = [];
  for (const path of paths) {
    const overflow = await overflowOf(page, path, wide);
    if (overflow > 0) failures.push(`${path}: ${overflow} px`);
  }
  await context.close();
  expect(failures, `desplazamiento lateral en ${size.width} px`).toEqual([]);
}

test.describe("RNF-02, SC-007: sin desplazamiento lateral en ninguna pantalla", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "claro-movil", "el tamaño se fija en la prueba; basta una pasada");
    test.setTimeout(240_000);
  });
  const NARROW = { width: 320, height: 640 };

  test("HU-01 a HU-06, HU-55, HU-58: tienda sin sesión a 320 px con fuente ancha", async ({ browser }) => {
    await check(browser, VISITOR, "visitante", NARROW, true);
  });

  test("HU-07 a HU-24, HU-45, HU-48, HU-52, HU-53: tienda con sesión a 320 px con fuente ancha", async ({ browser }) => {
    await check(browser, CUSTOMER, "cliente", NARROW, true);
  });

  test("HU-26 a HU-42, HU-47, HU-50: panel a 320 px con fuente ancha", async ({ browser }) => {
    await check(browser, ADMIN, "admin", NARROW, true);
  });

  test("HU-26 a HU-42: panel en un teléfono y en escritorio", async ({ browser }) => {
    await check(browser, ADMIN, "admin", { width: 412, height: 915 }, false);
    await check(browser, ADMIN, "admin", { width: 1280, height: 800 }, false);
  });
});
