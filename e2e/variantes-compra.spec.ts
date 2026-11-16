import { expect, test, type Page } from "@playwright/test";
import { registerCustomer } from "./admin-session";

const pick = (page: Page, value: string) => page.locator("label").filter({ hasText: new RegExp(`^${value}(Agotado)?$`) }).click();

test.describe("HU-44, HU-49, SC-001: variantes y cupones en la compra", () => {
  test("HU-44: elegir una variante cambia el precio, exige elegir y queda en el carrito", async ({ page }) => {
    await page.goto("/producto/motorola-edge-60-pro");
    await expect(page.getByRole("heading", { name: "Motorola Edge 60 Pro", level: 1 })).toBeVisible();
    await expect(page.getByText("S/ 2,199.00 a S/ 2,499.00")).toBeVisible(); // rango de precios (HU-43)

    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Elige color, almacenamiento o RAM" })).toBeVisible();

    await pick(page, "512 GB");
    await pick(page, "Negro");
    await expect(page.getByText("S/ 2,499.00").first()).toBeVisible();
    await expect(page.getByText(/^Quedan \d+$/).first()).toBeVisible(); // el stock exacto cambia con cada compra de prueba

    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(page.getByText(/se agregó al carrito/)).toBeVisible();
    await page.goto("/carrito");
    await expect(page.getByText("512 GB · Negro", { exact: true })).toBeVisible();
  });

  test("HU-44: una variante agotada no se puede elegir", async ({ page }) => {
    await page.goto("/producto/dell-xps-13");
    // La única variante de 32 GB está agotada: la opción queda marcada y deshabilitada (no se puede elegir).
    await expect(page.locator("label").filter({ hasText: /^32 GB/ })).toContainText("Agotado");
    await expect(page.getByRole("radio", { name: /32 GB/ })).toBeDisabled();
    await expect(page.getByRole("radio", { name: /16 GB/ })).toBeEnabled();
  });

  test("HU-49, SC-001: el visitante guarda su cupón, inicia sesión, lo aplica y compra con variante y descuento", async ({ page }) => {
    await page.goto("/producto/lenovo-tab-m10");
    await pick(page, "64 GB");
    await pick(page, "Gris");
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await page.goto("/carrito");
    await page.getByLabel("¿Tienes un cupón?").fill("bienvenido10");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await expect(page.getByText("Inicia sesión para aplicar tu cupón")).toBeVisible(); // US8, escenario 9

    await page.getByRole("button", { name: "Pagar" }).click();
    await expect(page).toHaveURL(/ingresar/);
    await registerCustomer(page); // al crear la cuenta el carrito y el cupón del navegador pasan a la cuenta
    await page.goto("/checkout");
    // El cupón se conserva y ahora sí se aplica.
    await expect(page.getByText(/Cupón/).first()).toBeVisible();
    await expect(page.getByText("BIENVENIDO10").first()).toBeVisible();
    await page.getByRole("radio", { name: "Recojo en tienda" }).check();
    await page.getByRole("radio", { name: "Tarjeta" }).check();
    await expect(page.getByRole("button", { name: /Confirmar pedido por S\/ 629\.10/ })).toBeVisible(); // 699.00 − 10 %
    await page.getByLabel("Número de tarjeta").fill("4111 1111 1111 1111");
    await page.getByLabel("Vencimiento (MM/AA)").fill("1230");
    await page.getByLabel("CVV").fill("123");
    await page.getByRole("button", { name: /Confirmar pedido/ }).click();
    await expect(page).toHaveURL(/\/pedido\/RC-\d{6}\/confirmacion/);
    await expect(page.getByText(/64 GB · Gris/)).toBeVisible();
    await expect(page.getByText("Cupón BIENVENIDO10")).toBeVisible();
  });

  test("HU-49: los cupones inválidos explican el motivo y no cambian el total", async ({ page }) => {
    await registerCustomer(page);
    await page.goto("/producto/lenovo-tab-m10");
    await pick(page, "64 GB");
    await pick(page, "Gris");
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await page.goto("/carrito");
    for (const [code, message] of [["VERANO5", "El cupón venció"], ["ULTIMO", "El cupón ya no tiene usos"], ["NOEXISTE", "El cupón no existe"]] as const) {
      await page.getByLabel("¿Tienes un cupón?").fill(code);
      await page.getByRole("button", { name: "Aplicar" }).click();
      await expect(page.getByRole("alert").filter({ hasText: message })).toBeVisible();
      await page.getByRole("alert").getByRole("button", { name: "Quitar" }).click();
    }
    await expect(page.getByText("Descuento")).toHaveCount(0);
  });
});
