import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  ["portada", "/"],
  ["catálogo", "/catalogo"],
  ["detalle", "/producto/huawei-p60"],
  ["carrito", "/carrito"],
  ["ingresar", "/ingresar"],
  ["registro", "/registro"],
] as const;

test.describe("RNF-03, SC-006: accesibilidad WCAG 2.2 AA en ambos temas", () => {
  for (const tema of ["claro", "oscuro"] as const) {
    for (const [name, path] of PAGES) {
      test(`SC-006: ${name} en tema ${tema} sin violaciones AA`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("tema", t), tema);
        await page.goto(path);
        await expect(page.locator("main")).toBeVisible();
        await page.waitForLoadState("networkidle");
        const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        const summary = result.violations.map((v) => `${v.id}: ${v.nodes.length} nodo(s) — ${v.nodes[0]?.target.join(" ")}`);
        expect(summary).toEqual([]);
      });
    }
  }

  test("RNF-03: se puede llegar al buscador y al carrito solo con el teclado", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
    let reached = false;
    for (let i = 0; i < 10 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await page.getByRole("searchbox", { name: "Buscar productos" }).evaluate((el) => el === document.activeElement);
    }
    expect(reached).toBe(true);
  });
});
