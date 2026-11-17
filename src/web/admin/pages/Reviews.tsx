import { useState } from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AdminReview, Page } from "@shared/admin-types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { formatDate } from "@web/components/StatusBadge";
import { StarRating } from "@web/components/StarRating";
import { Button } from "@web/components/ui/button";
import { Input, Select } from "@web/components/ui/form";
import { Badge } from "@web/components/ui/misc";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { Pagination } from "../components/Pagination";

/** Moderación de reseñas: ocultar y mostrar con confirmación (HU-47). */
export default function Reviews() {
  useTitle("Panel: reseñas");
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? "1") || 1;
  const [busy, setBusy] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["admin", "reviews", params.toString()],
    queryFn: () => apiFetch<Page<AdminReview>>(`/admin/reviews?${params.toString()}`),
    placeholderData: keepPreviousData,
  });

  function set(key: string, value: string) {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    if (key !== "page") p.delete("page");
    setParams(p);
  }

  async function change(r: AdminReview, hide: boolean) {
    setBusy(r.id);
    try {
      await apiFetch(`/admin/reviews/${r.id}/${hide ? "hide" : "show"}`, { method: "POST", json: {} });
      toast.success(hide ? "Reseña ocultada: ya no se ve en la tienda." : "Reseña visible de nuevo.");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (x) {
      toast.error(x instanceof ApiError ? x.message : "No se pudo cambiar la reseña.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-semibold tracking-tight">Reseñas</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <label htmlFor="q-res" className="sr-only">Buscar por producto</label>
          <Input id="q-res" type="search" placeholder="Producto…" defaultValue={params.get("q") ?? ""} onChange={(e) => set("q", e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-res-estado" className="sr-only">Estado</label>
          <Select id="f-res-estado" value={params.get("status") ?? ""} onChange={(e) => set("status", e.target.value)}>
            <option value="">Visibles y ocultas</option>
            <option value="visible">Solo visibles</option>
            <option value="hidden">Solo ocultas</option>
          </Select>
        </div>
      </div>
      {list.isPending ? <LoadingBlock /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => list.refetch()} /> : list.data.items.length === 0 ? (
        <EmptyState title="No hay reseñas con estos filtros" />
      ) : (
        <>
          <DataTable
            caption="Reseñas"
            rows={list.data.items}
            rowKey={(r) => r.id}
            columns={[
              { header: "Producto", cell: (r) => <span className="font-medium">{r.productName}</span> },
              { header: "Cliente", cell: (r) => <span className="flex flex-col"><span>{r.authorName}</span><span className="text-sm text-muted">{r.authorEmail}</span></span> },
              { header: "Estrellas", cell: (r) => <StarRating value={r.rating} /> },
              { header: "Comentario", cell: (r) => <span className="text-sm">{r.comment ?? "Sin comentario"}</span>, className: "max-w-xs" },
              { header: "Fecha", cell: (r) => formatDate(r.createdAt), className: "whitespace-nowrap" },
              { header: "Estado", cell: (r) => <Badge tone={r.hidden ? "warning" : "success"}>{r.hidden ? "Oculta" : "Visible"}</Badge> },
              {
                header: "Acción",
                cell: (r) =>
                  r.hidden ? (
                    <Button size="sm" variant="secondary" disabled={busy === r.id} onClick={() => change(r, false)} aria-label={`Mostrar la reseña de ${r.authorName} sobre ${r.productName}`}>Mostrar</Button>
                  ) : (
                    <ConfirmDialog
                      title="¿Ocultar esta reseña?"
                      description="Dejará de verse en la tienda y de contar en el promedio. Podrás mostrarla de nuevo."
                      confirmLabel="Ocultar reseña"
                      danger
                      onConfirm={() => change(r, true)}
                      trigger={(open) => <Button size="sm" variant="secondary" onClick={open} aria-label={`Ocultar la reseña de ${r.authorName} sobre ${r.productName}`}>Ocultar</Button>}
                    />
                  ),
              },
            ]}
          />
          <Pagination page={page} total={list.data.total} pageSize={list.data.pageSize} onPage={(n) => set("page", String(n))} />
        </>
      )}
    </div>
  );
}
