import { expect, test, type Page } from "@playwright/test";

const S23 = "/producto/samsung-galaxy-s23-256-gb";
const NAME = "Samsung Galaxy S23 256 GB";

const gallery = (page: Page) => page.getByRole("region", { name: "Galería de fotos" });
const galleryCounter = (page: Page) => gallery(page).getByText(/^\d+ de \d+$/);
const openButton = (page: Page) => gallery(page).getByRole("button", { name: "Ampliar foto" });
const viewer = (page: Page) => page.getByRole("dialog", { name: `Fotos de ${NAME}` });
const viewerCounter = (page: Page) => viewer(page).getByText(/^\d+ de \d+$/);

async function photoCount(page: Page) {
  return Number(((await galleryCounter(page).textContent()) ?? "").split(" de ")[1]);
}

test.describe("HU-55: vista ampliada de las fotos", () => {
  test("HU-55, FR-010: «Ampliar foto» abre un diálogo a pantalla completa con contador, flechas y «Cerrar»", async ({ page }) => {
    await page.goto(S23);
    const n = await photoCount(page);
    await openButton(page).click();
    await expect(viewer(page)).toBeVisible();
    await expect(viewerCounter(page)).toHaveText(`1 de ${n}`);
    await expect(viewer(page).getByRole("button", { name: "Foto anterior" })).toBeVisible();
    await expect(viewer(page).getByRole("button", { name: "Foto siguiente" })).toBeVisible();
    await expect(viewer(page).getByRole("button", { name: "Cerrar" })).toBeVisible();
    const box = (await viewer(page).boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1);
  });

  test("HU-55, FR-010: tocar la foto grande también abre la vista", async ({ page }) => {
    await page.goto(S23);
    await gallery(page).getByRole("img").first().click();
    await expect(viewer(page)).toBeVisible();
  });

  test("HU-55, FR-012: dentro de la vista las flechas del teclado y los botones cambian de foto", async ({ page }) => {
    await page.goto(S23);
    const n = await photoCount(page);
    await openButton(page).click();
    await expect(viewerCounter(page)).toHaveText(`1 de ${n}`);
    await page.keyboard.press("ArrowRight");
    await expect(viewerCounter(page)).toHaveText(`2 de ${n}`);
    await viewer(page).getByRole("button", { name: "Foto siguiente" }).click();
    await expect(viewerCounter(page)).toHaveText(`3 de ${n}`);
    await page.keyboard.press("ArrowLeft");
    await expect(viewerCounter(page)).toHaveText(`2 de ${n}`);
  });

  test("HU-55, FR-011: Tab nunca saca el foco del diálogo y la página de fondo queda bloqueada", async ({ page }) => {
    await page.goto(S23);
    await openButton(page).click();
    await expect(viewer(page)).toBeVisible();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
      expect(inside, `Tab ${i + 1}`).toBe(true);
    }
    await expect(page.locator("body")).toHaveAttribute("data-scroll-locked", /.+/);
  });

  test("HU-55, FR-011: Escape cierra la vista, el foco vuelve al botón que la abrió y la galería queda en la foto en que se quedó", async ({ page }) => {
    await page.goto(S23);
    const n = await photoCount(page);
    await openButton(page).click();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(viewerCounter(page)).toHaveText(`3 de ${n}`);
    await page.keyboard.press("Escape");
    await expect(viewer(page)).toHaveCount(0);
    await expect(openButton(page)).toBeFocused();
    await expect(galleryCounter(page)).toHaveText(`3 de ${n}`);
  });

  test("HU-55, FR-011: el botón «Cerrar» también la cierra", async ({ page }) => {
    await page.goto(S23);
    await openButton(page).click();
    await viewer(page).getByRole("button", { name: "Cerrar" }).click();
    await expect(viewer(page)).toHaveCount(0);
    await expect(openButton(page)).toBeFocused();
  });

  test("HU-55, FR-012, FR-013: no hay zoom propio ni se bloquea el pellizco, y con reducir movimiento no hay animaciones", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(S23);
    await openButton(page).click();
    const styles = await viewer(page).evaluate((dialog) => {
      const track = dialog.querySelector('[data-testid="carousel-track"]') as HTMLElement;
      const img = dialog.querySelector("img") as HTMLElement;
      return {
        trackTouch: getComputedStyle(track).touchAction,
        imgTouch: getComputedStyle(img).touchAction,
        dialogTouch: getComputedStyle(dialog).touchAction,
        scrollBehavior: getComputedStyle(track).scrollBehavior,
        transition: getComputedStyle(dialog).transitionDuration,
      };
    });
    expect(styles.trackTouch).not.toBe("none");
    expect(styles.imgTouch).not.toBe("none");
    expect(styles.dialogTouch).not.toBe("none");
    expect(styles.scrollBehavior).toBe("auto");
    expect(parseFloat(styles.transition)).toBeLessThanOrEqual(0.001); // el sitio reduce las transiciones a 0.01 ms
  });
});
