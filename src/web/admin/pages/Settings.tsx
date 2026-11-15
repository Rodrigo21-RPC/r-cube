import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatPEN } from "@shared/money";
import { PAYMENT_LABEL, type PaymentMethodCode } from "@shared/types";
import type { AdminSettings, AdminZone } from "@shared/admin-types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { ErrorState, LoadingBlock } from "@web/components/States";
import { Button } from "@web/components/ui/button";
import { Field, Input } from "@web/components/ui/form";
import { Badge, Card } from "@web/components/ui/misc";

type Errors = Record<string, string>;
const FIELDS: [keyof AdminSettings, string, string?][] = [
  ["whatsappNumber", "WhatsApp de la tienda", "51 seguido de 9 dígitos"],
  ["yapeNumber", "Número de Yape"],
  ["plinNumber", "Número de Plin"],
  ["bankName", "Banco"],
  ["bankHolder", "Titular de la cuenta"],
  ["bankAccount", "Número de cuenta"],
  ["bankCci", "CCI", "20 dígitos"],
];

function SettingsForm({ initial }: { initial: AdminSettings }) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      const body: Partial<AdminSettings> = { ...v };
      delete body.zones;
      await apiFetch("/admin/settings", { method: "PATCH", json: body });
      toast.success("Configuración guardada. El checkout ya usa los datos nuevos.");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (x) {
      if (x instanceof ApiError) setErrors(x.fields);
    } finally {
      setBusy(false);
    }
  }
  const toggle = (m: PaymentMethodCode) =>
    setV({ ...v, enabledMethods: v.enabledMethods.includes(m) ? v.enabledMethods.filter((x) => x !== m) : [...v.enabledMethods, m] });

  return (
    <Card>
      <form onSubmit={save} noValidate className="grid gap-4 md:grid-cols-2">
        <h2 className="text-[17px] font-semibold md:col-span-2">Contacto y datos de pago</h2>
        {FIELDS.map(([key, label, hint]) => (
          <Field key={key} label={label} hint={hint} error={errors[key]}>
            {(p) => <Input {...p} value={String(v[key])} onChange={(e) => setV({ ...v, [key]: e.target.value })} />}
          </Field>
        ))}
        <fieldset className="md:col-span-2">
          <legend className="mb-2 font-medium">Métodos de pago activos</legend>
          <div className="flex flex-wrap gap-4">
            {(Object.keys(PAYMENT_LABEL) as PaymentMethodCode[]).map((m) => (
              <label key={m} className="flex items-center gap-2 text-[15px]">
                <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={v.enabledMethods.includes(m)} onChange={() => toggle(m)} />
                {PAYMENT_LABEL[m]}
              </label>
            ))}
          </div>
          {errors.enabledMethods && <p role="alert" className="mt-1 text-sm text-danger">{errors.enabledMethods}</p>}
        </fieldset>
        <div className="md:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar configuración"}</Button></div>
      </form>
    </Card>
  );
}

function ZoneRow({ zone }: { zone: AdminZone }) {
  const [name, setName] = useState(zone.name);
  const [cost, setCost] = useState((zone.costCents / 100).toFixed(2));
  async function save(body: Record<string, unknown>) {
    try {
      await apiFetch(`/admin/zones/${zone.id}`, { method: "PATCH", json: body });
      toast.success("Zona actualizada.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (x) {
      toast.error(x instanceof ApiError ? (Object.values(x.fields)[0] ?? x.message) : "No se pudo guardar.");
    }
  }
  return (
    <li className="flex flex-wrap items-end gap-2 border-t border-border py-3">
      <div className="min-w-48 flex-1">
        <label htmlFor={`zn-${zone.id}`} className="text-xs text-muted">Nombre</label>
        <Input id={`zn-${zone.id}`} className="h-10" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="w-32">
        <label htmlFor={`zc-${zone.id}`} className="text-xs text-muted">Costo (S/)</label>
        <Input id={`zc-${zone.id}`} className="h-10" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
      </div>
      <Button size="sm" variant="secondary" onClick={() => save({ name, costCents: Math.round(Number(cost.replace(",", ".")) * 100) })}>Guardar</Button>
      <Badge tone={zone.active ? "success" : "neutral"}>{zone.active ? "Activa" : "Inactiva"}</Badge>
      <Button size="sm" variant="ghost" onClick={() => save({ active: !zone.active })}>{zone.active ? "Desactivar" : "Activar"}</Button>
    </li>
  );
}

function Zones({ zones }: { zones: AdminZone[] }) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch("/admin/zones", { method: "POST", json: { name, costCents: Math.round(Number(cost.replace(",", ".")) * 100) } });
      setName("");
      setCost("");
      toast.success("Zona creada.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (x) {
      setError(x instanceof ApiError ? (Object.values(x.fields)[0] ?? x.message) : "No se pudo crear.");
    }
  }
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-[17px] font-semibold">Zonas de delivery</h2>
      <p className="text-sm text-muted">El checkout muestra solo las zonas activas. Los pedidos ya hechos conservan su costo.</p>
      <ul>{zones.map((z) => <ZoneRow key={`${z.id}-${z.costCents}-${z.name}`} zone={z} />)}</ul>
      <form onSubmit={create} className="flex flex-wrap items-end gap-2 border-t border-border pt-3" noValidate>
        <div className="min-w-48 flex-1"><label htmlFor="zn-nueva" className="text-xs text-muted">Nueva zona</label><Input id="zn-nueva" className="h-10" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="w-32"><label htmlFor="zc-nueva" className="text-xs text-muted">Costo (S/)</label><Input id="zc-nueva" className="h-10" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
        <Button type="submit" size="sm">Agregar zona</Button>
        {error && <p role="alert" className="w-full text-sm text-danger">{error}</p>}
      </form>
      <p className="text-sm text-muted">Ejemplo: costo {formatPEN(1500)} se escribe 15.00.</p>
    </Card>
  );
}

/** Configuración de la tienda (HU-41). */
export default function Settings() {
  useTitle("Panel: configuración");
  const q = useQuery({ queryKey: ["admin", "settings"], queryFn: () => apiFetch<AdminSettings>("/admin/settings") });
  if (q.isPending) return <LoadingBlock />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-semibold tracking-tight">Configuración de la tienda</h1>
      <SettingsForm key={JSON.stringify({ ...q.data, zones: [] })} initial={q.data} />
      <Zones zones={q.data.zones} />
    </div>
  );
}
