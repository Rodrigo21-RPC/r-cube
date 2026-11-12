import { useEffect, useState, type FormEvent } from "react";
import type { Facets } from "@shared/types";
import { Button } from "./ui/button";
import { Input } from "./ui/form";

export interface FilterValues {
  category?: string;
  brands: string[];
  min?: string;
  max?: string;
  available: boolean;
}

/** Filtros combinables de categoría, marca, precio y disponibilidad (HU-03). */
export function Filters({
  facets,
  values,
  onChange,
}: {
  facets: Facets | undefined;
  values: FilterValues;
  onChange: (next: Partial<FilterValues>) => void;
}) {
  const [min, setMin] = useState(values.min ?? "");
  const [max, setMax] = useState(values.max ?? "");
  useEffect(() => {
    setMin(values.min ?? "");
    setMax(values.max ?? "");
  }, [values.min, values.max]);

  function applyPrice(e: FormEvent) {
    e.preventDefault();
    onChange({ min: min || undefined, max: max || undefined });
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Categoría</legend>
        <div className="flex flex-col gap-1">
          {[{ slug: "", name: "Todas", count: undefined as number | undefined }, ...(facets?.categories ?? [])].map((c) => (
            <label key={c.slug || "todas"} className="flex min-h-9 cursor-pointer items-center gap-2 text-[15px]">
              <input
                type="radio"
                name="categoria"
                className="size-4 accent-[var(--accent)]"
                checked={(values.category ?? "") === c.slug}
                onChange={() => onChange({ category: c.slug || undefined })}
              />
              <span>{c.name}</span>
              {c.count !== undefined && <span className="text-sm text-muted">({c.count})</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Marca</legend>
        <div className="flex max-h-60 flex-col gap-1 overflow-y-auto pr-1">
          {(facets?.brands ?? []).map((b) => (
            <label key={b.slug} className="flex min-h-9 cursor-pointer items-center gap-2 text-[15px]">
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={values.brands.includes(b.slug)}
                onChange={(e) =>
                  onChange({
                    brands: e.target.checked ? [...values.brands, b.slug] : values.brands.filter((x) => x !== b.slug),
                  })
                }
              />
              <span>{b.name}</span>
              <span className="text-sm text-muted">({b.count})</span>
            </label>
          ))}
        </div>
      </fieldset>

      <form onSubmit={applyPrice} className="flex flex-col gap-2">
        <p className="text-sm font-semibold" id="precio-label">
          Precio (S/)
        </p>
        <div className="flex items-center gap-2" role="group" aria-labelledby="precio-label">
          <Input inputMode="numeric" pattern="[0-9]*" aria-label="Precio mínimo en soles" placeholder="Mín." value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} />
          <span aria-hidden>–</span>
          <Input inputMode="numeric" pattern="[0-9]*" aria-label="Precio máximo en soles" placeholder="Máx." value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Aplicar precio
        </Button>
      </form>

      <label className="flex min-h-9 cursor-pointer items-center gap-2 text-[15px]">
        <input
          type="checkbox"
          className="size-4 accent-[var(--accent)]"
          checked={values.available}
          onChange={(e) => onChange({ available: e.target.checked })}
        />
        Solo disponibles
      </label>
    </div>
  );
}
