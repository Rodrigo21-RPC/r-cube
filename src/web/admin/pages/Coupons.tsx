import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { COUPON_STATUS_LABEL } from "@shared/coupon";
import { formatPEN } from "@shared/money";
import type { AdminCoupon, Page } from "@shared/admin-types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { Button } from "@web/components/ui/button";
import { Field, Input, Select } from "@web/components/ui/form";
import { Badge, Dialog } from "@web/components/ui/misc";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { Pagination } from "../components/Pagination";

type Errors = Record<string, string>;
const TONE = { active: "success", inactive: "neutral", expired: "warning", exhausted: "warning" } as const;
const today = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);
const plus = (days: number) => new Date(Date.now() - 5 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);
const valueText = (c: Pick<AdminCoupon, "kind" | "value">) => (c.kind === "percent" ? `${c.value} %` : formatPEN(c.value));

interface FormState {
  code: string;
  kind: "percent" | "fixed";
  value: string;
  startsOn: string;
  endsOn: string;
  maxUses: string;
  active: boolean;
}

/** Alta y edición de un cupón: código, tipo y valor, vigencia, usos máximos y estado (HU-50). */
function CouponDialog({ coupon, onClose }: { coupon: AdminCoupon | null; onClose: () => void }) {
  const [f, setF] = useState<FormState>(
    coupon
      ? { code: coupon.code, kind: coupon.kind, value: coupon.kind === "fixed" ? (coupon.value / 100).toFixed(2) : String(coupon.value), startsOn: coupon.startsOn, endsOn: coupon.endsOn, maxUses: String(coupon.maxUses), active: coupon.active }
      : { code: "", kind: "percent", value: "", startsOn: today(), endsOn: plus(30), maxUses: "50", active: true },
  );
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    const value = f.kind === "fixed" ? Math.round(Number(f.value.replace(",", ".")) * 100) : Number(f.value);
    const body = { code: f.code, kind: f.kind, value, startsOn: f.startsOn, endsOn: f.endsOn, maxUses: Number(f.maxUses), active: f.active };
    try {
      await apiFetch(coupon ? `/admin/coupons/${coupon.id}` : "/admin/coupons", { method: coupon ? "PATCH" : "POST", json: body });
      toast.success(coupon ? "Cupón guardado." : "Cupón creado.");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      onClose();
    } catch (x) {
      if (x instanceof ApiError) setErrors(Object.keys(x.fields).length ? x.fields : { form: x.message });
    } finally {
      setBusy(false);
    }
  }

  const locked = Boolean(coupon && coupon.usedCount > 0);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={coupon ? `Editar ${coupon.code}` : "Crear cupón"} description="Los cambios valen para los usos futuros; los pedidos ya hechos conservan su descuento.">
      <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
        <Field label="Código" error={errors.code} hint={locked ? "Ya se usó: el código no se puede cambiar" : "3 a 20 letras, números o guiones"}>
          {(p) => <Input {...p} value={f.code} maxLength={20} readOnly={locked} onChange={(e) => set("code", e.target.value.toUpperCase())} />}
        </Field>
        <Field label="Usos máximos" error={errors.maxUses}>{(p) => <Input {...p} inputMode="numeric" value={f.maxUses} onChange={(e) => set("maxUses", e.target.value.replace(/\D/g, ""))} />}</Field>
        <Field label="Tipo de descuento" error={errors.kind}>
          {(p) => (
            <Select {...p} value={f.kind} onChange={(e) => set("kind", e.target.value as FormState["kind"])}>
              <option value="percent">Porcentaje (1 a 90)</option>
              <option value="fixed">Monto fijo en soles</option>
            </Select>
          )}
        </Field>
        <Field label={f.kind === "percent" ? "Porcentaje (%)" : "Monto (S/)"} error={errors.value}>
          {(p) => <Input {...p} inputMode="decimal" value={f.value} onChange={(e) => set("value", e.target.value)} />}
        </Field>
        <Field label="Válido desde" error={errors.startsOn}>{(p) => <Input {...p} type="date" value={f.startsOn} onChange={(e) => set("startsOn", e.target.value)} />}</Field>
        <Field label="Válido hasta (incluido)" error={errors.endsOn}>{(p) => <Input {...p} type="date" value={f.endsOn} onChange={(e) => set("endsOn", e.target.value)} />}</Field>
        <label className="flex items-center gap-2 text-[15px] sm:col-span-2">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={f.active} onChange={(e) => set("active", e.target.checked)} /> Cupón activo
        </label>
        {errors.form && <p role="alert" className="text-sm text-danger sm:col-span-2">{errors.form}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar cupón"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Cupones del panel: lista con estado y usos, y acciones de edición, activación y baja (HU-50). */
export default function Coupons() {
  useTitle("Panel: cupones");
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? "1") || 1;
  const [editing, setEditing] = useState<AdminCoupon | "new" | null>(null);
  const list = useQuery({
    queryKey: ["admin", "coupons", page],
    queryFn: () => apiFetch<Page<AdminCoupon>>(`/admin/coupons?page=${page}`),
    placeholderData: keepPreviousData,
  });

  async function toggle(c: AdminCoupon) {
    try {
      await apiFetch(`/admin/coupons/${c.id}`, { method: "PATCH", json: { active: !c.active } });
      toast.success(c.active ? "Cupón desactivado." : "Cupón activado.");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (x) {
      toast.error(x instanceof ApiError ? x.message : "No se pudo cambiar el estado.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold tracking-tight">Cupones</h1>
        <Button onClick={() => setEditing("new")}><Plus aria-hidden className="size-4" /> Crear cupón</Button>
      </div>
      {list.isPending ? <LoadingBlock /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => list.refetch()} /> : list.data.items.length === 0 ? (
        <EmptyState title="Aún no hay cupones" description="Crea el primero para ofrecer descuentos." action={<Button onClick={() => setEditing("new")}>Crear cupón</Button>} />
      ) : (
        <>
          <DataTable
            caption="Cupones"
            rows={list.data.items}
            rowKey={(c) => c.id}
            columns={[
              { header: "Código", cell: (c) => <span className="tabular font-semibold">{c.code}</span> },
              { header: "Descuento", cell: (c) => valueText(c), align: "right" },
              { header: "Vigencia", cell: (c) => `${c.startsOn} al ${c.endsOn}`, className: "whitespace-nowrap" },
              { header: "Usos", cell: (c) => `${c.usedCount} de ${c.maxUses}`, align: "right" },
              { header: "Estado", cell: (c) => <Badge tone={TONE[c.status]}>{COUPON_STATUS_LABEL[c.status]}</Badge> },
              {
                header: "Acciones",
                cell: (c) => (
                  <span className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(c)} aria-label={`Editar ${c.code}`}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => toggle(c)} aria-label={`${c.active ? "Desactivar" : "Activar"} ${c.code}`}>{c.active ? "Desactivar" : "Activar"}</Button>
                    {c.usedCount === 0 && (
                      <ConfirmDialog
                        title={`¿Borrar el cupón ${c.code}?`}
                        description="Nunca se usó, así que se puede borrar. Esta acción no se puede deshacer."
                        confirmLabel="Borrar cupón"
                        danger
                        onConfirm={async () => {
                          try {
                            await apiFetch(`/admin/coupons/${c.id}`, { method: "DELETE" });
                            toast.success("Cupón borrado.");
                          } catch (x) {
                            throw x instanceof ApiError ? new Error(x.message, { cause: x }) : x;
                          } finally {
                            await queryClient.invalidateQueries({ queryKey: ["admin"] });
                          }
                        }}
                        trigger={(open) => <Button size="sm" variant="ghost" onClick={open} aria-label={`Borrar ${c.code}`}>Borrar</Button>}
                      />
                    )}
                  </span>
                ),
              },
            ]}
          />
          <Pagination page={page} total={list.data.total} pageSize={list.data.pageSize} onPage={(n) => setParams(n > 1 ? { page: String(n) } : {})} />
        </>
      )}
      {editing && <CouponDialog coupon={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
