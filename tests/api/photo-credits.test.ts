import { beforeEach, describe, expect, it } from "vitest";
import type { PhotoCredits } from "@shared/types";
import { api, ids, makeImages, resetDb } from "./helpers";

const SOURCE = (name: string) => `https://commons.wikimedia.org/wiki/File:${name}`;
const get = async () => (await (await api("/catalog/photo-credits")).json()) as PhotoCredits;

beforeEach(async () => {
  await resetDb(); // el iPhone 15 Pro trae una foto «subida» de los datos de prueba
});

describe("HU-58, FR-021 a FR-023: créditos de las fotos", () => {
  beforeEach(async () => {
    await makeImages(ids.p3, [
      { id: "g-ext-a", position: 0, origin: "externa", author: "Ana Pérez", license: "CC BY-SA 4.0", creditUrl: SOURCE("Galaxy_A.jpg"), alt: "Galaxy de frente" },
      { id: "g-ext-b", position: 1, origin: "externa", author: "Luis Soto", license: "CC0 1.0", creditUrl: SOURCE("Galaxy_B.jpg"), alt: "Galaxy de perfil" },
      { id: "g-card", position: 2, origin: "tarjeta" },
      { id: "g-up", position: 3, origin: "subida" },
    ]);
    await makeImages(ids.p10, [
      { id: "i-ext", position: 1, origin: "externa", author: "Rosa Díaz", license: "Dominio público", creditUrl: SOURCE("iPhone.jpg"), alt: "iPhone abierto" },
      { id: "i-proy", position: 2, origin: "proyecto" },
    ]);
    await makeImages(ids.p0, [{ id: "m-proy", position: 0, origin: "proyecto" }]);
    await makeImages(ids.pOff, [
      { id: "off-ext", position: 0, origin: "externa", author: "Otra Persona", license: "CC BY 4.0", creditUrl: SOURCE("Off.jpg") },
      { id: "off-proy", position: 1, origin: "proyecto" },
    ]);
  });

  it("HU-58: es pública (sin sesión responde 200)", async () => {
    expect((await api("/catalog/photo-credits")).status).toBe(200);
  });

  it("HU-58, FR-022: lista las fotos externas de productos activos con producto, autor, licencia y enlace, por producto y posición", async () => {
    const body = await get();
    expect(body.external).toEqual([
      { productName: "Galaxy S23", productSlug: ids.p3, imageUrl: "/img/productos/galeria/g-ext-a.webp", alt: "Galaxy de frente", author: "Ana Pérez", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", sourceUrl: SOURCE("Galaxy_A.jpg") },
      { productName: "Galaxy S23", productSlug: ids.p3, imageUrl: "/img/productos/galeria/g-ext-b.webp", alt: "Galaxy de perfil", author: "Luis Soto", license: "CC0 1.0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", sourceUrl: SOURCE("Galaxy_B.jpg") },
      { productName: "iPhone 15 Pro", productSlug: ids.p10, imageUrl: "/img/productos/galeria/i-ext.webp", alt: "iPhone abierto", author: "Rosa Díaz", license: "Dominio público", licenseUrl: null, sourceUrl: SOURCE("iPhone.jpg") },
    ]);
  });

  it("HU-58, FR-022: las fotos del proyecto se agrupan: una vez por producto activo, sin autor ni licencia", async () => {
    const body = await get();
    expect(body.project).toEqual([
      { productName: "iPhone 15 Pro", productSlug: ids.p10 },
      { productName: "MacBook Air M1", productSlug: ids.p0 },
    ]);
  });

  it("HU-58, FR-023: las fotos subidas por el administrador y las tarjetas no aparecen", async () => {
    const body = await get();
    const urls = body.external.map((e) => e.imageUrl);
    expect(urls.join(" ")).not.toMatch(/g-card|g-up|img-1/);
    expect(body.project.map((p) => p.productSlug)).not.toContain(ids.p3); // Galaxy S23 solo tiene externas, tarjeta y subida
  });

  it("HU-58: un producto inactivo no aparece en ninguna lista", async () => {
    const body = await get();
    expect(body.external.map((e) => e.productSlug)).not.toContain(ids.pOff);
    expect(body.project.map((p) => p.productSlug)).not.toContain(ids.pOff);
  });
});

describe("HU-58: sin créditos", () => {
  it("HU-58, FR-022: sin ninguna foto con crédito responde listas vacías con 200", async () => {
    const res = await api("/catalog/photo-credits");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ external: [], project: [] });
  });
});
