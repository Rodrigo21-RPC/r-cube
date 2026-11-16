import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import type { PhotoCredits as Credits } from "@shared/types";
import { apiFetch } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";

const OPEN = { target: "_blank", rel: "noopener noreferrer" } as const;
const LINK = "text-accent underline underline-offset-2";

/** Créditos de las fotos de la tienda: autor, licencia y enlace de origen de cada foto libre (HU-58, FR-022 a FR-024). */
export default function PhotoCredits() {
  useTitle("Créditos de las fotos");
  const q = useQuery({ queryKey: ["photo-credits"], queryFn: () => apiFetch<Credits>("/catalog/photo-credits") });

  if (q.isPending) return <LoadingBlock label="Cargando créditos…" />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;

  const { external, project } = q.data;
  const bySlug = new Map<string, { name: string; slug: string; photos: Credits["external"] }>();
  for (const e of external) {
    const group = bySlug.get(e.productSlug) ?? { name: e.productName, slug: e.productSlug, photos: [] };
    group.photos.push(e);
    bySlug.set(e.productSlug, group);
  }
  const empty = external.length === 0 && project.length === 0;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold tracking-tight">Créditos de las fotos</h1>
        <p className="leading-relaxed text-muted">
          Las fotos de los productos de demostración provienen de Wikimedia Commons y se usan según la licencia de cada autor. Algunas
          pueden estar reducidas de tamaño y siguen bajo la misma licencia. Las tarjetas de características, destacados y compra segura
          son de R Cube.
        </p>
      </div>

      {empty && <EmptyState title="Aún no hay fotos con crédito" description="Cuando una foto de una fuente libre se agregue a la tienda, su autor y su licencia aparecerán aquí." />}

      {[...bySlug.values()].map((g) => (
        <section key={g.slug} aria-labelledby={`creditos-${g.slug}`} className="flex flex-col gap-3">
          <h2 id={`creditos-${g.slug}`} className="text-[19px] font-semibold">
            <Link to={`/producto/${g.slug}`} className={LINK}>
              {g.name}
            </Link>
          </h2>
          <ul className="flex flex-col gap-3">
            {g.photos.map((p) => (
              <li key={p.imageUrl} className="flex items-start gap-3 rounded-[18px] bg-surface p-3">
                <img src={p.imageUrl} alt="" width={64} height={64} loading="lazy" decoding="async" className="size-16 shrink-0 rounded-xl bg-canvas object-contain" />
                <div className="flex min-w-0 flex-col gap-1 text-[15px]">
                  <p className="break-words font-medium">{p.alt}</p>
                  <p className="break-words text-muted">
                    Autor: {p.author} ·{" "}
                    {p.licenseUrl ? (
                      <a href={p.licenseUrl} {...OPEN} className={LINK}>
                        {p.license}
                      </a>
                    ) : (
                      <span>{p.license}</span>
                    )}
                  </p>
                  <a href={p.sourceUrl} {...OPEN} className={`${LINK} w-fit`}>
                    Ver en Wikimedia Commons
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {project.length > 0 && (
        <section aria-labelledby="creditos-proyecto" className="flex flex-col gap-3">
          <h2 id="creditos-proyecto" className="text-[19px] font-semibold">
            Fotos aportadas por el proyecto
          </h2>
          <p className="text-muted">Estas fotos las aportó el equipo del proyecto y no tienen un autor individual registrado.</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {project.map((p) => (
              <li key={p.productSlug}>
                <Link to={`/producto/${p.productSlug}`} className={LINK}>
                  {p.productName}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
