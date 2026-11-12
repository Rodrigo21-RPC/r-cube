import { expect, test } from "@playwright/test";

test.describe("HU-25: tema claro y oscuro", () => {
  test("HU-25: sigue al sistema, cambia con el interruptor y recuerda sin parpadeo", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);

    const toggle = page.getByRole("button", { name: "Tema oscuro" });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    // Registra cada cambio de la clase desde el primer instante de la carga.
    await page.addInitScript(() => {
      const seen: string[] = [];
      (window as unknown as { __clases: string[] }).__clases = seen;
      new MutationObserver(() => seen.push(document.documentElement.className)).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      seen.push(document.documentElement.className);
    });
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    const history = await page.evaluate(() => (window as unknown as { __clases: string[] }).__clases);
    expect(history.some((c) => c.includes("dark"))).toBe(false);

    await page.getByRole("button", { name: "Tema oscuro" }).click();
    await page.goto("/catalogo");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
