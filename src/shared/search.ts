/** Minúsculas, sin tildes ni espacios repetidos (HU-02). */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Texto en el que se busca: nombre, marca y descripción normalizados (HU-02). */
export function buildSearchText(name: string, brand: string, description: string): string {
  return normalizeSearch(`${name} ${brand} ${description}`);
}
