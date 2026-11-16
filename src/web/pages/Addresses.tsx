import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import type { Address } from "@shared/types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { useSession } from "@web/auth";
import { useTitle } from "@web/hooks/useTitle";
import { ConfirmDialog } from "@web/admin/components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { Button } from "@web/components/ui/button";
import { Field, Input } from "@web/components/ui/form";
import { Badge, Card, Dialog } from "@web/components/ui/misc";

type Errors = Record<string, string>;
type FormState = { label: string; recipientName: string; phone: string; line: string; district: string; reference: string };
const empty = (name: string, phone: string): FormState => ({ label: "", recipientName: name, phone, line: "", district: "", reference: "" });

/** Se refresca la lista, el checkout y el perfil: los tres leen las mismas direcciones (FR-019). */
const refresh = () =>
  Promise.all(["addresses", "checkout-options", "me"].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));

function AddressDialog({ address, defaults, onClose }: { address: Address | null; defaults: { name: string; phone: string }; onClose: () => void }) {
  const [f, setF] = useState<FormState>(address ? { ...address } : empty(defaults.name, defaults.phone));
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof FormState, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      const { label, recipientName, phone, line, district, reference } = f;
      await apiFetch(address ? `/account/addresses/${address.id}` : "/account/addresses", {
        method: address ? "PATCH" : "POST",
        json: { label, recipientName, phone, line, district, reference },
      });
      toast.success(address ? "Dirección guardada." : "Dirección agregada.");
      await refresh();
      onClose();
    } catch (x) {
      if (x instanceof ApiError) setErrors(Object.keys(x.fields).length ? x.fields : { form: x.message });
    } finally {
      setBusy(false);
    }
  }

  const rows: [keyof FormState, string, string?, string?][] = [
    ["label", "Nombre de la dirección", "Ej. Casa o Trabajo"],
    ["recipientName", "Nombre de quien recibe", undefined, "name"],
    ["phone", "Celular", "9 dígitos, empieza con 9", "tel-national"],
    ["line", "Dirección", undefined, "street-address"],
    ["district", "Distrito", undefined, "address-level2"],
    ["reference", "Referencia (opcional)"],
  ];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={address ? "Editar dirección" : "Agregar dirección"}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        {rows.map(([k, label, hint, ac]) => (
          <Field key={k} label={label} hint={hint} error={errors[k]}>
            {(p) => <Input {...p} autoComplete={ac} value={f[k]} onChange={(e) => set(k, e.target.value)} />}
          </Field>
        ))}
        {errors.form && <p role="alert" className="text-sm text-danger">{errors.form}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar dirección"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Direcciones guardadas: crear, editar, borrar y marcar la predeterminada (HU-48). */
export default function Addresses() {
  useTitle("Mis direcciones");
  const { data: me, isPending } = useSession();
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const q = useQuery({ queryKey: ["addresses"], queryFn: () => apiFetch<Address[]>("/account/addresses"), enabled: Boolean(me) });

  if (isPending) return <LoadingBlock />;
  if (!me)
    return (
      <EmptyState
        title="Inicia sesión para ver tus direcciones"
        action={<Button asChild><Link to="/ingresar?volver=/cuenta/direcciones">Ingresar</Link></Button>}
      />
    );
  if (q.isPending) return <LoadingBlock label="Cargando tus direcciones…" />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;

  async function makeDefault(a: Address) {
    try {
      await apiFetch(`/account/addresses/${a.id}/default`, { method: "POST", json: {} });
      toast.success(`«${a.label}» es tu dirección predeterminada.`);
      await refresh();
    } catch (x) {
      toast.error(x instanceof ApiError ? x.message : "No se pudo cambiar la predeterminada.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Link to="/cuenta" className="inline-flex w-fit items-center gap-1 text-sm text-accent hover:underline"><ArrowLeft aria-hidden className="size-4" /> Mi cuenta</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold tracking-tight">Mis direcciones</h1>
        <Button onClick={() => setEditing("new")}><Plus aria-hidden className="size-4" /> Agregar dirección</Button>
      </div>
      {q.data.length === 0 ? (
        <EmptyState
          title="Aún no tienes direcciones guardadas"
          description="Guarda una para elegirla en un toque cuando compres con delivery."
          action={<Button onClick={() => setEditing("new")}>Agregar dirección</Button>}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {q.data.map((a) => (
            <li key={a.id}>
              <Card className="flex h-full flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[17px] font-semibold">{a.label}</h2>
                  {a.isDefault && <Badge tone="accent">Predeterminada</Badge>}
                </div>
                <p>{a.recipientName} · <span className="tabular">{a.phone}</span></p>
                <p className="text-muted">{a.line}, {a.district}{a.reference ? ` (${a.reference})` : ""}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(a)} aria-label={`Editar la dirección ${a.label}`}>Editar</Button>
                  {!a.isDefault && <Button size="sm" variant="secondary" onClick={() => makeDefault(a)} aria-label={`Marcar ${a.label} como predeterminada`}>Marcar como predeterminada</Button>}
                  <ConfirmDialog
                    title={`¿Borrar la dirección «${a.label}»?`}
                    description="Tus pedidos anteriores conservan la dirección con la que se hicieron."
                    confirmLabel="Borrar dirección"
                    danger
                    onConfirm={async () => {
                      try {
                        await apiFetch(`/account/addresses/${a.id}`, { method: "DELETE" });
                        toast.success("Dirección borrada.");
                      } catch (x) {
                        throw x instanceof ApiError ? new Error(x.message, { cause: x }) : x;
                      } finally {
                        await refresh();
                      }
                    }}
                    trigger={(open) => <Button size="sm" variant="ghost" onClick={open} aria-label={`Borrar la dirección ${a.label}`}>Borrar</Button>}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {editing && <AddressDialog address={editing === "new" ? null : editing} defaults={{ name: me.name, phone: me.phone }} onClose={() => setEditing(null)} />}
    </div>
  );
}
