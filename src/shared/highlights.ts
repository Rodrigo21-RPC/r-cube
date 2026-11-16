/** Límites de la frase y los destacados de un producto (HU-56, HU-57, FR-014). */
export const TAGLINE_MAX = 90;
export const HIGHLIGHT_MAX = 60;
export const HIGHLIGHTS_MAX = 5;

/** Recorta los espacios y descarta los destacados vacíos; conserva el orden y no corta los textos largos (FR-018). */
export function normalizeHighlights(list: string[]): string[] {
  return list.map((t) => t.trim()).filter((t) => t.length > 0);
}
