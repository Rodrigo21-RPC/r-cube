/** Utilidades puras de variantes de producto (HU-43, HU-44). */
import { formatPEN, type Cents } from "./money";

export interface VariantAttributes {
  storage: string;
  color: string;
  ram: string;
}

/** Nombre legible: «256 GB · Azul · 8 GB RAM»; omite los atributos vacíos. */
export function variantLabel(a: VariantAttributes): string {
  const ram = a.ram.trim();
  return [a.storage.trim(), a.color.trim(), ram ? `${ram} RAM` : ""].filter(Boolean).join(" · ");
}

/** Texto del precio de un producto con variantes: «S/ a a S/ b» o un solo precio si no hay rango. */
export function priceRangeText(minCents: Cents, maxCents: Cents | null): string {
  return maxCents !== null && maxCents > minCents ? `${formatPEN(minCents)} a ${formatPEN(maxCents)}` : formatPEN(minCents);
}
