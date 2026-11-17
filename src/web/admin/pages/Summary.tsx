import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { formatPEN } from "@shared/money";
import type { AdminSummary } from "@shared/admin-types";
import { PAYMENT_LABEL } from "@shared/types";
import { apiFetch } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { ErrorState, LoadingBlock } from "@web/components/States";
import { StatusBadge, formatDate } from "@web/components/StatusBadge";
import { Card } from "@web/components/ui/misc";
import { DataTable } from "../components/DataTable";
import { CategoryBars, SalesChart } from "../components/SalesChart";

/** Resumen del negocio (HU-27). */
export default function Summary() {
  useTitle("Panel: resumen");
  const q = useQuery({ queryKey: ["admin", "summary"], queryFn: () => apiFetch<AdminSummary>("/admin/summary") });
  if (q.isPending) return <LoadingBlock label="Cargando resumen…" />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  const s = q.data;
  const cards = [
    { label: "Ventas de hoy", value: formatPEN(s.cards.salesTodayCents), to: "/admin/pedidos" },
    { label: "Pedidos por preparar", value: String(s.cards.toPrepare), to: "/admin/pedidos?status=paid" },
    { label: "Pagos por confirmar", value: String(s.cards.toConfirm), to: "/admin/pagos" },
    { label: "Clientes registrados", value: String(s.cards.customers), to: "/admin/clientes" },
    { label: "Productos con stock bajo", value: String(s.cards.lowStock), to: "/admin/productos?lowStock=1" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold tracking-tight">Resumen</h1>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <li key={c.label}>
            <Link to={c.to} className="flex h-full flex-col gap-3 rounded-[18px] bg-surface p-5 hover:bg-surface-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">{c.label}</span>
              <span className="tabular text-[26px] font-semibold">{c.value}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Card><SalesChart data={s.salesByDay} /></Card>
        <Card className="flex flex-col gap-4">
          <h2 className="text-[17px] font-semibold">Ventas por categoría (30 días)</h2>
          <CategoryBars data={s.salesByCategory} />
        </Card>
      </div>
      <div className="grid gap-5 2xl:grid-cols-[1fr_2fr]">
        <Card className="min-w-0">
          <h2 className="mb-3 text-[17px] font-semibold">Más vendidos (30 días)</h2>
          {s.topProducts.length ? (
            <ol className="flex flex-col gap-2">
              {s.topProducts.map((p, i) => (
                <li key={p.id} className="flex justify-between gap-2 text-[15px]">
                  <span>{i + 1}. {p.name}</span>
                  <span className="tabular text-muted">{p.units} u.</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted">Aún no hay ventas.</p>
          )}
        </Card>
        <section aria-labelledby="ultimos" className="flex min-w-0 flex-col gap-3">
          <h2 id="ultimos" className="text-[17px] font-semibold">Últimos pedidos</h2>
          <DataTable
            caption="Últimos pedidos"
            rows={s.latestOrders}
            rowKey={(o) => o.number}
            columns={[
              { header: "N.º", cell: (o) => <Link to={`/admin/pedidos/${o.number}`} className="tabular font-medium text-accent underline underline-offset-2">{o.number}</Link> },
              { header: "Cliente", cell: (o) => o.customerName },
              { header: "Fecha", cell: (o) => formatDate(o.createdAt), className: "whitespace-nowrap" },
              { header: "Pago", cell: (o) => PAYMENT_LABEL[o.method] },
              { header: "Total", cell: (o) => formatPEN(o.totalCents), align: "right" },
              { header: "Estado", cell: (o) => <StatusBadge status={o.status} /> },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
