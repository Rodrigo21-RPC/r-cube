import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AdminProduct, Page, StockMovementDto } from "@shared/admin-types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { formatDate } from "@web/components/StatusBadge";
import { ErrorState, LoadingBlock } from "@web/components/States";
import { Button } from "@web/components/ui/button";
import { Field, Input, Select } from "@web/components/ui/form";
import { Card } from "@web/components/ui/misc";
import { DataTable } from "../components/DataTable";
import { Pagination } from "../components/Pagination";

const SOURCE: Record<StockMovementDto["source"], string> = {
  inicial: "Stock inicial",
  ajuste: "Ajuste",
  venta: "Venta",
  cancelacion: "Cancelación",
};

/** Ajuste de stock con motivo e historial (HU-33). */
export function ProductStock({ product, variantId, onVariantChange }: { product: AdminProduct; variantId: string; onVariantChange: (id: string) => void }) {
  const hasVariants = product.variants.length > 0;
  const [page, setPage] = useState(1);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const h = useQuery({
    queryKey: ["admin", "stock", product.id, page],
    queryFn: () => apiFetch<Page<StockMovementDto>>(`/admin/products/${product.id}/stock-movements?page=${page}`),
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      await apiFetch(`/admin/products/${product.id}/stock-adjustments`, {
        method: "POST",
        json: { delta: Number(delta), reason, ...(hasVariants ? { variantId: variantId || undefined } : {}) },
      });
      setDelta("");
      setReason("");
      toast.success("Stock actualizado.");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (x) {
      if (x instanceof ApiError) setErrors(Object.keys(x.fields).length ? x.fields : { form: x.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-[17px] font-semibold">Stock: <span className="tabular">{product.stock}</span> unidades</h2>
      <form onSubmit={submit} className={`grid gap-3 md:items-end ${hasVariants ? "md:grid-cols-[1fr_160px_1fr_auto]" : "md:grid-cols-[160px_1fr_auto]"}`} noValidate>
        {hasVariants && (
          <Field label="Variante" error={errors.variantId}>
            {(p) => (
              <Select {...p} value={variantId} onChange={(e) => onVariantChange(e.target.value)}>
                <option value="">Elige una variante…</option>
                {product.variants.map((v) => <option key={v.id} value={v.id}>{v.label} ({v.sku}), {v.stock} u.</option>)}
              </Select>
            )}
          </Field>
        )}
        <Field label="Cantidad (+ entra, − sale)" error={errors.delta}>{(p) => <Input {...p} inputMode="numeric" value={delta} onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ""))} />}</Field>
        <Field label="Motivo" error={errors.reason}>{(p) => <Input {...p} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />}</Field>
        <Button type="submit" disabled={busy}>Registrar ajuste</Button>
        {errors.form && <p role="alert" className="text-sm text-danger md:col-span-4">{errors.form}</p>}
      </form>
      <h3 className="font-semibold">Historial</h3>
      {h.isPending ? <LoadingBlock /> : h.isError ? <ErrorState onRetry={() => h.refetch()} /> : (
        <>
          <DataTable
            caption="Historial de stock"
            rows={h.data.items}
            rowKey={(m) => m.id}
            columns={[
              { header: "Fecha", cell: (m) => formatDate(m.createdAt), className: "whitespace-nowrap" },
              { header: "Origen", cell: (m) => `${SOURCE[m.source]}${m.orderNumber ? ` ${m.orderNumber}` : ""}` },
              { header: "Variante", cell: (m) => m.variantLabel ?? "" },
              { header: "Cantidad", cell: (m) => <span className={m.delta > 0 ? "text-success" : "text-danger"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>, align: "right" },
              { header: "Antes → después", cell: (m) => `${m.stockBefore} → ${m.stockAfter}`, align: "right" },
              { header: "Motivo", cell: (m) => m.reason ?? "" },
              { header: "Quién", cell: (m) => m.actor },
            ]}
          />
          <Pagination page={page} total={h.data.total} pageSize={h.data.pageSize} onPage={setPage} />
        </>
      )}
    </Card>
  );
}
