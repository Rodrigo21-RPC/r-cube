import { expect, test } from "@playwright/test";
import { adminCookies, unique } from "./admin-session";

test.describe("HU-43, HU-47, HU-50, SC-005: administración de variantes, reseñas y cupones", () => {
  test.beforeEach(async ({ page, browser }) => {
    await page.context().addCookies(await adminCookies(browser));
  });

  test("HU-43, SC-005: crear un producto y agregarle variantes muestra el rango de precios en la lista", async ({ page }) => {
    const name = unique("Tablet variantes ");
    await page.goto("/admin/productos/nuevo");
    await page.getByLabel("Nombre").fill(name);
    await page.getByLabel("Precio (S/, con IGV)").fill("100.00");
    await page.getByLabel("Stock inicial").fill("0");
    await page.getByRole("button", { name: "Crear producto" }).click();
    await expect(page).toHaveURL(/\/admin\/productos\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Variantes", exact: true })).toBeVisible();

    const addVariant = async (sku: string, storage: string, price: string, stock: string) => {
      await page.getByRole("button", { name: "Agregar variante" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("SKU").fill(sku);
      await dialog.getByLabel("Almacenamiento").fill(storage);
      await dialog.getByLabel("Precio (S/, con IGV)").fill(price);
      await dialog.getByLabel("Stock inicial").fill(stock);
      await dialog.getByRole("button", { name: "Guardar variante" }).click();
      await expect(page.getByRole("cell", { name: sku, exact: true })).toBeVisible();
    };
    const tag = unique("").slice(-6);
    await addVariant(`E2E-64-${tag}`, "64 GB", "300.00", "5");
    await addVariant(`E2E-128-${tag}`, "128 GB", "450.00", "3");

    // SKU repetido → error en el campo (HU-43).
    await page.getByRole("button", { name: "Agregar variante" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("SKU").fill(`E2E-64-${tag}`);
    await dialog.getByLabel("Almacenamiento").fill("256 GB");
    await dialog.getByLabel("Precio (S/, con IGV)").fill("500.00");
    await dialog.getByRole("button", { name: "Guardar variante" }).click();
    await expect(dialog.getByText("Ese SKU ya existe")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancelar" }).click();

    await page.goto(`/admin/productos?q=${encodeURIComponent(name)}`);
    const row = page.getByRole("row", { name: new RegExp(name) });
    await expect(row.getByText("S/ 300.00 a S/ 450.00")).toBeVisible();
    await expect(row.getByText("2 variantes")).toBeVisible();
  });

  test("HU-47: ocultar y mostrar una reseña, con sus entradas en la auditoría", async ({ page }) => {
    await page.goto("/admin/resenas");
    await expect(page.getByRole("heading", { name: "Reseñas", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: /^Ocultar la reseña de Mateo Quispe/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Ocultar reseña" }).click();
    await expect(page.getByRole("button", { name: /^Mostrar la reseña de Mateo Quispe/ })).toBeVisible();
    await page.getByRole("button", { name: /^Mostrar la reseña de Mateo Quispe/ }).click();
    await expect(page.getByRole("button", { name: /^Ocultar la reseña de Mateo Quispe/ })).toBeVisible();

    await page.goto("/admin/auditoria?action=resena_oculta");
    await expect(page.getByRole("table", { name: "Registro de auditoría" }).getByText(/Reseña de Mateo Quispe/).first()).toBeVisible();
  });

  test("HU-50, SC-005: crear, desactivar, activar y borrar un cupón", async ({ page }) => {
    const code = `E2E${unique("").slice(-7)}`;
    await page.goto("/admin/cupones");
    await expect(page.getByRole("heading", { name: "Cupones", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Crear cupón" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Código").fill(code);
    await dialog.getByLabel("Porcentaje (%)").fill("15");
    await dialog.getByLabel("Usos máximos").fill("5");
    await dialog.getByRole("button", { name: "Guardar cupón" }).click();
    const row = page.getByRole("row", { name: new RegExp(code) });
    await expect(row.getByText("Activo")).toBeVisible();
    await expect(row.getByText("0 de 5")).toBeVisible();

    await row.getByRole("button", { name: `Desactivar ${code}` }).click();
    await expect(row.getByText("Inactivo")).toBeVisible();
    await row.getByRole("button", { name: `Activar ${code}` }).click();
    await expect(row.getByText("Activo")).toBeVisible();

    await page.goto("/admin/auditoria?action=cupon");
    await expect(page.getByRole("table", { name: "Registro de auditoría" }).getByText(new RegExp(code)).first()).toBeVisible();

    await page.goto("/admin/cupones");
    await page.getByRole("button", { name: `Borrar ${code}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Borrar cupón" }).click();
    await expect(page.getByRole("row", { name: new RegExp(code) })).toHaveCount(0);
  });
});

