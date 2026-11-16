import { expect, test } from "@playwright/test";
import { createProduct, deactivateProducts } from "./productos-prueba";

test.describe("HU-56: frase y destacados del producto", () => {
  const created: string[] = [];
  test.afterEach(async ({ browser }) => {
    await deactivateProducts(browser, created.splice(0));
  });

  test("HU-56, FR-015: el iPhone 13 Pro muestra una frase y de 3 a 5 viñetas bajo el título y antes del precio", async ({ page }) => {
    await page.goto("/producto/iphone-13-pro-128-gb");
    const title = page.getByRole("heading", { name: "iPhone 13 Pro 128 GB", level: 1 });
    await expect(title).toBeVisible();
    const block = page.getByTestId("destacados");
    await expect(block).toBeVisible();
    await expect(block.getByTestId("frase")).not.toBeEmpty();
    const bullets = block.getByRole("listitem");
    expect(await bullets.count()).toBeGreaterThanOrEqual(3);
    expect(await bullets.count()).toBeLessThanOrEqual(5);

    // Orden del documento: título, destacados y después el precio.
    const order = await page.evaluate(() => {
      const t = document.querySelector("h1")!;
      const d = document.querySelector('[data-testid="destacados"]')!;
      const price = [...document.querySelectorAll("p")].find((p) => p.textContent?.includes("Precio con IGV incluido"))!;
      const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return { tituloAntes: before(t, d), destacadosAntes: before(d, price) };
    });
    expect(order).toEqual({ tituloAntes: true, destacadosAntes: true });

    // La descripción y las especificaciones siguen donde estaban.
    await expect(page.getByText("Pantalla ProMotion de 120 Hz y triple cámara para foto y video profesional.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Especificaciones" })).toBeVisible();
  });

  test("HU-56, FR-015: un producto sin frase ni destacados no muestra el bloque", async ({ page, browser }) => {
    const { id, name, path } = await createProduct(browser, {}, "Producto destacados");
    created.push(id);
    await page.goto(path);
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await expect(page.getByTestId("destacados")).toHaveCount(0);
  });

  test("HU-56, FR-015: con solo la frase o solo las viñetas se ve lo que existe", async ({ page, browser }) => {
    const soloFrase = await createProduct(browser, { tagline: "Solo una frase llamativa" }, "Producto destacados");
    created.push(soloFrase.id);
    await page.goto(soloFrase.path);
    await expect(page.getByTestId("frase")).toHaveText("Solo una frase llamativa");
    await expect(page.getByTestId("destacados").getByRole("listitem")).toHaveCount(0);

    const soloVinetas = await createProduct(browser, { highlights: ["Primera viñeta", "Segunda viñeta"] }, "Producto destacados");
    created.push(soloVinetas.id);
    await page.goto(soloVinetas.path);
    await expect(page.getByTestId("frase")).toHaveCount(0);
    await expect(page.getByTestId("destacados").getByRole("listitem")).toHaveCount(2);
  });

  test("HU-56, FR-016: los símbolos de HTML se ven como texto, sin interpretarse", async ({ page, browser }) => {
    const { id, path } = await createProduct(browser, { tagline: "<b>hola</b> mundo", highlights: ["<i>cursiva</i>"] }, "Producto destacados");
    created.push(id);
    await page.goto(path);
    await expect(page.getByTestId("frase")).toHaveText("<b>hola</b> mundo");
    await expect(page.getByTestId("destacados").getByRole("listitem").first()).toHaveText("<i>cursiva</i>");
    await expect(page.getByTestId("destacados").locator("b, i")).toHaveCount(0);
  });
});
