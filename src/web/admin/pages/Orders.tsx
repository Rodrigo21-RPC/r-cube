import { Link, useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { formatPEN } from "@shared/money";
import { ORDER_STATUSES, STATUS_LABEL } from "@shared/order-status";
import { PAYMENT_LABEL, type PaymentMethodCode } from "@shared/types";
import type { AdminOrderRow, Page } from "@shared/admin-types";
import { apiFetch } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { StatusBadge, formatDate } from "@web/components/StatusBadge";
import { Button } from "@web/components/ui/button";
import { Input, Select } from "@web/components/ui/form";
import { DataTable } from "../components/DataTable";
import { Pagination } from "../components/Pagination";

/** Descarga el CSV con los filtros activos; si hay demasiadas filas, muestra el aviso del servidor (HU-37). */
async function downloadCsv(qs: string) {
  const res = await fetch(`/api/admin/orders/export.csv?${qs}`, { credentials: "same-origin" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    toast.error(body?.error?.message ?? "No se pudo exportar.");
    return;
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Pedidos del panel con filtros, paginación y exportación (HU-34, HU-37). */
export default function Orders() {
  useTitle("Panel: pedidos");
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? "1") || 1;
  const list = useQuery({
    queryKey: ["admin", "orders", params.toString()],
    queryFn: () => apiFetch<Page<AdminOrderRow>>(`/admin/orders?${params.toString()}`),
    placeholderData: keepPreviousData,
  });

  function set(key: string, value: string) {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    if (key !== "page") p.delete("page");
    setParams(p);
  }
  const filterQs = () => {
    const p = new URLSearchParams(params);
    p.delete("page");
    return p.toString();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold tracking-tight">Pedidos</h1>
        <Button variant="secondary" onClick={() => downloadCsv(filterQs())}><Download aria-hidden className="size-4" /> Exportar CSV</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor="q-ped" className="sr-only">Buscar por N.º, nombre o correo</label>
          <Input id="q-ped" type="search" placeholder="N.º, nombre o correo del cliente…" defaultValue={params.get("q") ?? ""} onChange={(e) => set("q", e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-est" className="sr-only">Estado</label>
          <Select id="f-est" value={params.get("status") ?? ""} onChange={(e) => set("status", e.target.value)}>
            <option value="">Todos los estados</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="f-met" className="sr-only">Método de pago</label>
          <Select id="f-met" value={params.get("method") ?? ""} onChange={(e) => set("method", e.target.value)}>
            <option value="">Todos los métodos</option>
            {(Object.keys(PAYMENT_LABEL) as PaymentMethodCode[]).map((m) => <option key={m} value={m}>{PAYMENT_LABEL[m]}</option>)}
          </Select>
        </div>
        {/* Las fechas van en su propia fila y bajan una debajo de la otra si no caben (sin desplazamiento lateral). */}
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <div className="min-w-36 flex-1">
            <label htmlFor="f-desde" className="text-xs text-muted">Desde</label>
            <Input id="f-desde" type="date" className="h-10" value={params.get("from") ?? ""} onChange={(e) => set("from", e.target.value)} />
          </div>
          <div className="min-w-36 flex-1">
            <label htmlFor="f-hasta" className="text-xs text-muted">Hasta</label>
            <Input id="f-hasta" type="date" className="h-10" value={params.get("to") ?? ""} onChange={(e) => set("to", e.target.value)} />
          </div>
        </div>
      </div>
      {list.isPending ? <LoadingBlock /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => list.refetch()} /> : list.data.items.length === 0 ? (
        <EmptyState title="No hay pedidos con estos filtros" />
      ) : (
        <>
          <DataTable
            caption="Pedidos"
            rows={list.data.items}
            rowKey={(o) => o.number}
            columns={[
              { header: "N.º", cell: (o) => <Link to={`/admin/pedidos/${o.number}`} className="tabular font-medium text-accent underline underline-offset-2">{o.number}</Link> },
              { header: "Fecha", cell: (o) => formatDate(o.createdAt), className: "whitespace-nowrap" },
              { header: "Cliente", cell: (o) => <span className="flex flex-col"><span>{o.customerName}</span><span className="text-sm text-muted">{o.customerEmail}</span></span> },
              { header: "Método", cell: (o) => PAYMENT_LABEL[o.method] },
              { header: "Total", cell: (o) => formatPEN(o.totalCents), align: "right" },
              { header: "Estado", cell: (o) => <StatusBadge status={o.status} /> },
            ]}
          />
          <Pagination page={page} total={list.data.total} pageSize={list.data.pageSize} onPage={(n) => set("page", String(n))} />
        </>
      )}
    </div>
  );
}
