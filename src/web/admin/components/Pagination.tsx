import { Button } from "@web/components/ui/button";

/** Paginación accesible (RNF-02). */
export function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="text-sm text-muted">{total} resultado{total === 1 ? "" : "s"}</p>;
  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted">{total} resultados</p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</Button>
        <span className="tabular text-sm text-muted" aria-current="page">Página {page} de {pages}</span>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Siguiente</Button>
      </div>
    </nav>
  );
}
