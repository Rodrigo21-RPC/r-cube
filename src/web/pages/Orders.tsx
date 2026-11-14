import { Link, Navigate, useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { formatPEN } from "@shared/money";
import type { OrderSummary } from "@shared/types";
import { apiFetch } from "@web/api";
import { useSession } from "@web/auth";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { StatusBadge, formatDate } from "@web/components/StatusBadge";
import { Button } from "@web/components/ui/button";

type Page = { items: OrderSummary[]; total: number; page: number; pageSize: number };

/** Mis pedidos: del más nuevo al más antiguo, con N.º, fecha, total y estado (HU-22). */
export default function Orders() {
  useTitle("Mis pedidos");
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? "1") || 1;
  const q = useQuery({
    queryKey: ["orders", "list", page],
    queryFn: () => apiFetch<Page>(`/orders?page=${page}`),
    enabled: Boolean(session.data),
    placeholderData: keepPreviousData,
  });

  if (session.isPending) return <LoadingBlock />;
  if (!session.data) return <Navigate to="/ingresar?volver=/pedidos" replace />;
  if (q.isPending) return <LoadingBlock label="Cargando pedidos…" />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  const pages = Math.max(1, Math.ceil(q.data.total / q.data.pageSize));

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-semibold tracking-tight">Mis pedidos</h1>
      {q.data.items.length === 0 ? (
        <EmptyState title="Aún no tienes pedidos" description="Cuando compres, verás aquí el estado de cada pedido." action={<Button asChild><Link to="/catalogo">Ver catálogo</Link></Button>} />
      ) : (
        <ul className="flex flex-col gap-3">
          {q.data.items.map((o) => (
            <li key={o.number}>
              <Link to={`/pedidos/${o.number}`} className="flex items-center gap-4 rounded-[18px] bg-surface p-5 hover:bg-surface-2">
                <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
                  <span className="tabular font-semibold">{o.number}</span>
                  <span className="text-sm text-muted">{formatDate(o.createdAt)}</span>
                  <span className="tabular font-medium sm:ml-auto">{formatPEN(o.totalCents)}</span>
                </div>
                <StatusBadge status={o.status} />
                <ChevronRight aria-hidden className="size-5 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Paginación" className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>Anterior</Button>
          <span className="text-sm text-muted">Página {page} de {pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setParams({ page: String(page + 1) })}>Siguiente</Button>
        </nav>
      )}
    </div>
  );
}
