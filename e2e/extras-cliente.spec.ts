import { expect, test, type Page } from "@playwright/test";
import { adminSetStatus, buyByApi, registerCustomer } from "./admin-session";

const star = (page: Page, n: number) => page.locator("label").filter({ hasText: new RegExp(`^${n} estrellas?$`) }).click();

test.describe("HU-45: favoritos", () => {
  test("HU-45: el corazón guarda el favorito, se conserva al recargar y «Mis favoritos» permite quitarlo", async ({ page }) => {
    await registerCustomer(page);
    await page.goto("/catalogo");
    const heart = page.getByRole("button", { name: /^Agregar .* a favoritos$/ }).first();
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    const name = (await heart.getAttribute("aria-label"))!.replace(/^Agregar /, "").replace(/ a favoritos$/, "");
    await heart.click();
    await expect(page.getByRole("button", { name: `Quitar ${name} de favoritos` })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.getByRole("button", { name: `Quitar ${name} de favoritos` })).toBeVisible();

    await page.goto("/favoritos");
    await expect(page.getByRole("heading", { name: "Mis favoritos", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name })).toBeVisible();
    await page.getByRole("button", { name: `Quitar ${name} de favoritos` }).last().click();
    await expect(page.getByText("Aún no tienes favoritos")).toBeVisible();
  });

  test("HU-45: el visitante que toca el corazón inicia sesión y el favorito queda guardado al volver", async ({ page }) => {
    await page.goto("/producto/pasta-termica-4-g");
    await page.getByRole("button", { name: "Agregar Pasta térmica 4 g a favoritos" }).click();
    await expect(page).toHaveURL(/ingresar\?volver=.*favorito=/);
    await page.getByRole("link", { name: "Regístrate" }).click();
    await expect(page).toHaveURL(/registro\?volver=.*favorito=/);
    await page.getByLabel("Nombre completo").fill("Visitante E2E");
    await page.getByLabel("Correo").fill(`vis${Date.now()}@prueba.pe`);
    await page.getByLabel("Celular").fill("987654321");
    await page.getByLabel("Contraseña").fill("clave-e2e-123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/producto\/pasta-termica-4-g/);
    await expect(page.getByRole("button", { name: "Quitar Pasta térmica 4 g de favoritos" })).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("HU-46, HU-51, HU-52, HU-53: reseñas, relacionados, comprobante y avisos", () => {
  test("HU-46, HU-52, HU-53: un pedido entregado permite reseñar, imprimir el comprobante y avisa en la campana", async ({ page, browser }) => {
    await registerCustomer(page);
    const number = await buyByApi(page, "prod-pasta-termica-4-g");

    // Sin pedido Entregado no hay formulario (RN-09).
    await page.goto("/producto/pasta-termica-4-g");
    await expect(page.getByRole("heading", { name: "Calificar este producto" })).toHaveCount(0);
    await expect(page.getByText(/después de recibirlo/)).toBeVisible();

    // El administrador prepara y entrega: dos avisos para el cliente.
    await adminSetStatus(browser, number, "preparing", "paid");
    await adminSetStatus(browser, number, "delivered", "preparing");
    await page.reload();
    await expect(page.getByRole("button", { name: "Avisos, 2 sin leer" })).toBeVisible();

    // HU-46: ahora sí puede reseñar, una sola vez.
    await expect(page.getByRole("heading", { name: "Calificar este producto" })).toBeVisible();
    await star(page, 4);
    await page.getByLabel("Comentario (opcional)").fill("Muy buena pasta, bajó la temperatura.");
    await page.getByRole("button", { name: "Publicar reseña" }).click();
    await expect(page.getByRole("heading", { name: "Tu reseña" })).toBeVisible();
    await expect(page.getByText(/4[.,]0 de 5/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Calificar este producto" })).toHaveCount(0);

    // HU-53: la campana lista los avisos y los marca como leídos al abrirlos.
    await page.getByRole("button", { name: "Avisos, 2 sin leer" }).click();
    await expect(page.getByText(`Tu pedido ${number} está Entregado`)).toBeVisible();
    await page.getByRole("link", { name: `Tu pedido ${number} está Entregado` }).click();
    await expect(page).toHaveURL(new RegExp(`/pedidos/${number}$`));
    await expect(page.getByRole("button", { name: "Avisos, 1 sin leer" })).toBeVisible();

    // HU-52: comprobante con desglose de IGV; la vista impresa no muestra encabezado ni botones y cabe en una hoja.
    await page.getByRole("link", { name: "Ver comprobante" }).click();
    await expect(page.getByRole("heading", { name: "Comprobante de pedido" })).toBeVisible();
    await expect(page.getByText("Base imponible")).toBeVisible();
    await expect(page.getByText("IGV (18 %) incluido")).toBeVisible();
    await expect(page.getByText("no es una factura electrónica")).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("banner")).toBeHidden();
    await expect(page.getByRole("button", { name: "Imprimir" })).toBeHidden();
    await expect(page.getByRole("heading", { name: "Comprobante de pedido" })).toBeVisible();
    if (test.info().project.name === "oscuro-escritorio") {
      const pdf = await page.pdf({ format: "A4", printBackground: true });
      expect(pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g)).toHaveLength(1);
    }
  });

  test("HU-51: el detalle muestra hasta 4 productos relacionados de la misma categoría", async ({ page }) => {
    await page.goto("/producto/motorola-edge-60-pro");
    const section = page.getByRole("region", { name: "Productos relacionados" });
    await expect(section).toBeVisible();
    const cards = section.getByRole("listitem");
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
    expect(await cards.count()).toBeLessThanOrEqual(4);
    await expect(section.getByRole("link", { name: "Motorola Edge 60 Pro" })).toHaveCount(0); // no se ofrece a sí mismo
  });
});

test.describe("HU-48: varias direcciones", () => {
  test("HU-48: guardar dos direcciones, cambiar la predeterminada y elegirlas en el checkout", async ({ page }) => {
    await registerCustomer(page);
    await page.goto("/cuenta/direcciones");
    await expect(page.getByText("Aún no tienes direcciones guardadas")).toBeVisible();

    const add = async (label: string, line: string) => {
      await page.getByRole("button", { name: "Agregar dirección" }).first().click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Nombre de la dirección").fill(label);
      await dialog.getByLabel("Dirección", { exact: true }).fill(line);
      await dialog.getByLabel("Distrito").fill("Miraflores");
      await dialog.getByRole("button", { name: "Guardar dirección" }).click();
      await expect(page.getByRole("heading", { name: label })).toBeVisible();
    };
    await add("Casa", "Av. Larco 123");
    await add("Trabajo", "Calle Berlín 450");
    await expect(page.getByText("Predeterminada", { exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Marcar Trabajo como predeterminada" }).click();
    await expect(page.getByRole("heading", { name: "Trabajo" }).locator("xpath=..").getByText("Predeterminada", { exact: true })).toBeVisible();

    await buyIntoCart(page);
    await page.goto("/checkout");
    await expect(page.getByRole("radio", { name: /Trabajo \(predeterminada\)/ })).toBeChecked();
    await page.getByRole("radio", { name: /Casa/ }).click();
    await expect(page.getByRole("radio", { name: /Casa/ })).toBeChecked();
    await page.getByRole("radio", { name: "Otra dirección" }).click();
    await expect(page.getByLabel("Dirección", { exact: true })).toBeVisible();
  });
});

async function buyIntoCart(page: Page) {
  await page.request.put("/api/cart/items/prod-pasta-termica-4-g", { data: { quantity: 1 } });
}
