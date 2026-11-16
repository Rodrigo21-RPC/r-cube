import { expect, test } from "@playwright/test";

test.describe("HU-58: créditos de las fotos", () => {
  test("HU-58, FR-022: el pie de la tienda enlaza a la página «Créditos de las fotos»", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Créditos de las fotos" }).click();
    await expect(page).toHaveURL(/\/creditos-fotos$/);
    await expect(page.getByRole("heading", { level: 1, name: "Créditos de las fotos" })).toBeVisible();
  });

  test("HU-58, FR-023: aclara que las tarjetas son de R Cube y que las fotos pueden estar reducidas de tamaño", async ({ page }) => {
    await page.goto("/creditos-fotos");
    await expect(page.getByText("Las tarjetas de características, destacados y compra segura son de R Cube")).toBeVisible();
    await expect(page.getByText(/reducidas de tamaño/)).toBeVisible();
  });

  test("HU-58, FR-022: cada foto externa trae producto, autor, licencia y enlace de origen que abre en otra pestaña", async ({ page }) => {
    await page.goto("/creditos-fotos");
    await expect(page.getByRole("heading", { level: 2 }).getByRole("link", { name: "iPhone 13 Pro 128 GB" })).toHaveAttribute("href", "/producto/iphone-13-pro-128-gb");

    const row = page.getByRole("listitem").filter({ hasText: "iPhone 13 Pro con la pantalla encendida" }).first();
    await expect(row).toContainText("SimonWaldherr");
    const license = row.getByRole("link", { name: "CC BY-SA 4.0" });
    await expect(license).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/4.0/");
    const source = row.getByRole("link", { name: /Wikimedia Commons/ });
    await expect(source).toHaveAttribute("href", /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    for (const link of [license, source]) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
    }
  });

  test("HU-58, SC-004: todas las fotos reales de la demostración figuran con autor, licencia y enlace", async ({ page, request }) => {
    const credits = (await (await request.get("/api/catalog/photo-credits")).json()) as { external: { author: string; license: string; sourceUrl: string }[] };
    expect(credits.external.length).toBeGreaterThanOrEqual(60);
    for (const e of credits.external) {
      expect(e.author.trim()).not.toBe("");
      expect(e.license.trim()).not.toBe("");
      expect(e.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
    await page.goto("/creditos-fotos");
    await expect(page.getByRole("link", { name: /Wikimedia Commons/ })).toHaveCount(credits.external.length);
  });

  test("HU-58, SC-007: la página no produce desplazamiento horizontal", async ({ page }) => {
    await page.goto("/creditos-fotos");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
