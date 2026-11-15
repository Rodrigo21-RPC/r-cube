import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { adminCookies } from "./admin-session";

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

const ADMIN_PAGES = [
  ["resumen", "/admin", null],
  ["productos", "/admin/productos", null],
  ["formulario de producto", "/admin/productos/nuevo", null],
  ["pedidos", "/admin/pedidos", null],
  ["detalle de pedido", "/admin/pedidos", "Pedidos"],
  ["pagos", "/admin/pagos", null],
  ["clientes", "/admin/clientes", null],
  ["detalle de cliente", "/admin/clientes", "Clientes"],
  ["configuración", "/admin/configuracion", null],
  ["auditoría", "/admin/auditoria", null],
] as const;

test.describe("RNF-03, SC-007: accesibilidad AA del panel en ambos temas", () => {
  for (const tema of ["claro", "oscuro"] as const) {
    for (const [name, path, detailFrom] of ADMIN_PAGES) {
      test(`SC-007: panel ${name} en tema ${tema} sin violaciones AA`, async ({ page, browser }) => {
        await page.addInitScript((t) => localStorage.setItem("tema", t), tema);
        await page.context().addCookies(await adminCookies(browser));
        await page.goto(path);
        if (detailFrom) await page.getByRole("table", { name: detailFrom }).getByRole("link").first().click();
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.waitForLoadState("networkidle");
        const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        const summary = result.violations.map((v) => `${v.id}: ${v.nodes.length} nodo(s) — ${v.nodes[0]?.target.join(" ")}`);
        expect(summary).toEqual([]);
      });
    }
  }
});
