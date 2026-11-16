import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { formatPEN } from "@shared/money";
import type { AdminProduct, AdminVariant } from "@shared/admin-types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { Button } from "@web/components/ui/button";
import { Field, Input, Select } from "@web/components/ui/form";
import { Badge, Card, Dialog } from "@web/components/ui/misc";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";

type Errors = Record<string, string>;
const toCents = (s: string) => Math.round(Number(s.replace(",", ".")) * 100);

interface FormState {
  sku: string;
  storage: string;
  color: string;
  ram: string;
  price: string;
  stock: string;
  imageId: string;
  active: boolean;
}

const empty: FormState = { sku: "", storage: "", color: "", ram: "", price: "", stock: "0", imageId: "", active: true };
const fromVariant = (v: AdminVariant): FormState => ({
  sku: v.sku, storage: v.storage, color: v.color, ram: v.ram, price: (v.priceCents / 100).toFixed(2), stock: String(v.stock),
  imageId: v.imageId ?? "", active: v.active,
});

/** Alta y edición de una variante: SKU, atributos, precio, stock inicial, foto y estado (HU-43). */
function VariantDialog({ product, variant, onClose }: { product: AdminProduct; variant: AdminVariant | null; onClose: () => void }) {
  const [f, setF] = useState<FormState>(variant ? fromVariant(variant) : empty);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    const body = {
      sku: f.sku, storage: f.storage, color: f.color, ram: f.ram, priceCents: toCents(f.price), imageId: f.imageId || null, active: f.active,
      ...(variant ? {} : { stock: Number(f.stock || 0) }),
    };
    try {
      await apiFetch(variant ? `/admin/variants/${variant.id}` : `/admin/products/${product.id}/variants`, { method: variant ? "PATCH" : "POST", json: body });
      toast.success(variant ? "Variante guardada." : "Variante creada.");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      onClose();
    } catch (x) {
      if (x instanceof ApiError) {
        const fields = { ...x.fields };
        if (fields.priceCents) fields.price = fields.priceCents;
        setErrors(Object.keys(fields).length ? fields : { form: x.message });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={variant ? "Editar variante" : "Agregar variante"} description="Elige al menos almacenamiento, color o RAM.">
      <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
        <Field label="SKU" error={errors.sku}>{(p) => <Input {...p} value={f.sku} maxLength={40} onChange={(e) => set("sku", e.target.value.toUpperCase())} />}</Field>
        <Field label="Precio (S/, con IGV)" error={errors.price}>{(p) => <Input {...p} inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} />}</Field>
        <Field label="Almacenamiento" error={errors.storage} hint="Ej. 256 GB">{(p) => <Input {...p} value={f.storage} maxLength={40} onChange={(e) => set("storage", e.target.value)} />}</Field>
        <Field label="Color" error={errors.color} hint="Ej. Azul">{(p) => <Input {...p} value={f.color} maxLength={40} onChange={(e) => set("color", e.target.value)} />}</Field>
        <Field label="RAM" error={errors.ram} hint="Ej. 8 GB">{(p) => <Input {...p} value={f.ram} maxLength={40} onChange={(e) => set("ram", e.target.value)} />}</Field>
        {!variant && (
          <Field label="Stock inicial" error={errors.stock}>{(p) => <Input {...p} inputMode="numeric" value={f.stock} onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} />}</Field>
        )}
        <div className="sm:col-span-2">
          <Field label="Foto de la variante" error={errors.imageId}>
            {(p) => (
              <Select {...p} value={f.imageId} onChange={(e) => set("imageId", e.target.value)}>
                <option value="">Foto principal del producto</option>
                {product.images.map((img, i) => <option key={img.id} value={img.id}>Foto {i + 1}: {img.alt}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[15px] sm:col-span-2">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={f.active} onChange={(e) => set("active", e.target.checked)} /> Variante activa (se vende)
        </label>
        {errors.form && <p role="alert" className="text-sm text-danger sm:col-span-2">{errors.form}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar variante"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Variantes del producto con su rango de precios, stock y acciones (HU-43). */
export function ProductVariants({ product, onAdjust }: { product: AdminProduct; onAdjust: (variantId: string) => void }) {
  const [editing, setEditing] = useState<AdminVariant | "new" | null>(null);

  async function toggle(v: AdminVariant) {
    try {
      await apiFetch(`/admin/variants/${v.id}`, {
        method: "PATCH",
        json: { sku: v.sku, storage: v.storage, color: v.color, ram: v.ram, priceCents: v.priceCents, imageId: v.imageId, active: !v.active },
      });
      toast.success(v.active ? "Variante desactivada." : "Variante activada.");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (x) {
      toast.error(x instanceof ApiError ? x.message : "No se pudo cambiar el estado.");
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[17px] font-semibold">Variantes</h2>
          <p className="text-sm text-muted">
            {product.variants.length === 0
              ? "Sin variantes: el producto usa su propio precio y stock."
              : "El precio «desde» y el stock del producto salen de sus variantes activas."}
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}><Plus aria-hidden className="size-4" /> Agregar variante</Button>
      </div>
      {product.variants.length > 0 && (
        <DataTable
          caption={`Variantes de ${product.name}`}
          rows={product.variants}
          rowKey={(v) => v.id}
          columns={[
            { header: "SKU", cell: (v) => <span className="tabular font-medium">{v.sku}</span> },
            { header: "Variante", cell: (v) => v.label },
            { header: "Precio", cell: (v) => formatPEN(v.priceCents), align: "right" },
            { header: "Stock", cell: (v) => <span className={v.active && v.stock <= 5 ? "font-semibold text-warning" : ""}>{v.stock}</span>, align: "right" },
            { header: "Estado", cell: (v) => <Badge tone={v.active ? "success" : "neutral"}>{v.active ? "Activa" : "Inactiva"}</Badge> },
            {
              header: "Acciones",
              cell: (v) => (
                <span className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(v)} aria-label={`Editar ${v.sku}`}>Editar</Button>
                  <Button size="sm" variant="secondary" onClick={() => onAdjust(v.id)} aria-label={`Ajustar stock de ${v.sku}`}>Ajustar stock</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle(v)} aria-label={`${v.active ? "Desactivar" : "Activar"} ${v.sku}`}>{v.active ? "Desactivar" : "Activar"}</Button>
                  {v.sold ? null : (
                    <ConfirmDialog
                      title={`¿Borrar la variante ${v.sku}?`}
                      description="Nunca se vendió, así que se puede borrar. Su historial de stock también se borra."
                      confirmLabel="Borrar variante"
                      danger
                      onConfirm={async () => {
                        try {
                          await apiFetch(`/admin/variants/${v.id}`, { method: "DELETE" });
                          toast.success("Variante borrada.");
                        } catch (x) {
                          throw x instanceof ApiError ? new Error(x.message, { cause: x }) : x;
                        } finally {
                          await queryClient.invalidateQueries({ queryKey: ["admin"] });
                        }
                      }}
                      trigger={(open) => <Button size="sm" variant="ghost" onClick={open} aria-label={`Borrar ${v.sku}`}>Borrar</Button>}
                    />
                  )}
                </span>
              ),
            },
          ]}
        />
      )}
      {editing && <VariantDialog product={product} variant={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}
