import { Link, useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatPEN } from "@shared/money";
import type { CustomerRow, Page } from "@shared/admin-types";
import { apiFetch } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { formatDate } from "@web/components/StatusBadge";
import { Input } from "@web/components/ui/form";
import { Badge } from "@web/components/ui/misc";
import { DataTable } from "../components/DataTable";
import { Pagination } from "../components/Pagination";

/** Lista de clientes con búsqueda por nombre o correo (HU-38). */
export default function Customers() {
  useTitle("Panel: clientes");
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? "1") || 1;
  const list = useQuery({
    queryKey: ["admin", "customers", params.toString()],
    queryFn: () => apiFetch<Page<CustomerRow>>(`/admin/customers?${params.toString()}`),
    placeholderData: keepPreviousData,
  });

  function set(key: string, value: string) {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    if (key !== "page") p.delete("page");
    setParams(p);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-semibold tracking-tight">Clientes</h1>
      <div className="max-w-md">
        <label htmlFor="q-cli" className="sr-only">Buscar por nombre o correo</label>
        <Input id="q-cli" type="search" placeholder="Nombre o correo…" defaultValue={params.get("q") ?? ""} onChange={(e) => set("q", e.target.value)} />
      </div>
      {list.isPending ? <LoadingBlock /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => list.refetch()} /> : list.data.items.length === 0 ? (
        <EmptyState title="No hay clientes con esta búsqueda" />
      ) : (
        <>
          <DataTable
            caption="Clientes"
            rows={list.data.items}
            rowKey={(c) => c.id}
            columns={[
              { header: "Cliente", cell: (c) => <span className="flex flex-col"><Link to={`/admin/clientes/${c.id}`} className="font-medium text-accent underline underline-offset-2">{c.name}</Link><span className="text-sm text-muted">{c.email}</span></span> },
              { header: "Registro", cell: (c) => formatDate(c.createdAt), className: "whitespace-nowrap" },
              { header: "Pedidos", cell: (c) => c.orders, align: "right" },
              { header: "Total gastado", cell: (c) => formatPEN(c.spentCents), align: "right" },
              { header: "Estado", cell: (c) => <Badge tone={c.blocked ? "danger" : "success"}>{c.blocked ? "Bloqueado" : "Activo"}</Badge> },
            ]}
          />
          <Pagination page={page} total={list.data.total} pageSize={list.data.pageSize} onPage={(n) => set("page", String(n))} />
        </>
      )}
    </div>
  );
}
