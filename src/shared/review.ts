/** Utilidades puras de reseñas (HU-46). */

/** Nombre público de quien reseña: primer nombre y la inicial del último apellido («Mateo Q.»); una sola palabra se muestra completa. */
export function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Cliente";
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}

export const REVIEWS_PAGE_SIZE = 5;
export const REVIEW_COMMENT_MAX = 1000;
