/**
 * Agrega al manifiesto una foto elegida de las candidatas de Commons, con su crédito completo (solo desarrollo).
 * Uso: npm run fotos:agregar -- <slug> "<consulta>" <n> "<texto alternativo>" [--primera] [--quitar-proyecto]
 *   <consulta> y <n> son los de la hoja de contacto que dejó `fotos:buscar` (scripts/fotos/.cache/candidatas/).
 *   --primera          la foto pasa a ser la principal (posición 1).
 *   --quitar-proyecto  se retira de la galería la foto original del proyecto de ese producto (el archivo se conserva).
 * Las rutas se renumeran solas; después hay que ejecutar `fotos:tarjetas` y `fotos:preparar`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slugify } from "../../src/shared/slug";
import { CACHE } from "./commons";
import { isCard, isComment, readManifest, updatePhotos, writeManifest } from "./manifiesto";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const [slug, query, number, alt] = args;
if (!slug || !query || !number || !alt) {
  console.error('Uso: npm run fotos:agregar -- <slug> "<consulta>" <n> "<texto alternativo>" [--primera] [--quitar-proyecto]');
  process.exit(1);
}

const file = join(CACHE, "candidatas", slugify(query), "candidatas.json");
const list = JSON.parse(readFileSync(file, "utf-8")) as { n: string; title: string; author: string; license: string; pageUrl: string }[];
const pick = list.find((c) => Number(c.n) === Number(number));
if (!pick) throw new Error(`La candidata ${number} no existe en ${file}`);

const title = pick.title;
const line = `      { url: "x", alt: ${JSON.stringify(alt)}, origin: "externa", source: ${JSON.stringify(title)}, credit: { author: ${JSON.stringify(pick.author)}, license: ${JSON.stringify(pick.license)}, url: ${JSON.stringify(pick.pageUrl)}, title: ${JSON.stringify(title.replace(/^File:/, ""))} } },`;

const text = updatePhotos(readManifest(), slug, (lines) => {
  const kept = flags.includes("--quitar-proyecto") ? lines.filter((l) => !l.includes('origin: "proyecto"')) : lines;
  if (kept.some((l) => l.includes(`source: ${JSON.stringify(title)}`))) throw new Error(`${slug}: ${title} ya está en el producto`);
  const cards = kept.filter((l) => isCard(l) || (isComment(l) && l.includes("tarjetas")));
  const real = kept.filter((l) => !cards.includes(l));
  return flags.includes("--primera") ? [line, ...real, ...cards] : [...real, line, ...cards];
});
writeManifest(text);
console.log(`${slug}: agregada «${title}» (${pick.license}, ${pick.author}).`);
