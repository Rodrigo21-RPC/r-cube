import { describe, expect, it } from "vitest";
import { GALLERY } from "@db/gallery-data";
import { PRODUCTS } from "@db/seed-data";
import { HIGHLIGHT_MAX, HIGHLIGHTS_MAX, TAGLINE_MAX } from "@shared/highlights";
import { slugify } from "@shared/slug";

/** Productos activos de la demostración con su entrada del manifiesto. */
const active = PRODUCTS.filter((p) => p.active !== false).map((p) => ({ product: p, slug: slugify(p.name) }));

/** Texto comparable: sin tildes, en minúsculas y con la coma decimal como punto. */
const plain = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1.$2");

/** Números de un texto («120 Hz» → «120», «6,1 pulgadas» → «6.1»). */
const numbersOf = (t: string) => plain(t).match(/\d+(?:\.\d+)?/g) ?? [];

describe("HU-56, FR-029: frase y destacados de los productos de demostración", () => {
  it("HU-56: hay 37 productos activos y cada uno tiene su entrada en el manifiesto", () => {
    expect(active).toHaveLength(37);
    for (const { slug } of active) expect(GALLERY[slug], slug).toBeDefined();
  });

  it("FR-014, FR-029: cada producto activo tiene frase y de 3 a 5 destacados dentro de los límites", () => {
    for (const { slug } of active) {
      const { tagline, highlights } = GALLERY[slug]!;
      expect(tagline.trim().length, `${slug}: frase`).toBeGreaterThan(0);
      expect(tagline.length, `${slug}: frase`).toBeLessThanOrEqual(TAGLINE_MAX);
      expect(highlights.length, `${slug}: cantidad`).toBeGreaterThanOrEqual(3);
      expect(highlights.length, `${slug}: cantidad`).toBeLessThanOrEqual(HIGHLIGHTS_MAX);
      for (const h of highlights) {
        expect(h.trim(), `${slug}: «${h}»`).toBe(h);
        expect(h.length, `${slug}: «${h}»`).toBeGreaterThan(0);
        expect(h.length, `${slug}: «${h}»`).toBeLessThanOrEqual(HIGHLIGHT_MAX);
      }
    }
  });

  it("FR-016, FR-029: sin duplicados, sin símbolos de HTML y sin tono de grito", () => {
    for (const { slug } of active) {
      const { tagline, highlights } = GALLERY[slug]!;
      const all = [tagline, ...highlights];
      expect(new Set(highlights.map(plain)).size, `${slug}: duplicados`).toBe(highlights.length);
      for (const t of all) {
        expect(t, `${slug}: «${t}»`).not.toMatch(/[<>]/);
        expect(t, `${slug}: «${t}»`).not.toMatch(/!!|¡¡/);
        expect(t === t.toUpperCase() && /[A-Za-z]/.test(t), `${slug}: «${t}» en mayúsculas`).toBe(false);
      }
    }
  });

  it("FR-029: cada dato numérico de la frase y los destacados está respaldado por el producto", () => {
    for (const { product, slug } of active) {
      const base = plain([product.name, product.desc, ...product.specs.flat()].join(" "));
      const known = new Set(base.match(/\d+(?:\.\d+)?/g) ?? []);
      const { tagline, highlights } = GALLERY[slug]!;
      for (const t of [tagline, ...highlights]) {
        for (const n of numbersOf(t)) expect(known.has(n), `${slug}: «${t}» menciona ${n}, que no está en sus especificaciones ni en su descripción`).toBe(true);
      }
    }
  });
});
