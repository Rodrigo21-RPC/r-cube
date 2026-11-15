import { useId } from "react";
import type { VariantDto } from "@shared/types";
import { cn } from "@web/lib/cn";

type Attr = "storage" | "color" | "ram";
const ATTRS: { key: Attr; label: string }[] = [
  { key: "storage", label: "Almacenamiento" },
  { key: "color", label: "Color" },
  { key: "ram", label: "RAM" },
];

export type VariantChoice = Partial<Record<Attr, string>>;

/** Variante que coincide con lo elegido en todos los atributos que el producto usa; null si falta elegir alguno. */
export function variantFor(variants: VariantDto[], choice: VariantChoice): VariantDto | null {
  const used = ATTRS.filter((a) => variants.some((v) => v[a.key]));
  if (used.some((a) => !choice[a.key])) return null;
  return variants.find((v) => used.every((a) => v[a.key] === choice[a.key])) ?? null;
}

/**
 * Selector de variante (HU-44): un grupo de botones de opción por atributo. Usa `radio` nativos, así que
 * se opera con flechas y Tab; las opciones sin stock o sin combinación quedan deshabilitadas con «Agotado».
 */
export function VariantPicker({
  variants,
  choice,
  onChange,
  invalid = false,
}: {
  variants: VariantDto[];
  choice: VariantChoice;
  onChange: (next: VariantChoice) => void;
  invalid?: boolean;
}) {
  const uid = useId();
  return (
    <div className="flex flex-col gap-4">
      {ATTRS.map(({ key, label }) => {
        const values = [...new Set(variants.map((v) => v[key]).filter(Boolean))];
        if (values.length === 0) return null;
        return (
          <fieldset key={key} className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">
              {label}
              {choice[key] ? <span className="font-normal text-muted">: {choice[key]}</span> : null}
            </legend>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const others = ATTRS.filter((a) => a.key !== key && choice[a.key]);
                const matching = variants.filter((v) => v[key] === value && others.every((a) => v[a.key] === choice[a.key]));
                const inStock = matching.some((v) => v.stock > 0);
                const id = `${uid}-${key}-${value}`;
                return (
                  <div key={value}>
                    <input
                      id={id}
                      type="radio"
                      name={`${uid}-${key}`}
                      className="peer sr-only"
                      checked={choice[key] === value}
                      disabled={!inStock}
                      onChange={() => onChange({ ...choice, [key]: value })}
                    />
                    <label
                      htmlFor={id}
                      className={cn(
                        "inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full border-2 px-4 text-[15px] font-medium transition-colors",
                        "border-border bg-surface hover:border-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]",
                        "peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-accent",
                        "peer-disabled:cursor-not-allowed peer-disabled:text-muted peer-disabled:line-through",
                        invalid && !choice[key] && "border-danger",
                      )}
                    >
                      {value}
                      {!inStock && <span className="text-xs no-underline">Agotado</span>}
                    </label>
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
