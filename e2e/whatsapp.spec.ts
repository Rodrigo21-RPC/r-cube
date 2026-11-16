import { expect, test, type Locator, type Page } from "@playwright/test";
import { adminCookies, customerCookies } from "./admin-session";

const S23 = "/producto/samsung-galaxy-s23-256-gb";
const consult = (page: Page) => page.getByRole("link", { name: "Consultar por WhatsApp" });
const float = (page: Page) => page.getByRole("link", { name: "Escríbenos por WhatsApp" });
const footerLink = (page: Page) => page.getByRole("contentinfo").getByRole("link", { name: "WhatsApp", exact: true });

/** Texto del mensaje de un enlace wa.me y el número al que va. */
async function waOf(link: Locator) {
  const href = (await link.getAttribute("href")) ?? "";
  const m = /^https:\/\/wa\.me\/(\d+)\?text=(.*)$/.exec(href);
  expect(m, `enlace wa.me inválido: ${href}`).not.toBeNull();
  return { number: m![1]!, text: decodeURIComponent(m![2]!) };
}

/** El centro del control sigue siendo pulsable: nada (por ejemplo el botón flotante) lo tapa. */
async function centerIsClickable(control: Locator) {
  await control.scrollIntoViewIfNeeded();
  return control.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  });
}

test.describe("HU-59: contactar a la tienda por WhatsApp", () => {
  test("HU-59, FR-037: «Consultar por WhatsApp» abre wa.me con el número de la tienda y un mensaje con el producto y su enlace", async ({ page, baseURL }) => {
    await page.goto(S23);
    const link = consult(page);
    await expect(link).toBeVisible();
    const { number, text } = await waOf(link);
    expect(number).toBe("51987000111");
    expect(text).toBe(`Hola R Cube, quiero información de Samsung Galaxy S23 256 GB. ${baseURL}${S23}`);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  });

  test("HU-59, FR-037: con una variante elegida el mensaje la incluye", async ({ page }) => {
    await page.goto("/producto/motorola-edge-60-pro");
    expect((await waOf(consult(page))).text).not.toContain("(");
    await page.locator("label").filter({ hasText: /^256 GB(Agotado)?$/ }).click();
    await page.locator("label").filter({ hasText: /^Azul(Agotado)?$/ }).click();
    expect((await waOf(consult(page))).text).toContain("Motorola Edge 60 Pro (256 GB · Azul).");
  });

  test("HU-59, FR-038: el botón flotante «Escríbenos por WhatsApp» está en la portada, el catálogo y el producto con el mensaje general", async ({ page }) => {
    for (const path of ["/", "/catalogo", S23]) {
      await page.goto(path);
      await expect(float(page), path).toBeVisible();
      const { number, text } = await waOf(float(page));
      expect(number).toBe("51987000111");
      expect(text).toBe("Hola R Cube, tengo una consulta.");
      await expect(float(page)).toHaveAttribute("target", "_blank");
      await expect(float(page)).toHaveAttribute("rel", /noopener/);
    }
  });

  test("HU-59, FR-038: el pie de página trae el enlace «WhatsApp»", async ({ page }) => {
    await page.goto("/");
    await expect(footerLink(page)).toHaveAttribute("href", /^https:\/\/wa\.me\/51987000111\?text=/);
  });

  test("HU-59, FR-038: el botón flotante no aparece en el checkout, el comprobante ni el panel", async ({ page, browser }) => {
    await page.context().addCookies(await customerCookies(browser));
    await page.request.put("/api/cart/items/prod-huawei-p60", { data: { quantity: 1 } });
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Pagar", level: 1 })).toBeVisible();
    await expect(float(page)).toHaveCount(0);

    await page.goto("/pedidos/RC-000001/comprobante");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(float(page)).toHaveCount(0);

    const admin = await browser.newContext({ baseURL: "http://localhost:4173" });
    await admin.addCookies(await adminCookies(browser));
    const adminPage = await admin.newPage();
    await adminPage.goto("/admin");
    await expect(adminPage.getByRole("heading", { name: "Resumen", exact: true })).toBeVisible();
    await expect(adminPage.getByRole("link", { name: /Escríbenos por WhatsApp/ })).toHaveCount(0);
    await admin.close();
  });

  test("HU-59, FR-039: sin número de WhatsApp no se muestra ningún botón ni enlace y la página no falla", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/catalog/contact", (route) => route.fulfill({ json: { name: "R Cube", whatsappNumber: "" } }));
    for (const path of ["/", S23]) {
      await page.goto(path);
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("link", { name: /WhatsApp/ })).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });

  test("HU-59, FR-038, SC-007: a 320 px el botón flotante no tapa «Agregar al carrito» ni «Pagar» y no desborda la página", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(S23);
    await expect(float(page)).toBeVisible();
    expect(await centerIsClickable(page.getByRole("button", { name: "Agregar al carrito" }))).toBe(true);
    expect(await centerIsClickable(consult(page))).toBe(true);
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await page.goto("/carrito");
    await expect(page.getByRole("button", { name: "Pagar" })).toBeVisible();
    expect(await centerIsClickable(page.getByRole("button", { name: "Pagar" }))).toBe(true);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("HU-59, FR-038: la vista ampliada de fotos queda por encima del botón flotante", async ({ page }) => {
    await page.goto(S23);
    await expect(float(page)).toBeVisible();
    const box = (await float(page).boundingBox())!;
    await page.getByRole("button", { name: "Ampliar foto" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    // Con la vista abierta, lo que hay sobre el botón flotante es el diálogo y no el enlace de WhatsApp.
    const topmost = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return { inDialog: Boolean(el?.closest('[role="dialog"]')), isWhatsapp: Boolean(el?.closest('a[href^="https://wa.me/"]')) };
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );
    expect(topmost).toEqual({ inDialog: true, isWhatsapp: false });
  });
});
