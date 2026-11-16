import { useQuery } from "@tanstack/react-query";
import type { ProductCard as Card } from "@shared/types";
import { apiFetch } from "@web/api";
import { ProductCard } from "@web/components/ProductCard";

/** Hasta 4 productos de la misma categoría; sin candidatos, la sección no aparece (HU-51, FR-026). */
export function RelatedProducts({ slug }: { slug: string }) {
  const q = useQuery({ queryKey: ["related", slug], queryFn: () => apiFetch<Card[]>(`/catalog/products/${slug}/related`) });
  if (!q.data || q.data.length === 0) return null;
  return (
    <section aria-labelledby="relacionados-titulo" className="flex flex-col gap-4">
      <h2 id="relacionados-titulo" className="text-[22px] font-semibold tracking-tight">Productos relacionados</h2>
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {q.data.map((p) => (
          <li key={p.id}><ProductCard product={p} /></li>
        ))}
      </ul>
    </section>
  );
}
