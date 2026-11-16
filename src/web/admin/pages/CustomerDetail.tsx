import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { formatPEN } from "@shared/money";
import type { CustomerDetail as Detail } from "@shared/admin-types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { StatusBadge, formatDate } from "@web/components/StatusBadge";
import { Button } from "@web/components/ui/button";
import { Badge, Card } from "@web/components/ui/misc";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { WhatsAppLink } from "../components/WhatsAppLink";

/** Detalle del cliente con sus pedidos, bloqueo y reactivación (HU-39, HU-40). */
export default function CustomerDetail() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["admin", "customer", id], queryFn: () => apiFetch<Detail>(`/admin/customers/${id}`) });
  useTitle(q.data ? `Panel: ${q.data.name}` : "Panel: cliente");

  if (q.isPending) return <LoadingBlock />;
  if (q.isError)
    return q.error instanceof ApiError && q.error.status === 404 ? <EmptyState title="Cliente no encontrado" /> : <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  const c = q.data;

  async function setBlocked(blocked: boolean) {
    try {
      await apiFetch(`/admin/customers/${id}/${blocked ? "block" : "unblock"}`, { method: "POST", json: {} });
      toast.success(blocked ? `${c.name} quedó bloqueado. Se cerraron sus sesiones.` : `${c.name} puede volver a ingresar.`);
    } catch (e) {
      throw e instanceof ApiError ? new Error(e.message) : e;
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    }
  }
  const address = [c.address.line, c.address.district].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-5">
      <Link to="/admin/clientes" className="inline-flex w-fit items-center gap-1 text-sm text-accent hover:underline"><ArrowLeft aria-hidden className="size-4" /> Clientes</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-semibold tracking-tight">{c.name}</h1>
          <Badge tone={c.blocked ? "danger" : "success"}>{c.blocked ? "Bloqueado" : "Activo"}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <WhatsAppLink phone={c.phone} name={c.name} />
        {c.blocked ? (
          <Button variant="secondary" onClick={() => setBlocked(false).catch((x: Error) => toast.error(x.message))}>Reactivar cliente</Button>
        ) : (
          <ConfirmDialog
            title={`¿Bloquear a ${c.name}?`}
            description="Se cerrarán sus sesiones y no podrá ingresar ni comprar hasta que lo reactives. Sus pedidos no cambian."
            confirmLabel="Bloquear cliente"
            danger
            onConfirm={() => setBlocked(true)}
            trigger={(open) => <Button variant="secondary" onClick={open}>Bloquear cliente</Button>}
          />
        )}
        </div>
      </div>
      <Card className="grid gap-4 md:grid-cols-4">
        <div><p className="text-xs uppercase tracking-wide text-muted">Correo</p><p className="break-all">{c.email}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted">Teléfono</p><p className="tabular">{c.phone || "Sin registrar"}</p></div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Dirección</p>
          <p>{address || "Sin registrar"}</p>
          {c.address.reference && <p className="text-sm text-muted">{c.address.reference}</p>}
        </div>
        <div><p className="text-xs uppercase tracking-wide text-muted">Cliente desde</p><p>{formatDate(c.createdAt)}</p></div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card><p className="text-xs uppercase tracking-wide text-muted">Pedidos</p><p className="tabular text-[28px] font-semibold">{c.orders}</p></Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Total gastado</p>
          <p className="tabular text-[28px] font-semibold">{formatPEN(c.spentCents)}</p>
          <p className="text-sm text-muted">Sin contar pendientes ni cancelados</p>
        </Card>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-semibold">Pedidos</h2>
        {c.orderList.length === 0 ? <EmptyState title="Aún no tiene pedidos" /> : (
          <DataTable
            caption={`Pedidos de ${c.name}`}
            rows={c.orderList}
            rowKey={(o) => o.number}
            columns={[
              { header: "N.º", cell: (o) => <Link to={`/admin/pedidos/${o.number}`} className="tabular font-medium text-accent underline underline-offset-2">{o.number}</Link> },
              { header: "Fecha", cell: (o) => formatDate(o.createdAt) },
              { header: "Total", cell: (o) => formatPEN(o.totalCents), align: "right" },
              { header: "Estado", cell: (o) => <StatusBadge status={o.status} /> },
            ]}
          />
        )}
      </section>
    </div>
  );
}
