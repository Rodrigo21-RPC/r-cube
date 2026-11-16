import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GALLERY } from "@db/gallery-data";
import { PRODUCTS } from "@db/seed-data";
import { HIGHLIGHT_MAX, HIGHLIGHTS_MAX, TAGLINE_MAX } from "@shared/highlights";
import { isAllowedLicense } from "@shared/photo-credit";
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

const PUBLIC = join(process.cwd(), "public");
const MAX_BYTES = 200 * 1024;
const MAX_SIDE = 1200;
const CARDS = ["caracteristicas", "destacados", "compra"];

/** Ancho y alto de un archivo WebP leyendo su cabecera (VP8, VP8L o VP8X). */
function webpSize(file: string): { width: number; height: number } {
  const b = readFileSync(file);
  expect(b.toString("ascii", 0, 4), `${file}: no es RIFF`).toBe("RIFF");
  expect(b.toString("ascii", 8, 12), `${file}: no es WebP`).toBe("WEBP");
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
  if (kind === "VP8L") return { width: 1 + (((b[22]! & 0x3f) << 8) | b[21]!), height: 1 + (((b[24]! & 0x0f) << 10) | (b[23]! << 2) | ((b[22]! & 0xc0) >> 6)) };
  return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff }; // «VP8 » con pérdida
}

describe("HU-54, FR-025 a FR-030: fotos de los productos de demostración", () => {
  it("FR-025, FR-026: cada producto activo tiene de 4 a 6 fotos: de 1 a 3 reales o del proyecto y 3 tarjetas al final", () => {
    for (const { slug } of active) {
      const { photos } = GALLERY[slug]!;
      expect(photos.length, `${slug}: cantidad de fotos`).toBeGreaterThanOrEqual(4);
      expect(photos.length, `${slug}: cantidad de fotos`).toBeLessThanOrEqual(6);
      expect(photos[0]!.origin, `${slug}: la primera foto no puede ser una tarjeta`).not.toBe("tarjeta");
      const reales = photos.filter((p) => p.origin !== "tarjeta");
      expect(reales.length, `${slug}: fotos reales`).toBeGreaterThanOrEqual(1);
      expect(reales.length, `${slug}: fotos reales`).toBeLessThanOrEqual(3);
      expect(photos.slice(-3).map((p) => [p.origin, p.card]), `${slug}: tarjetas al final y en orden`).toEqual(CARDS.map((c) => ["tarjeta", c]));
      expect(photos.slice(0, -3).every((p) => p.origin !== "tarjeta"), `${slug}: tarjetas fuera del final`).toBe(true);
    }
  });

  it("FR-028: los textos alternativos no están vacíos y son distintos dentro de cada producto", () => {
    for (const { slug } of active) {
      const alts = GALLERY[slug]!.photos.map((p) => p.alt.trim());
      for (const a of alts) expect(a.length, `${slug}: alt vacío`).toBeGreaterThan(0);
      expect(new Set(alts).size, `${slug}: alt repetidos`).toBe(alts.length);
    }
  });

  it("FR-021: cada foto externa trae autor, licencia admitida, enlace de origen y el título del archivo", () => {
    for (const { slug } of active) {
      for (const p of GALLERY[slug]!.photos.filter((x) => x.origin === "externa")) {
        expect(p.credit?.author.trim(), `${slug}: autor`).toBeTruthy();
        expect(isAllowedLicense(p.credit?.license ?? ""), `${slug}: licencia «${p.credit?.license}»`).toBe(true);
        expect(p.credit?.url, `${slug}: enlace`).toMatch(/^https:\/\//);
        expect(p.source?.trim(), `${slug}: título del archivo de Commons`).toBeTruthy();
      }
    }
  });

  it("FR-030, FR-031: cada foto sale de la propia tienda, pesa hasta 200 KB y mide hasta 1 200 px; los originales del proyecto existen", () => {
    for (const { slug } of active) {
      for (const p of GALLERY[slug]!.photos) {
        expect(p.url, `${slug}: ruta`).toMatch(/^\/img\/productos\/galeria\/[a-z0-9-]+\.webp$/);
        const file = join(PUBLIC, p.url);
        expect(existsSync(file), `${slug}: falta ${p.url}`).toBe(true);
        expect(statSync(file).size, `${slug}: ${p.url} pesa demasiado`).toBeLessThanOrEqual(MAX_BYTES);
        const { width, height } = webpSize(file);
        expect(Math.max(width, height), `${slug}: ${p.url} mide ${width}x${height}`).toBeLessThanOrEqual(MAX_SIDE);
        if (p.origin === "proyecto") expect(existsSync(join(PUBLIC, "img", "productos", p.source ?? "no-existe")), `${slug}: original ${p.source}`).toBe(true);
      }
    }
  });
});
