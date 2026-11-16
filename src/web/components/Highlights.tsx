import { Check } from "lucide-react";

/**
 * Frase corta y destacados bajo el nombre del producto (HU-56). Todo se muestra como texto (FR-016); sin frase ni
 * destacados no se dibuja nada, ni siquiera un contenedor vacío (FR-015).
 */
export function Highlights({ tagline, highlights }: { tagline: string; highlights: string[] }) {
  if (!tagline && highlights.length === 0) return null;
  return (
    <div data-testid="destacados" className="flex flex-col gap-3 rounded-[18px] border border-border bg-surface p-4">
      {tagline && (
        <p data-testid="frase" className="text-[17px] font-semibold leading-snug text-accent">
          {tagline}
        </p>
      )}
      {highlights.length > 0 && (
        <ul className="flex flex-col gap-2">
          {highlights.map((h, i) => (
            <li key={`${h}-${i}`} className="flex items-start gap-2.5 text-[15px] leading-snug text-text">
              <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
              <span className="min-w-0 break-words">{h}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
