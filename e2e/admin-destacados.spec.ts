import { expect, test, type Page } from "@playwright/test";
import { adminCookies } from "./admin-session";
import { createProduct, deactivateProducts } from "./productos-prueba";

const tagline = (page: Page) => page.getByLabel("Frase destacada", { exact: true });
const addHighlight = (page: Page) => page.getByRole("button", { name: "Agregar destacado" });
const highlight = (page: Page, n: number) => page.getByLabel(`Destacado ${n}`, { exact: true });
const save = (page: Page) => page.getByRole("button", { name: "Guardar cambios" });

test.describe("HU-57: editar la frase y los destacados desde el panel", () => {
  const created: string[] = [];
  test.afterEach(async ({ browser }) => {
    await deactivateProducts(browser, created.splice(0));
  });

  async function open(page: Page, browser: Parameters<typeof createProduct>[0]) {
    const product = await createProduct(browser, {}, "Producto panel destacados");
    created.push(product.id);
    await page.context().addCookies(await adminCookies(browser));
    await page.goto(`/admin/productos/${product.id}`);
    await expect(tagline(page)).toBeVisible();
    return product;
  }

  test("HU-57, SC-005: escribir la frase y 3 destacados, guardar, verlos en la tienda y en la auditoría", async ({ page, browser }) => {
    const { name, path } = await open(page, browser);
    await tagline(page).fill("Una frase de prueba escrita desde el panel");
    for (const n of [1, 2, 3]) {
      await addHighlight(page).click();
      await highlight(page, n).fill(`Destacado de prueba ${n}`);
    }
    await save(page).click();
    await expect(page.getByText("Producto guardado.")).toBeVisible();

    await page.goto(path);
    await expect(page.getByTestId("frase")).toHaveText("Una frase de prueba escrita desde el panel");
    await expect(page.getByTestId("destacados").getByRole("listitem")).toHaveText(["Destacado de prueba 1", "Destacado de prueba 2", "Destacado de prueba 3"]);

    await page.goto("/admin/auditoria");
    await expect(page.getByText(`Frase y destacados de ${name} actualizados`).first()).toBeVisible();
  });

  test("HU-57: al volver a abrir el producto, el formulario trae lo guardado", async ({ page, browser }) => {
    const { id } = await open(page, browser);
    await tagline(page).fill("Frase que queda guardada");
    await addHighlight(page).click();
    await highlight(page, 1).fill("Viñeta que queda guardada");
    await save(page).click();
    await expect(page.getByText("Producto guardado.")).toBeVisible();
    await page.goto(`/admin/productos/${id}`);
    await expect(tagline(page)).toHaveValue("Frase que queda guardada");
    await expect(highlight(page, 1)).toHaveValue("Viñeta que queda guardada");
  });

  test("HU-57, FR-018: una frase de 91 caracteres muestra «La frase no puede pasar de 90 caracteres» y no se guarda", async ({ page, browser }) => {
    const { path } = await open(page, browser);
    await tagline(page).fill("x".repeat(91));
    await save(page).click();
    await expect(page.getByText("La frase no puede pasar de 90 caracteres")).toBeVisible();
    await page.goto(path);
    await expect(page.getByTestId("destacados")).toHaveCount(0);
  });

  test("HU-57, FR-018: un destacado de 61 caracteres muestra «Cada destacado admite hasta 60 caracteres»", async ({ page, browser }) => {
    await open(page, browser);
    await addHighlight(page).click();
    await highlight(page, 1).fill("x".repeat(61));
    await save(page).click();
    await expect(page.getByText("Cada destacado admite hasta 60 caracteres")).toBeVisible();
  });

  test("HU-57, FR-018: un sexto destacado no se agrega y muestra «Máximo 5 destacados»", async ({ page, browser }) => {
    await open(page, browser);
    for (let n = 1; n <= 5; n++) await addHighlight(page).click();
    await addHighlight(page).click();
    await expect(page.getByText("Máximo 5 destacados")).toBeVisible();
    await expect(page.getByLabel(/^Destacado \d$/)).toHaveCount(5);
  });

  test("HU-57: «Quitar destacado» elimina la fila", async ({ page, browser }) => {
    await open(page, browser);
    await addHighlight(page).click();
    await addHighlight(page).click();
    await highlight(page, 1).fill("Primero");
    await highlight(page, 2).fill("Segundo");
    await page.getByRole("button", { name: "Quitar destacado 1" }).click();
    await expect(page.getByLabel(/^Destacado \d$/)).toHaveCount(1);
    await expect(highlight(page, 1)).toHaveValue("Segundo");
  });
});
