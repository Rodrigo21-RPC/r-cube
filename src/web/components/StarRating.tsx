import { useId } from "react";
import { Star } from "lucide-react";
import { cn } from "@web/lib/cn";

const fmt = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

/** Estrellas de solo lectura; el texto oculto lo lee el lector de pantalla («4,5 de 5»). */
export function StarRating({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      <span className="sr-only">{fmt.format(value)} de 5</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={cn("size-4", n <= Math.round(value) ? "fill-warning text-warning" : "text-muted")} />
      ))}
    </span>
  );
}

/**
 * Entrada de calificación: 5 botones de opción nativos (flechas y Tab funcionan sin código extra) con
 * etiqueta «N estrellas» (HU-46, RNF-03).
 */
export function StarInput({ value, onChange, error }: { value: number; onChange: (n: number) => void; error?: string }) {
  const uid = useId();
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">Calificación</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n}>
            <input id={`${uid}-${n}`} type="radio" name={`${uid}-rating`} className="peer sr-only" checked={value === n} onChange={() => onChange(n)} aria-describedby={error ? `${uid}-error` : undefined} />
            <label
              htmlFor={`${uid}-${n}`}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]"
            >
              <span className="sr-only">{n === 1 ? "1 estrella" : `${n} estrellas`}</span>
              <Star aria-hidden className={cn("size-7", n <= value ? "fill-warning text-warning" : "text-muted")} />
            </label>
          </div>
        ))}
      </div>
      {error && (
        <p id={`${uid}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
