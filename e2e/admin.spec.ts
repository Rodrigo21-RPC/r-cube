import { expect, test, type Browser, type Page } from "@playwright/test";
import { adminCookies } from "./admin-session";

const unique = (p: string) => `${p}${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function registerCustomer(page: Page, email: string) {
  await page.goto("/registro");
  await page.getByLabel("Nombre completo").fill("Cliente Panel E2E");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Celular").fill("987654321");
  await page.getByLabel("Contraseña").fill("clave-e2e-123");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).not.toHaveURL(/registro/);
}

async function adminSignIn(page: Page, browser: Browser) {
  await page.context().addCookies(await adminCookies(browser));
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Resumen", exact: true })).toBeVisible();
}

test.describe("HU-26 a HU-42: panel de administración", () => {
  test("HU-26: un cliente no puede entrar al panel", async ({ page }) => {
    await registerCustomer(page, `${unique("e2e")}@prueba.pe`);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "No tienes permiso para entrar al panel" })).toBeVisible();
  });

  test("HU-27, HU-28, HU-34 a HU-42: el administrador crea un producto y recorre el panel", async ({ page, browser }) => {
    await adminSignIn(page, browser);
    await expect(page.getByRole("heading", { name: "Últimos pedidos" })).toBeVisible();

    const name = unique("Funda E2E ");
    await page.goto("/admin/productos/nuevo");
    await page.getByLabel("Nombre").fill(name);
    await page.getByLabel("Precio (S/, con IGV)").fill("49.90");
    await page.getByLabel("Stock inicial").fill("5");
    await page.getByRole("button", { name: "Crear producto" }).click();
    await expect(page.getByText("Producto creado. Ahora puedes subir sus fotos.")).toBeVisible();

    await page.goto(`/admin/productos?q=${encodeURIComponent(name)}`);
    await expect(page.getByText(name)).toBeVisible();

    await page.goto("/admin/pedidos");
    await expect(page.getByRole("heading", { name: "Pedidos", exact: true })).toBeVisible();
    await page.getByRole("table", { name: "Pedidos" }).getByRole("link").first().click();
    await expect(page.getByRole("heading", { name: /^Pedido RC-/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Línea de tiempo" })).toBeVisible();

    await page.goto("/admin/pagos");
    await expect(page.getByRole("heading", { name: "Pagos por confirmar" })).toBeVisible();
    await page.goto("/admin/configuracion");
    await expect(page.getByRole("heading", { name: "Configuración de la tienda" })).toBeVisible();

    await page.goto("/admin/auditoria?action=producto_creado");
    await expect(page.getByRole("table", { name: "Registro de auditoría" }).getByText(name).first()).toBeVisible();
  });

  test("HU-40: bloquear a un cliente le impide ingresar", async ({ page, browser }) => {
    const email = `${unique("bloq")}@prueba.pe`;
    const customer = await browser.newContext();
    const cp = await customer.newPage();
    await registerCustomer(cp, email);

    await adminSignIn(page, browser);
    await page.goto(`/admin/clientes?q=${encodeURIComponent(email)}`);
    await page.getByRole("link", { name: "Cliente Panel E2E" }).click();
    await page.getByRole("button", { name: "Bloquear cliente" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Bloquear cliente" }).click();
    await expect(page.getByText("Bloqueado", { exact: true })).toBeVisible();

    await cp.goto("/ingresar");
    await cp.getByLabel("Correo").fill(email);
    await cp.getByLabel("Contraseña").fill("clave-e2e-123");
    await cp.getByRole("button", { name: "Ingresar" }).click();
    await expect(cp.getByText(/bloqueada/)).toBeVisible();

    await page.getByRole("button", { name: "Reactivar cliente" }).click();
    await expect(page.getByText("Activo", { exact: true })).toBeVisible();
    await customer.close();
  });
});
