/**
 * Prepara las fotos de la galería (solo desarrollo, feature 004, research R6 y R8).
 * Uso: npm run fotos:preparar [-- --solo=<slug>]
 * Lee src/db/gallery-data.ts; por cada foto «externa» descarga la miniatura de 1 200 px desde Wikimedia Commons y por
 * cada foto del «proyecto» lee el original de public/img/productos/ (sin modificarlo); las reduce a WebP de hasta
 * 200 KB y escribe public/img/productos/galeria/<slug>-<n>.webp (siempre se regeneran, porque las rutas se renumeran
 * al agregar fotos). Sin --solo, borra de esa carpeta los archivos que ya no usa el manifiesto. Las tarjetas las genera
 * tarjetas.ts.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { GALLERY } from "../../src/db/gallery-data";
import { CACHE, PUBLIC, commonsFile, download, safeName } from "./commons";
import { MAX_BYTES, openEncoder } from "./encode";

const only = process.argv.find((a) => a.startsWith("--solo="))?.slice(7);
const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

const encoder = await openEncoder();
let written = 0;
try {
  for (const [slug, entry] of Object.entries(GALLERY)) {
    if (only && slug !== only) continue;
    for (const [i, photo] of entry.photos.entries()) {
      if (photo.origin === "tarjeta" || photo.url === "/img/generico.svg") continue; // la imagen genérica no se prepara
      const expected = `/img/productos/galeria/${slug}-${i + 1}.webp`;
      if (photo.url !== expected) throw new Error(`${slug}: la foto ${i + 1} debe tener url ${expected} y tiene ${photo.url}`);
      const out = join(PUBLIC, photo.url);

      let bytes: Buffer;
      let mime: string;
      if (photo.origin === "externa") {
        if (!photo.source || !photo.credit) throw new Error(`${slug}: la foto ${i + 1} es externa y necesita source y credit`);
        const file = await commonsFile(photo.source);
        if (file.license !== photo.credit.license) console.warn(`  AVISO ${slug} #${i + 1}: licencia en Commons «${file.license}» y en el manifiesto «${photo.credit.license}»`);
        if (file.author !== photo.credit.author) console.warn(`  AVISO ${slug} #${i + 1}: autor en Commons «${file.author}» y en el manifiesto «${photo.credit.author}»`);
        const ext = extname(new URL(file.thumbUrl).pathname) || ".jpg";
        bytes = await download(file.thumbUrl, join(CACHE, "descargas", `${safeName(file.title)}${ext}`));
        mime = file.mime;
      } else {
        if (!photo.source) throw new Error(`${slug}: la foto ${i + 1} del proyecto necesita source`);
        const original = join(PUBLIC, "img", "productos", photo.source);
        bytes = readFileSync(original);
        mime = MIME[extname(original).toLowerCase()] ?? "image/jpeg";
      }

      const webp = await encoder.encode(bytes, mime, photo.crop);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, webp);
      written++;
      console.log(`${photo.url}  ${(webp.length / 1024).toFixed(0)} KB (máximo ${MAX_BYTES / 1024} KB)`);
    }
  }
} finally {
  await encoder.close();
}
if (!only) {
  const used = new Set(Object.values(GALLERY).flatMap((e) => e.photos.map((p) => p.url.split("/").pop())));
  const dir = join(PUBLIC, "img", "productos", "galeria");
  for (const f of readdirSync(dir)) {
    if (!used.has(f)) {
      rmSync(join(dir, f));
      console.log(`Borrado el archivo huérfano ${f}`);
    }
  }
}
console.log(`\nFotos escritas: ${written}.`);
