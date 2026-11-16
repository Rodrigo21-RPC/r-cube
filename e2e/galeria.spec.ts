import { expect, test, type Browser, type Page } from "@playwright/test";
import { adminCookies } from "./admin-session";

const S23 = "/producto/samsung-galaxy-s23-256-gb";

const gallery = (page: Page) => page.getByRole("region", { name: "Galería de fotos" });
const counter = (page: Page) => gallery(page).getByText(/^\d+ de \d+$/);
const next = (page: Page) => gallery(page).getByRole("button", { name: "Foto siguiente" });
const prev = (page: Page) => gallery(page).getByRole("button", { name: "Foto anterior" });
const thumbs = (page: Page) => page.getByRole("button", { name: /^Ver foto \d+ de \d+$/ });
const track = (page: Page) => gallery(page).getByTestId("carousel-track");

/** Cantidad de fotos de la galería según el contador «1 de N». */
async function photoCount(page: Page) {
  const text = (await counter(page).textContent()) ?? "";
  return Number(text.split(" de ")[1]);
}

const pick = (page: Page, value: string) => page.locator("label").filter({ hasText: new RegExp(`^${value}(Agotado)?$`) }).click();

/** Crea por la API del panel un producto sin fotos y devuelve su ruta. */
async function productWithoutPhotos(browser: Browser) {
  const context = await browser.newContext({ baseURL: "http://localhost:4173" });
  await context.addCookies(await adminCookies(browser));
  const list = (await (await context.request.get("/api/admin/products")).json()) as { items: { id: string }[] };
  const base = (await (await context.request.get(`/api/admin/products/${list.items[0]!.id}`)).json()) as { brandId: string; categoryId: string };
  const name = `Producto sin fotos ${Date.now()}`;
  const res = await context.request.post("/api/admin/products", {
    data: { name, brandId: base.brandId, categoryId: base.categoryId, description: "Sin fotos", priceCents: 12900, stock: 3, active: true },
  });
  expect(res.status(), await res.text()).toBe(201);
  const created = (await res.json()) as { slug: string };
  await context.close();
  return { name, path: `/producto/${created.slug}` };
}

test.describe("HU-54: galería de fotos del producto", () => {
  test("HU-54: muestra de 4 a 6 fotos con contador, miniaturas y botones, y «Foto siguiente» avanza", async ({ page }) => {
    await page.goto(S23);
    await expect(gallery(page)).toBeVisible();
    const n = await photoCount(page);
    expect(n).toBeGreaterThanOrEqual(4);
    expect(n).toBeLessThanOrEqual(6);
    await expect(counter(page)).toHaveText(`1 de ${n}`);
    await expect(thumbs(page)).toHaveCount(n);
    await expect(thumbs(page).first()).toHaveAttribute("aria-current", "true");

    await next(page).click();
    await expect(counter(page)).toHaveText(`2 de ${n}`);
    await expect(thumbs(page).nth(1)).toHaveAttribute("aria-current", "true");
    await expect(thumbs(page).first()).not.toHaveAttribute("aria-current", "true");
    await expect(page.locator('[aria-live="polite"]').filter({ hasText: `Foto 2 de ${n}` })).toBeAttached();
  });

  test("HU-54: con el foco en la galería las flechas del teclado cambian la foto", async ({ page }) => {
    await page.goto(S23);
    const n = await photoCount(page);
    await next(page).focus();
    await page.keyboard.press("ArrowRight");
    await expect(counter(page)).toHaveText(`2 de ${n}`);
    await page.keyboard.press("ArrowLeft");
    await expect(counter(page)).toHaveText(`1 de ${n}`);
  });

  test("HU-54, FR-002: con el foco fuera de la galería las flechas no cambian la foto", async ({ page }) => {
    await page.goto(S23);
    const n = await photoCount(page);
    await page.getByRole("button", { name: "Agregar al carrito" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(counter(page)).toHaveText(`1 de ${n}`);
  });

  test("HU-54, FR-003: la navegación es circular", async ({ page }) => {
    await page.goto(S23);
    const n = await photoCount(page);
    await prev(page).click();
    await expect(counter(page)).toHaveText(`${n} de ${n}`);
    await next(page).click();
    await expect(counter(page)).toHaveText(`1 de ${n}`);
  });

  test("HU-54, FR-002: deslizar la pista cambia la foto (el navegador hace el deslizar con el dedo)", async ({ page }) => {
    await page.goto(S23);
    await track(page).evaluate((el) => el.scrollTo({ left: el.clientWidth * 2, behavior: "instant" }));
    await expect(counter(page)).toHaveText(/^3 de \d+$/);
  });

  test("HU-54, SC-001: desde la última foto se llega a otra con una sola pulsación de miniatura", async ({ page }) => {
    await page.goto(S23);
    const n = await photoCount(page);
    await prev(page).click();
    await expect(counter(page)).toHaveText(`${n} de ${n}`);
    await thumbs(page).nth(1).click();
    await expect(counter(page)).toHaveText(`2 de ${n}`);
  });

  test("HU-54, FR-009: los botones y las miniaturas miden al menos 44 × 44 px", async ({ page }) => {
    await page.goto(S23);
    for (const control of [next(page), prev(page), thumbs(page).first(), thumbs(page).last()]) {
      const box = (await control.boundingBox())!;
      expect(box.width, "ancho").toBeGreaterThanOrEqual(44);
      expect(box.height, "alto").toBeGreaterThanOrEqual(44);
    }
  });

  test("HU-54, FR-008: el contenedor de la foto grande no cambia de alto al cargar (sin saltos)", async ({ page }) => {
    await page.route("**/img/productos/galeria/*", async (route) => {
      await new Promise((r) => setTimeout(r, 700));
      await route.continue();
    });
    await page.goto(S23);
    await expect(gallery(page)).toBeVisible();
    const before = (await track(page).boundingBox())!.height;
    await page.waitForLoadState("networkidle");
    const after = (await track(page).boundingBox())!.height;
    expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
  });

  test("HU-54, FR-008: una foto que no carga se cambia por la imagen genérica y la galería sigue navegable", async ({ page }) => {
    await page.route("**/img/productos/galeria/*", (route) => route.abort());
    await page.goto(S23);
    const n = await photoCount(page);
    await expect(gallery(page).locator("img").first()).toHaveAttribute("src", /\/img\/generico\.svg$/);
    await next(page).click();
    await expect(counter(page)).toHaveText(`2 de ${n}`);
  });

  test("HU-54, FR-005: un producto sin fotos muestra la imagen genérica y ningún control de galería", async ({ page, browser }) => {
    const { name, path } = await productWithoutPhotos(browser);
    await page.goto(path);
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await expect(page.locator("main img[src$='/img/generico.svg']").first()).toBeVisible();
    await expect(next(page)).toHaveCount(0);
    await expect(prev(page)).toHaveCount(0);
    await expect(counter(page)).toHaveCount(0);
    await expect(thumbs(page)).toHaveCount(0);
  });

  test("HU-44, HU-54, FR-006: elegir una variante con foto propia lleva a esa foto y una elección manual posterior se respeta", async ({ page, request }) => {
    const detail = (await (await request.get("/api/catalog/products/motorola-edge-60-pro")).json()) as {
      images: { url: string }[];
      variants: { label: string; imageUrl: string | null }[];
    };
    const azul = detail.variants.find((v) => v.label.includes("256 GB") && v.label.includes("Azul"))!;
    const expected = detail.images.findIndex((i) => i.url === azul.imageUrl) + 1;
    expect(expected, "la variante azul debe apuntar a una foto de la galería").toBeGreaterThan(0);

    await page.goto("/producto/motorola-edge-60-pro");
    const n = await photoCount(page);
    await pick(page, "256 GB");
    await pick(page, "Azul");
    await expect(counter(page)).toHaveText(`${expected} de ${n}`);

    await (expected === n ? prev(page) : next(page)).click();
    const manual = expected === n ? n - 1 : expected + 1;
    await expect(counter(page)).toHaveText(`${manual} de ${n}`);
    await page.waitForTimeout(400);
    await expect(counter(page)).toHaveText(`${manual} de ${n}`);
  });

  test("HU-54, FR-007: al abrir otro producto desde «Productos relacionados» la galería empieza en la primera foto", async ({ page }) => {
    await page.goto(S23);
    await next(page).click();
    await next(page).click();
    const related = page.locator("section", { has: page.getByRole("heading", { name: "Productos relacionados" }) }).getByRole("link").filter({ hasNotText: "Producto sin fotos" }).first();
    await related.click();
    await expect(page).not.toHaveURL(new RegExp(`${S23}$`));
    await expect(counter(page)).toHaveText(/^1 de \d+$/);
  });
});
