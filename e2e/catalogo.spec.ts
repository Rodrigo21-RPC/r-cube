import { expect, test } from "@playwright/test";

test.describe("HU-01 a HU-05: descubrir productos", () => {
  test("HU-02, HU-03, HU-04: buscar, filtrar, ordenar y recargar conserva todo", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Buscar productos" }).fill("SAMSUNG");
    await page.getByRole("searchbox", { name: "Buscar productos" }).press("Enter");
    await expect(page.getByText(/resultados para «SAMSUNG»/)).toBeVisible();

    await page.goto("/catalogo?category=celulares");
    await expect(page.getByRole("heading", { name: "Catálogo", level: 1 })).toBeVisible();
    await expect(page.getByText(/^\d+ productos$/)).toBeVisible();
    const filtros = page.getByRole("complementary", { name: "Filtros" });
    if (!(await filtros.isVisible())) await page.getByRole("button", { name: "Filtros", exact: true }).click();
    const apple = filtros.getByRole("checkbox", { name: /^Apple/ });
    await apple.click();
    await expect(apple).toBeChecked();
    await expect(page.getByRole("button", { name: "Quitar filtro Apple" })).toBeVisible();
    await page.getByLabel("Ordenar por").selectOption("price_desc");
    await expect(page).toHaveURL(/brand=apple/);
    await expect(page).toHaveURL(/sort=price_desc/);

    await expect(page.getByRole("heading", { level: 3 }).first()).toHaveText("iPhone 15 Pro 256 GB");
    const before = await page.getByRole("heading", { level: 3 }).allTextContents();
    await page.reload();
    await expect(page.getByRole("heading", { level: 3 })).toHaveText(before);
    await expect(page.getByRole("button", { name: "Quitar filtro Celulares" })).toBeVisible();

    await page.getByRole("button", { name: "Limpiar filtros" }).first().click();
    await expect(page.getByRole("button", { name: /Quitar filtro/ })).toHaveCount(0);
  });

  test("HU-01: 12 productos por página y paginación", async ({ page }) => {
    await page.goto("/catalogo");
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(12);
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page).toHaveURL(/page=2/);
  });

  test("HU-02: búsqueda sin coincidencias muestra mensaje claro", async ({ page }) => {
    await page.goto("/catalogo?q=xyzxyz");
    await expect(page.getByRole("heading", { name: "No encontramos resultados para «xyzxyz»" })).toBeVisible();
  });

  test("HU-05: detalle agotado con botón deshabilitado y detalle con pocas unidades", async ({ page }) => {
    await page.goto("/producto/samsung-galaxy-s22-ultra-256-gb");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Samsung Galaxy S22 Ultra 256 GB");
    await expect(page.getByText("Agotado")).toBeVisible();
    await expect(page.getByRole("button", { name: "Agregar al carrito" })).toBeDisabled();

    await page.goto("/producto/huawei-p60");
    await expect(page.getByText("Quedan 3")).toBeVisible();
    await expect(page.getByText("Precio con IGV incluido")).toBeVisible();
    await expect(page.getByRole("button", { name: "Agregar al carrito" })).toBeEnabled();
    await expect(page.getByRole("heading", { name: "Especificaciones" })).toBeVisible();
  });
});
