/**
 * Genera las tres tarjetas gráficas de cada producto activo (solo desarrollo, feature 004, research R9).
 * Uso: npm run fotos:tarjetas [-- --solo=<slug>]
 * 1) Calcula las tres entradas de tarjeta (url, texto alternativo y tipo) a partir del producto y su manifiesto.
 * 2) Las escribe al final de la lista `photos` del producto en src/db/gallery-data.ts (reemplaza las anteriores) y
 *    renumera las rutas de todas sus fotos.
 * 3) Renderiza cada tarjeta con Chromium de Playwright y la guarda como WebP de hasta 200 KB en
 *    public/img/productos/galeria/<slug>-<n>.webp.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { GALLERY, type CardKind } from "../../src/db/gallery-data";
import { PRODUCTS } from "../../src/db/seed-data";
import { slugify } from "../../src/shared/slug";
import { PUBLIC } from "./commons";
import { openEncoder } from "./encode";
import { isCard, isComment, readManifest, updatePhotos, writeManifest } from "./manifiesto";
import { fichaCaracteristicas, fichaCompra, fichaDestacados, type CardData } from "./plantillas";

const only = process.argv.find((a) => a.startsWith("--solo="))?.slice(7);
const KINDS: CardKind[] = ["caracteristicas", "destacados", "compra"];
const RENDER = { caracteristicas: fichaCaracteristicas, destacados: fichaDestacados, compra: fichaCompra } as const;

function altOf(kind: CardKind, d: CardData): string {
  if (kind === "caracteristicas") return `Tarjeta de características de ${d.name}: ${d.specs.slice(0, 4).map(([l, v]) => `${l} ${v}`).join(", ")}`;
  if (kind === "destacados") return `Tarjeta de destacados de ${d.name}: ${d.tagline}. ${d.highlights.join(", ")}.`;
  return `Tarjeta de compra segura de ${d.name}: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.`;
}

const encoder = await openEncoder();
let manifest = readManifest();
let written = 0;
try {
  for (const p of PRODUCTS.filter((x) => x.active !== false)) {
    const slug = slugify(p.name);
    if (only && slug !== only) continue;
    const entry = GALLERY[slug];
    if (!entry) throw new Error(`${slug}: falta en el manifiesto`);
    if (!entry.tagline || entry.highlights.length === 0) throw new Error(`${slug}: escribe antes la frase y los destacados (tarjeta de destacados)`);
    const reales = entry.photos.filter((x) => x.origin !== "tarjeta").length;
    const data: CardData = { name: p.name, brand: p.brand, desc: p.desc, specs: p.specs, tagline: entry.tagline, highlights: entry.highlights };
    const cards = KINDS.map((card, i) => ({ card, url: `/img/productos/galeria/${slug}-${reales + i + 1}.webp`, alt: altOf(card, data) }));

    for (const c of cards) {
      await encoder.page.setViewportSize({ width: 1000, height: 1000 });
      await encoder.page.setContent(RENDER[c.card](data), { waitUntil: "load" });
      const png = await encoder.page.screenshot({ type: "png" });
      const webp = await encoder.encode(png, "image/png");
      const out = join(PUBLIC, c.url);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, webp);
      written++;
      console.log(`${c.url}  ${(webp.length / 1024).toFixed(0)} KB`);
    }
    manifest = updatePhotos(manifest, slug, (lines) => [
      ...lines.filter((l) => !isCard(l) && !isComment(l)),
      "      // tarjetas (las genera scripts/fotos/tarjetas.ts)",
      ...cards.map((c) => `      { url: ${JSON.stringify(c.url)}, alt: ${JSON.stringify(c.alt)}, origin: "tarjeta", card: "${c.card}" },`),
    ]);
  }
} finally {
  await encoder.close();
}
writeManifest(manifest);
console.log(`\nTarjetas escritas: ${written}. Manifiesto actualizado.`);
