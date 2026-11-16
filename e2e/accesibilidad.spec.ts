import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { adminCookies, customerCookies } from "./admin-session";

const PAGES = [
  ["portada", "/"],
  ["catálogo", "/catalogo"],
  ["detalle", "/producto/huawei-p60"],
  ["carrito", "/carrito"],
  ["ingresar", "/ingresar"],
  ["registro", "/registro"],
  ["detalle con variantes, reseñas y relacionados", "/producto/motorola-edge-60-pro"],
  ["detalle con galería, destacados y botón de WhatsApp", "/producto/samsung-galaxy-s23-256-gb"],
  ["créditos de las fotos", "/creditos-fotos"],
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
  ["cupones", "/admin/cupones", null],
  ["reseñas", "/admin/resenas", null],
  ["producto con variantes", "/admin/productos/prod-motorola-edge-60-pro", null],
  ["producto con frase y destacados", "/admin/productos/prod-iphone-13-pro-128-gb", null],
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

const CUSTOMER_PAGES = [
  ["mi cuenta", "/cuenta"],
  ["mis favoritos", "/favoritos"],
  ["mis direcciones", "/cuenta/direcciones"],
  ["avisos", "/avisos"],
  ["comprobante del pedido", "/pedidos/RC-000001/comprobante"],
] as const;

test.describe("RNF-03, SC-008: accesibilidad AA de las pantallas nuevas del cliente en ambos temas", () => {
  for (const tema of ["claro", "oscuro"] as const) {
    for (const [name, path] of CUSTOMER_PAGES) {
      test(`SC-008: ${name} en tema ${tema} sin violaciones AA`, async ({ page, browser }) => {
        await page.addInitScript((t) => localStorage.setItem("tema", t), tema);
        await page.context().addCookies(await customerCookies(browser));
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.waitForLoadState("networkidle");
        // RNF-02: móvil primero, sin desplazamiento horizontal de la página (en Linux la fuente es más ancha).
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(result.violations.map((v) => `${v.id}: ${v.nodes.length} nodo(s) — ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
      });
    }

    test(`SC-008: checkout con cupón aplicado en tema ${tema} sin violaciones AA`, async ({ page, browser }) => {
      await page.addInitScript(
        ([t]) => {
          localStorage.setItem("tema", t!);
          localStorage.setItem("rcube-cupon", JSON.stringify({ state: { code: "BIENVENIDO10" }, version: 1 }));
        },
        [tema],
      );
      await page.context().addCookies(await customerCookies(browser));
      await page.request.put("/api/cart/items/prod-lenovo-tab-m10", { data: { quantity: 1, variantId: "var-tab-64-gris" } });
      try {
        await page.goto("/checkout");
        await expect(page.getByRole("heading", { name: "Pagar", level: 1 })).toBeVisible();
        await expect(page.getByText("Cupón BIENVENIDO10").first()).toBeVisible();
        await page.waitForLoadState("networkidle");
        const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(result.violations.map((v) => `${v.id}: ${v.nodes.length} nodo(s) — ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
      } finally {
        await page.request.delete("/api/cart/items/prod-lenovo-tab-m10?variantId=var-tab-64-gris");
      }
    });
  }
});

test.describe("RNF-03, SC-008: accesibilidad AA con una variante elegida y con reseñas, en ambos temas", () => {
  for (const tema of ["claro", "oscuro"] as const) {
    test(`SC-008: detalle con variante elegida en tema ${tema} sin violaciones AA`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("tema", t), tema);
      await page.goto("/producto/motorola-edge-60-pro");
      await page.locator("label").filter({ hasText: /^512 GB$/ }).click();
      await page.locator("label").filter({ hasText: /^Negro(Agotado)?$/ }).click();
      await expect(page.getByRole("radio", { name: "512 GB" })).toBeChecked();
      await page.waitForLoadState("networkidle");
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.length} nodo(s) — ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
    });

    test(`SC-008: producto con reseña propia y formulario de reseña en tema ${tema} sin violaciones AA`, async ({ page, browser }) => {
      await page.addInitScript((t) => localStorage.setItem("tema", t), tema);
      await page.context().addCookies(await customerCookies(browser));
      await page.goto("/producto/iphone-15-pro-256-gb"); // Mateo ya lo reseñó: se ve «Tu reseña» y las reseñas visibles
      await expect(page.getByRole("heading", { name: "Tu reseña" })).toBeVisible();
      await page.waitForLoadState("networkidle");
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.length} nodo(s) — ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
    });
  }
});

const S23 = "/producto/samsung-galaxy-s23-256-gb";

test.describe("RNF-03, FR-035, SC-006, SC-007: galería, vista ampliada y WhatsApp (feature 004)", () => {
  for (const tema of ["claro", "oscuro"] as const) {
    test(`FR-035: la vista ampliada abierta en tema ${tema} no tiene violaciones AA`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("tema", t), tema);
      await page.goto(S23);
      await page.getByRole("button", { name: "Ampliar foto" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.length} nodo(s) — ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
    });
  }

  test("SC-006: la galería, la vista ampliada y el botón de WhatsApp se recorren solo con el teclado", async ({ page }) => {
    await page.goto(S23);
    const gallery = page.getByRole("region", { name: "Galería de fotos" });
    await gallery.getByRole("button", { name: "Foto siguiente" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(gallery.getByText(/^2 de \d+$/)).toBeVisible();

    const open = gallery.getByRole("button", { name: "Ampliar foto" });
    await open.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(open).toBeFocused();

    // Desde «Agregar al carrito» se llega al enlace de WhatsApp con el tabulador, sin trampas de foco.
    await page.getByRole("button", { name: "Agregar al carrito" }).focus();
    let reached = false;
    for (let i = 0; i < 6 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await page.getByRole("link", { name: "Consultar por WhatsApp" }).evaluate((el) => el === document.activeElement);
    }
    expect(reached).toBe(true);
  });

  test("SC-007: a 320 px no hay desplazamiento horizontal en el detalle, la vista ampliada, los créditos ni la portada con el botón flotante", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    for (const path of [S23, "/creditos-fotos", "/"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(await overflow(), path).toBeLessThanOrEqual(0);
    }
    await page.goto(S23);
    await page.getByRole("button", { name: "Ampliar foto" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await overflow(), "vista ampliada").toBeLessThanOrEqual(0);
  });
});
