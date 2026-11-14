import { expect, test, type Page } from "@playwright/test";

const unique = () => `e2e${Date.now()}${Math.floor(Math.random() * 1000)}@prueba.pe`;

async function addProduct(page: Page, slug: string) {
  await page.goto(`/producto/${slug}`);
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page.getByText(/se agregó al carrito/)).toBeVisible();
}

async function register(page: Page, email: string) {
  await page.getByLabel("Nombre completo").fill("Cliente E2E");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Celular").fill("987654321");
  await page.getByLabel("Contraseña").fill("clave-e2e-123");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
}

test.describe("HU-11 a HU-21: compra completa", () => {
  test("HU-16, HU-21: visitante agrega, se registra, paga con 4111 y ve su pedido Pagado", async ({ page }) => {
    await addProduct(page, "kit-de-herramientas-de-precision-32-en-1");
    await addProduct(page, "pasta-termica-4-g");
    await expect(page.getByRole("link", { name: /Carrito, 2 unidades/ })).toBeVisible();

    await page.goto("/carrito");
    await expect(page.getByText("IGV (18 %) incluido")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: /Carrito, 2 unidades/ })).toBeVisible();
    await page.getByRole("button", { name: "Pagar" }).click();

    await expect(page).toHaveURL(/ingresar/);
    await page.getByRole("link", { name: "Regístrate" }).click();
    await register(page, unique());

    await expect(page).toHaveURL(/checkout/);
    await page.getByLabel("Dirección").fill("Av. Arequipa 2450");
    await page.getByLabel("Distrito").fill("Lince");
    await expect(page.getByText("Pago simulado, no se cobra dinero real.")).toBeVisible();
    await page.getByRole("radio", { name: "Tarjeta" }).check();

    // HU-16: primero un rechazo, sin pedido y con el carrito intacto.
    await page.getByLabel("Número de tarjeta").fill("4000 0000 0000 0002");
    await page.getByLabel("Vencimiento (MM/AA)").fill("1230");
    await page.getByLabel("CVV").fill("123");
    await page.getByRole("button", { name: /Confirmar pedido/ }).click();
    await expect(page.getByRole("alert").filter({ hasText: "rechazado" })).toBeVisible();

    await page.getByLabel("Número de tarjeta").fill("4111 1111 1111 1111");
    await page.getByRole("button", { name: /Confirmar pedido/ }).click();
    await expect(page).toHaveURL(/\/pedido\/RC-\d{6}\/confirmacion/);
    await expect(page.getByText("Pagado")).toBeVisible();
    await expect(page.getByText(/terminada en 1111/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Carrito, 0 unidades/ })).toBeVisible();
  });

  test("HU-17, HU-21: compra con Yape queda Pendiente de pago con aviso de 24 h", async ({ page }) => {
    await page.goto("/registro");
    await register(page, unique());
    await expect(page).toHaveURL("/");
    await addProduct(page, "memoria-ram-ddr4-16-gb");
    await page.goto("/checkout");
    await page.getByRole("radio", { name: "Recojo en tienda" }).check();
    await page.getByRole("radio", { name: "Yape o Plin" }).check();
    await expect(page.getByRole("img", { name: /QR de ejemplo/ })).toBeVisible();
    await page.getByLabel("Código de operación").fill("12345678");
    await page.getByRole("button", { name: /Confirmar pedido/ }).click();
    await expect(page.getByText("Pendiente de pago")).toBeVisible();
    await expect(page.getByText(/se cancelará automáticamente/)).toBeVisible();
  });

  test("HU-12: al cerrar sesión el carrito queda vacío y vuelve al ingresar", async ({ page }) => {
    const email = unique();
    await page.goto("/registro");
    await register(page, email);
    await expect(page).toHaveURL("/");
    await addProduct(page, "ssd-nvme-1-tb");
    await expect(page.getByRole("link", { name: /Carrito, 1 unidad/ })).toBeVisible();
    await page.goto("/cuenta");
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("link", { name: /Carrito, 0 unidades/ })).toBeVisible();
    await page.goto("/ingresar");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill("clave-e2e-123");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByRole("link", { name: /Carrito, 1 unidad/ })).toBeVisible();
  });
});
