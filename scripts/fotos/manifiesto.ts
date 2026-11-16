/**
 * Edición del manifiesto src/db/gallery-data.ts desde los scripts (solo desarrollo, feature 004).
 * El manifiesto es TypeScript escrito a mano; aquí solo se toca la lista `photos` de un producto y se renumeran las
 * rutas de sus fotos a `/img/productos/galeria/<slug>-<n>.webp` en el orden de la lista.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const MANIFEST = join(process.cwd(), "src", "db", "gallery-data.ts");

export const readManifest = () => readFileSync(MANIFEST, "utf-8");
export const writeManifest = (text: string) => writeFileSync(MANIFEST, text);

/**
 * Aplica `change` a las líneas de fotos de un producto (una línea por foto; las que son comentarios se conservan) y
 * deja la lista en varias líneas con las rutas renumeradas.
 */
export function updatePhotos(text: string, slug: string, change: (photoLines: string[]) => string[]): string {
  const startKey = `  "${slug}": {`;
  const start = text.indexOf(startKey);
  if (start < 0) throw new Error(`${slug}: no está en gallery-data.ts`);
  const end = text.indexOf("\n  },\n", start);
  const lines = text.slice(start, end).split("\n");
  const at = lines.findIndex((l) => l.trim().startsWith("photos: ["));
  if (at < 0) throw new Error(`${slug}: no se encontró photos`);

  let body: string[];
  const single = /^(\s*)photos: \[(\{.*\})\],$/.exec(lines[at]!);
  if (single) body = [`      ${single[2]},`];
  else {
    const close = lines.findIndex((l, i) => i > at && l === "    ],");
    if (close < 0) throw new Error(`${slug}: no se encontró el cierre de photos`);
    body = lines.slice(at + 1, close);
  }

  let n = 0;
  const renumbered = change(body).map((l) => (l.includes("url: ") ? l.replace(/url: "[^"]*"/, () => `url: "/img/productos/galeria/${slug}-${++n}.webp"`) : l));
  const photos = ["    photos: [", ...renumbered, "    ],"];
  return text.slice(0, start) + [...lines.slice(0, at), ...photos].join("\n") + text.slice(end);
}

export const isCard = (line: string) => line.includes('origin: "tarjeta"');
export const isComment = (line: string) => line.trim().startsWith("//");
