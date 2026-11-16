/**
 * Utilidades de Wikimedia Commons para los scripts de fotos (solo desarrollo, feature 004, research R7).
 * Nada de esto se ejecuta en la tienda: las fotos se descargan una vez y se guardan junto a ella.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const CACHE = join(process.cwd(), "scripts", "fotos", ".cache");
export const PUBLIC = join(process.cwd(), "public");

const API = "https://commons.wikimedia.org/w/api.php";
/** Cliente genérico: sin datos personales (principio V). */
const USER_AGENT = "RCubeLab/1.0 (proyecto educativo)";

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface CommonsFile {
  title: string;
  pageUrl: string;
  author: string;
  license: string;
  width: number;
  height: number;
  mime: string;
  thumbUrl: string;
}

interface RawPage {
  title: string;
  index?: number;
  imageinfo?: {
    url: string;
    descriptionurl: string;
    thumburl?: string;
    width: number;
    height: number;
    mime: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
}

/** Texto plano de un fragmento HTML (el autor llega como un enlace). */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Consulta la API con pausas y reintentos pacientes: Commons limita las ráfagas de peticiones. */
async function getJson(params: Record<string, string>): Promise<unknown> {
  const url = `${API}?${new URLSearchParams({ format: "json", ...params })}`;
  for (let attempt = 1; attempt <= 6; attempt++) {
    await sleep(700);
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
    if (res.ok) return res.json();
    const wait = Number(res.headers.get("retry-after")) || 4 * attempt;
    await sleep(wait * 1000);
  }
  throw new Error(`Commons no respondió: ${url}`);
}

function toFile(p: RawPage): CommonsFile | null {
  const info = p.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  return {
    title: p.title,
    pageUrl: info.descriptionurl,
    author: plainText(meta.Artist?.value ?? ""),
    license: (meta.LicenseShortName?.value ?? "").trim(),
    width: info.width,
    height: info.height,
    mime: info.mime,
    thumbUrl: info.thumburl ?? info.url,
  };
}

const IMAGE_INFO = { prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiextmetadatafilter: "LicenseShortName|Artist" };

/** Busca archivos de imagen en Commons, en el orden de relevancia que devuelve la búsqueda. */
export async function searchCommons(query: string, limit = 40, width = 800): Promise<CommonsFile[]> {
  const data = (await getJson({
    action: "query",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: String(limit),
    ...IMAGE_INFO,
    iiurlwidth: String(width),
  })) as { query?: { pages?: Record<string, RawPage> } };
  return Object.values(data.query?.pages ?? {})
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map(toFile)
    .filter((f): f is CommonsFile => f !== null);
}

/** Un archivo concreto de Commons, por su título («File:Galaxy S23.png»), con la miniatura del ancho pedido. */
export async function commonsFile(title: string, width = 1200): Promise<CommonsFile> {
  // Los metadatos de un archivo no cambian: se guardan en la caché para no repetir la consulta.
  const cached = join(CACHE, "meta", `${safeName(title)}-${width}.json`);
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, "utf-8")) as CommonsFile;
  const data = (await getJson({ action: "query", titles: title, ...IMAGE_INFO, iiurlwidth: String(width) })) as {
    query?: { pages?: Record<string, RawPage> };
  };
  const page = Object.values(data.query?.pages ?? {})[0];
  const file = page ? toFile(page) : null;
  if (!file) throw new Error(`No existe en Commons: ${title}`);
  mkdirSync(dirname(cached), { recursive: true });
  writeFileSync(cached, JSON.stringify(file));
  return file;
}

/** Descarga una URL a la caché (si ya está, la reutiliza) y devuelve sus bytes. */
export async function download(url: string, to: string): Promise<Buffer> {
  if (existsSync(to)) return readFileSync(to);
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
    if (res.ok) {
      const bytes = Buffer.from(await res.arrayBuffer());
      mkdirSync(dirname(to), { recursive: true });
      writeFileSync(to, bytes);
      await sleep(400);
      return bytes;
    }
    await sleep(2000 * attempt);
  }
  throw new Error(`No se pudo descargar: ${url}`);
}

/** Nombre de archivo seguro a partir de un texto. */
export const safeName = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
