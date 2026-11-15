import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TaxonomyItem } from "@shared/admin-types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { useTitle } from "@web/hooks/useTitle";
import { ErrorState, LoadingBlock } from "@web/components/States";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/form";
import { Badge, Card } from "@web/components/ui/misc";

function Section({ kind }: { kind: "categories" | "brands" }) {
  const title = kind === "categories" ? "Categorías" : "Marcas";
  const singular = kind === "categories" ? "categoría" : "marca";
  const q = useQuery({ queryKey: ["admin", kind], queryFn: () => apiFetch<TaxonomyItem[]>(`/admin/${kind}`) });
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin"] });

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch(`/admin/${kind}`, { method: "POST", json: { name } });
      setName("");
      toast.success(`${title.slice(0, -1)} creada.`);
      await refresh();
    } catch (x) {
      setError(x instanceof ApiError ? (x.fields.name ?? x.message) : "No se pudo crear.");
    }
  }

  async function patch(item: TaxonomyItem, body: Record<string, unknown>) {
    try {
      await apiFetch(`/admin/${kind}/${item.id}`, { method: "PATCH", json: body });
      await refresh();
      setEditing(null);
      toast.success("Cambios guardados.");
    } catch (x) {
      if (x instanceof ApiError && x.code === "HAS_ACTIVE_PRODUCTS") {
        // HU-32: aviso con el número de productos y confirmación explícita.
        if (window.confirm(`${x.message}\n\n¿Desactivar «${item.name}» de todos modos?`)) await patch(item, { ...body, confirm: true });
        return;
      }
      toast.error(x instanceof ApiError ? x.message : "No se pudo guardar.");
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      <form onSubmit={create} className="flex flex-wrap items-start gap-2" noValidate>
        <div className="min-w-48 flex-1">
          <label htmlFor={`nuevo-${kind}`} className="sr-only">Nombre de la nueva {singular}</label>
          <Input id={`nuevo-${kind}`} placeholder={`Nueva ${singular}`} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `err-${kind}` : undefined} />
          {error && <p id={`err-${kind}`} role="alert" className="mt-1 text-sm text-danger">{error}</p>}
        </div>
        <Button type="submit">Crear</Button>
      </form>
      {q.isPending ? <LoadingBlock /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <ul className="flex flex-col divide-y divide-border">
          {q.data.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
              {editing?.id === item.id ? (
                <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); void patch(item, { name: editing.name }); }}>
                  <label htmlFor={`ren-${item.id}`} className="sr-only">Nuevo nombre</label>
                  <Input id={`ren-${item.id}`} value={editing.name} onChange={(e) => setEditing({ id: item.id, name: e.target.value })} autoFocus />
                  <Button type="submit" size="sm">Guardar</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
                </form>
              ) : (
                <>
                  <span className="flex-1 font-medium">{item.name}</span>
                  <span className="text-sm text-muted">{item.activeProducts} producto(s) activos</span>
                  <Badge tone={item.active ? "success" : "neutral"}>{item.active ? "Activa" : "Inactiva"}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ id: item.id, name: item.name })}>Renombrar</Button>
                  <Button variant="secondary" size="sm" onClick={() => patch(item, { active: !item.active })}>{item.active ? "Desactivar" : "Activar"}</Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Categorías y marcas (HU-32). */
export default function Taxonomy() {
  useTitle("Panel: categorías y marcas");
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-semibold tracking-tight">Categorías y marcas</h1>
      <div className="grid gap-5 xl:grid-cols-2">
        <Section kind="categories" />
        <Section kind="brands" />
      </div>
    </div>
  );
}
