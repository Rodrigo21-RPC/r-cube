import { useState } from "react";
import { Link } from "react-router";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import type { Notification } from "@shared/types";
import { apiFetch } from "@web/api";
import { useSession } from "@web/auth";
import { useTitle } from "@web/hooks/useTitle";
import { Pagination } from "@web/admin/components/Pagination";
import { NotificationItem, refreshNotifications } from "@web/components/NotificationItem";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { Button } from "@web/components/ui/button";
import { Card } from "@web/components/ui/misc";

/** Lista completa de avisos del cliente, de 20 en 20 (HU-53, FR-030). */
export default function Notifications() {
  useTitle("Avisos");
  const { data: me, isPending } = useSession();
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["notifications", "list", page],
    queryFn: () => apiFetch<{ items: Notification[]; total: number; page: number; pageSize: number }>(`/notifications?page=${page}`),
    enabled: me?.role === "cliente",
    placeholderData: keepPreviousData,
  });
  const readAll = useMutation({ mutationFn: () => apiFetch("/notifications/read-all", { method: "POST" }), onSettled: () => refreshNotifications() });

  if (isPending) return <LoadingBlock />;
  if (!me) return <EmptyState title="Inicia sesión para ver tus avisos" action={<Button asChild><Link to="/ingresar?volver=/avisos">Ingresar</Link></Button>} />;
  if (q.isPending) return <LoadingBlock label="Cargando tus avisos…" />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold tracking-tight">Avisos</h1>
        {q.data.items.some((n) => !n.read) && <Button variant="secondary" onClick={() => readAll.mutate()} disabled={readAll.isPending}>Marcar todos como leídos</Button>}
      </div>
      {q.data.items.length === 0 ? (
        <EmptyState title="No tienes avisos" description="Te avisaremos aquí cuando cambie el estado de tus pedidos." />
      ) : (
        <>
          <Card className="p-0">
            <ul>{q.data.items.map((n) => <NotificationItem key={n.id} n={n} />)}</ul>
          </Card>
          <Pagination page={page} total={q.data.total} pageSize={q.data.pageSize} onPage={setPage} />
        </>
      )}
    </div>
  );
}
