/** Nombre del índice o restricción de una violación de índice único (23505), venga o no envuelta por Drizzle; null si es otro error. */
export function uniqueViolation(e: unknown): string | null {
  const err = e as { code?: string; constraint_name?: string; constraint?: string; cause?: unknown };
  const src = err?.code === "23505" ? err : (err?.cause as typeof err | undefined);
  return src?.code === "23505" ? (src.constraint_name ?? src.constraint ?? "") : null;
}
