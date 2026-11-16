import { expect, test, type Page } from "@playwright/test";
import { adminCookies } from "./admin-session";

const ORDER = "RC-000001"; // pedido de Mateo Quispe (987654321) en los datos de demostración
const link = (page: Page) => page.getByRole("link", { name: "Escribir por WhatsApp" });
const disabled = (page: Page) => page.getByRole("button", { name: /Escribir por WhatsApp/ });

async function waOf(page: Page) {
  const href = (await link(page).getAttribute("href")) ?? "";
  const m = /^https:\/\/wa\.me\/(\d+)\?text=(.*)$/.exec(href);
  expect(m, `enlace wa.me inválido: ${href}`).not.toBeNull();
  return { number: m![1]!, text: decodeURIComponent(m![2]!) };
}

/** Abre el pedido como administrador cambiando lo que devuelve la API para probar celulares distintos. */
async function openOrder(page: Page, browser: Parameters<typeof adminCookies>[0], phone?: string) {
  await page.context().addCookies(await adminCookies(browser));
  if (phone !== undefined) {
    await page.route(`**/api/admin/orders/${ORDER}`, async (route) => {
      const res = await route.fetch();
      const json = (await res.json()) as { customer: { phone: string } };
      json.customer.phone = phone;
      await route.fulfill({ response: res, json });
    });
  }
  await page.goto(`/admin/pedidos/${ORDER}`);
  await expect(page.getByRole("heading", { name: `Pedido ${ORDER}` })).toBeVisible();
}

test.describe("HU-60: escribir al cliente por WhatsApp desde el panel", () => {
  test("HU-60, FR-040: desde el pedido abre wa.me con 51 más el celular y el saludo con el número de pedido", async ({ page, browser }) => {
    await openOrder(page, browser);
    await expect(link(page)).toBeVisible();
    const { number, text } = await waOf(page);
    expect(number).toBe("51987654321");
    expect(text).toBe(`Hola Mateo Quispe, te escribimos de R Cube por tu pedido ${ORDER}.`);
    await expect(link(page)).toHaveAttribute("target", "_blank");
    await expect(link(page)).toHaveAttribute("rel", /noopener/);
  });

  test("HU-60, FR-040: desde la ficha del cliente el saludo no lleva pedido", async ({ page, browser }) => {
    const context = await browser.newContext({ baseURL: "http://localhost:4173" });
    await context.addCookies(await adminCookies(browser));
    const list = (await (await context.request.get("/api/admin/customers?q=mateo")).json()) as { items: { id: string }[] };
    await context.close();
    await page.context().addCookies(await adminCookies(browser));
    await page.goto(`/admin/clientes/${list.items[0]!.id}`);
    await expect(page.getByRole("heading", { name: "Mateo Quispe", level: 1 })).toBeVisible();
    const { number, text } = await waOf(page);
    expect(number).toBe("51987654321");
    expect(text).toBe("Hola Mateo Quispe, te escribimos de R Cube.");
  });

  test("HU-60, FR-040: un celular con espacios, guiones y +51 se normaliza", async ({ page, browser }) => {
    await openOrder(page, browser, "+51 987-654 321");
    expect((await waOf(page)).number).toBe("51987654321");
  });

  test("HU-60, FR-040: sin celular válido el botón queda deshabilitado con «Sin celular válido» y no abre nada", async ({ page, browser }) => {
    for (const phone of ["", "12345", "+1 305 555 0100", "187654321"]) {
      await page.unrouteAll();
      await openOrder(page, browser, phone);
      await expect(disabled(page), `celular «${phone}»`).toBeDisabled();
      await expect(disabled(page)).toContainText("Sin celular válido");
      await expect(link(page)).toHaveCount(0);
    }
  });
});
