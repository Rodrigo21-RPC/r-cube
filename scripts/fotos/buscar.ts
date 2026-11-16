/**
 * Busca fotos libres en Wikimedia Commons (solo desarrollo, feature 004, research R7).
 * Uso: npm run fotos:buscar -- "Samsung Galaxy S23"
 * Solo lista candidatas con licencia admitida (CC0, dominio público, CC BY y CC BY-SA) y con autor, y guarda sus
 * miniaturas en scripts/fotos/.cache/candidatas/<consulta>/ y arma hojas de contacto (hoja-1.jpg, …) con las candidatas
 * numeradas para mirarlas de un vistazo antes de aceptarlas. Después: npm run fotos:agregar.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { chromium } from "@playwright/test";
import { isAllowedLicense } from "../../src/shared/photo-credit";
import { slugify } from "../../src/shared/slug";
import { CACHE, download, safeName, searchCommons } from "./commons";

const query = process.argv.slice(2).filter((a) => !a.startsWith("--")).join(" ").trim();
if (!query) {
  console.error('Uso: npm run fotos:buscar -- "Samsung Galaxy S23"');
  process.exit(1);
}

const max = Number(process.argv.find((a) => a.startsWith("--max="))?.slice(6) ?? 16);
const found = await searchCommons(query, 40);
const reasons = { formato: 0, tamaño: 0, licencia: 0, autor: 0 };
const candidates = found.filter((f) => {
  if (!/^image\/(jpeg|png|webp)$/.test(f.mime)) return void reasons.formato++;
  if (Math.max(f.width, f.height) < 700) return void reasons.tamaño++;
  if (!isAllowedLicense(f.license)) return void reasons.licencia++;
  if (!f.author) return void reasons.autor++;
  return true;
});

const dir = join(CACHE, "candidatas", slugify(query));
mkdirSync(dir, { recursive: true });
candidates.splice(max);
console.log(`«${query}»: ${found.length} resultados, ${candidates.length} candidatas (descartadas: ${JSON.stringify(reasons)})\n`);

const list: unknown[] = [];
for (const [i, f] of candidates.entries()) {
  const n = String(i + 1).padStart(2, "0");
  const file = join(dir, `${n}-${safeName(f.title.replace(/^File:/, ""))}${extname(new URL(f.thumbUrl).pathname) || ".jpg"}`);
  await download(f.thumbUrl, file);
  list.push({ n, ...f, file });
  console.log(`${n}. ${f.title.replace(/^File:/, "").slice(0, 70)} | ${f.license} | ${f.author.slice(0, 28)}`);
}
writeFileSync(join(dir, "candidatas.json"), JSON.stringify(list, null, 2));

// Hojas de contacto de 16 candidatas (4 × 4), con el número de cada una.
const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 400 } });
for (let start = 0; start < list.length; start += 16) {
  const cells = (list.slice(start, start + 16) as { n: string; file: string; title: string; license: string }[])
    .map(
      (c) => `<figure><img src="data:${MIME[extname(c.file).toLowerCase()] ?? "image/jpeg"};base64,${readFileSync(c.file).toString("base64")}"><b>${c.n}</b><figcaption>${c.title.replace(/^File:/, "").slice(0, 52)} · ${c.license}</figcaption></figure>`,
    )
    .join("");
  await page.setContent(`<style>body{margin:0;background:#1b1b1f;display:grid;grid-template-columns:repeat(4,320px);gap:0;font-family:system-ui}figure{position:relative;margin:0;width:320px;height:280px;background:#2a2a30;border:1px solid #1b1b1f}img{width:320px;height:250px;object-fit:contain;background:#fff}b{position:absolute;left:6px;top:6px;background:#e11d48;color:#fff;font-size:26px;padding:2px 10px;border-radius:8px}figcaption{color:#cfcfd6;font-size:12px;padding:4px 6px;white-space:nowrap;overflow:hidden}</style>${cells}`);
  const sheet = join(dir, `hoja-${start / 16 + 1}.jpg`);
  await page.screenshot({ path: sheet, type: "jpeg", quality: 82, fullPage: true });
  console.log(`\nHoja de contacto: ${sheet}`);
}
await browser.close();
