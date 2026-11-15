import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatPEN } from "@shared/money";
import { PAYMENT_LABEL } from "@shared/types";
import type { PendingPayment } from "@shared/admin-types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { formatDate } from "@web/components/StatusBadge";
import { Button } from "@web/components/ui/button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";

function remaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Vence en la próxima revisión";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h} h ${m} min`;
}

/** Botones confirmar y rechazar, en la lista y en el detalle del pedido (HU-36, FR-019). */
export function PaymentActions({ number, onDone }: { number: string; onDone: () => Promise<unknown> }) {
  async function confirm() {
    try {
      await apiFetch(`/admin/orders/${number}/payment/confirm`, { method: "POST", json: {} });
      toast.success(`Pago de ${number} confirmado.`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo confirmar.");
    } finally {
      await onDone();
    }
  }
  return (
    <span className="flex gap-2">
      <Button size="sm" onClick={confirm}>Confirmar pago</Button>
      <ConfirmDialog
        title={`¿Rechazar el pago de ${number}?`}
        description="El pedido se cancela y el stock vuelve a la tienda."
        confirmLabel="Rechazar pago"
        danger
        reasonLabel="Motivo del rechazo"
        onConfirm={async (reason) => {
          try {
            await apiFetch(`/admin/orders/${number}/payment/reject`, { method: "POST", json: { reason } });
            toast.success(`Pago de ${number} rechazado.`);
          } catch (e) {
            throw new Error(e instanceof ApiError ? e.message : "No se pudo rechazar.");
          } finally {
            await onDone();
          }
        }}
        trigger={(open) => <Button size="sm" variant="secondary" onClick={open}>Rechazar</Button>}
      />
    </span>
  );
}

/** Pagos por confirmar (HU-36, RN-12). */
export default function Payments() {
  useTitle("Panel: pagos por confirmar");
  const q = useQuery({ queryKey: ["admin", "payments"], queryFn: () => apiFetch<PendingPayment[]>("/admin/payments/pending"), refetchInterval: 60_000 });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin"] });
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-semibold tracking-tight">Pagos por confirmar</h1>
      <p className="text-muted">Los pedidos que no se pagan en 24 horas se cancelan solos y devuelven su stock.</p>
      {q.isPending ? <LoadingBlock /> : q.isError ? <ErrorState message={q.error.message} onRetry={() => q.refetch()} /> : q.data.length === 0 ? (
        <EmptyState title="No hay pagos por confirmar" />
      ) : (
        <DataTable
          caption="Pagos por confirmar"
          rows={q.data}
          rowKey={(p) => p.number}
          columns={[
            { header: "N.º", cell: (p) => <Link to={`/admin/pedidos/${p.number}`} className="tabular font-medium text-accent underline underline-offset-2">{p.number}</Link> },
            { header: "Cliente", cell: (p) => p.customerName },
            { header: "Método", cell: (p) => PAYMENT_LABEL[p.method] },
            { header: "Código", cell: (p) => <span className="tabular">{p.operationCode ?? "Sin código"}</span> },
            { header: "Monto", cell: (p) => formatPEN(p.totalCents), align: "right" },
            { header: "Creado", cell: (p) => formatDate(p.createdAt) },
            { header: "Vence en", cell: (p) => remaining(p.expiresAt) },
            { header: "Acciones", cell: (p) => <PaymentActions number={p.number} onDone={refresh} /> },
          ]}
        />
      )}
    </div>
  );
}
