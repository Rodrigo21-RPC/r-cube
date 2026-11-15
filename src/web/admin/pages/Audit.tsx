import { useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AUDIT_LABEL, type AuditRow, type Page } from "@shared/admin-types";
import { apiFetch } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { formatDate } from "@web/components/StatusBadge";
import { Select } from "@web/components/ui/form";
import { DataTable } from "../components/DataTable";
import { Pagination } from "../components/Pagination";

/** Registro de auditoría de solo lectura con filtro por tipo de acción (HU-42). */
export default function Audit() {
  useTitle("Panel: auditoría");
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? "1") || 1;
  const list = useQuery({
    queryKey: ["admin", "audit", params.toString()],
    queryFn: () => apiFetch<Page<AuditRow>>(`/admin/audit?${params.toString()}`),
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
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">Auditoría</h1>
        <p className="text-sm text-muted">Cada cambio hecho desde el panel queda registrado y no se puede editar ni borrar.</p>
      </div>
      <div className="max-w-xs">
        <label htmlFor="f-acc" className="sr-only">Tipo de acción</label>
        <Select id="f-acc" value={params.get("action") ?? ""} onChange={(e) => set("action", e.target.value)}>
          <option value="">Todas las acciones</option>
          {Object.entries(AUDIT_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </Select>
      </div>
      {list.isPending ? <LoadingBlock /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => list.refetch()} /> : list.data.items.length === 0 ? (
        <EmptyState title="Aún no hay acciones registradas" />
      ) : (
        <>
          <DataTable
            caption="Registro de auditoría"
            rows={list.data.items}
            rowKey={(r) => r.id}
            columns={[
              { header: "Fecha", cell: (r) => <span className="whitespace-nowrap">{formatDate(r.createdAt)}</span> },
              { header: "Autor", cell: (r) => r.actorName },
              { header: "Acción", cell: (r) => AUDIT_LABEL[r.action] ?? r.action },
              { header: "Objeto", cell: (r) => r.entityLabel },
              { header: "Detalle", cell: (r) => <span className="text-sm">{r.detail}</span> },
            ]}
          />
          <Pagination page={page} total={list.data.total} pageSize={list.data.pageSize} onPage={(n) => set("page", String(n))} />
        </>
      )}
    </div>
  );
}
