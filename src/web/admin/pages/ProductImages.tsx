import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Star, Trash2, Upload } from "lucide-react";
import type { AdminProduct } from "@shared/admin-types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/form";
import { Badge, Card } from "@web/components/ui/misc";
import { ConfirmDialog } from "../components/ConfirmDialog";

const MAX = 8;
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Galería del producto: subir, ordenar con botones, principal, texto alternativo y borrar (HU-31). */
export function ProductImages({ product }: { product: AdminProduct }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [alts, setAlts] = useState<Record<string, string>>({});
  const base = `/admin/products/${product.id}/images`;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "product", product.id] });

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo completar la acción.");
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // Validación previa en el navegador; el servidor vuelve a validar el contenido real.
    if (!TYPES.includes(file.type)) return void toast.error("Solo se aceptan fotos JPG, PNG o WebP.");
    if (file.size > MAX_BYTES) return void toast.error("La foto pesa más de 2 MB.");
    const form = new FormData();
    form.append("file", file);
    void run(() => apiFetch(base, { method: "POST", body: form }), "Foto subida.");
  }

  const images = product.images;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[17px] font-semibold">Fotos ({images.length} de {MAX})</h2>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="subir-foto" aria-label="Elegir una foto para subir" tabIndex={-1} onChange={onFile} />
        <Button type="button" variant="secondary" disabled={busy || images.length >= MAX} onClick={() => input.current?.click()}>
          <Upload aria-hidden className="size-4" /> Subir foto
        </Button>
      </div>
      <p className="text-sm text-muted">JPG, PNG o WebP de hasta 2 MB. La primera es la foto principal en la tienda.</p>
      {images.length === 0 ? (
        <p className="rounded-2xl bg-canvas p-4 text-muted">Sin fotos: la tienda muestra la imagen genérica.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {images.map((img, i) => (
            <li key={img.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-canvas p-3">
              <img src={img.url} alt="" width={72} height={72} className="size-18 rounded-xl bg-surface object-contain" />
              <div className="flex min-w-48 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  Foto {i + 1} {i === 0 && <Badge tone="accent">Principal</Badge>} {!img.uploaded && <Badge>Demostración</Badge>}
                </span>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(() => apiFetch(`${base}/${img.id}`, { method: "PATCH", json: { alt: alts[img.id] ?? img.alt } }), "Texto alternativo guardado.");
                  }}
                >
                  <label htmlFor={`alt-${img.id}`} className="sr-only">Texto alternativo de la foto {i + 1}</label>
                  <Input id={`alt-${img.id}`} className="h-10" value={alts[img.id] ?? img.alt} onChange={(e) => setAlts({ ...alts, [img.id]: e.target.value })} />
                  <Button type="submit" size="sm" variant="secondary" disabled={busy}>Guardar</Button>
                </form>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label={`Subir foto ${i + 1}`} disabled={busy || i === 0} onClick={() => run(() => apiFetch(`${base}/${img.id}/move`, { method: "POST", json: { direction: "up" } }))}><ArrowUp aria-hidden className="size-5" /></Button>
                <Button variant="ghost" size="icon" aria-label={`Bajar foto ${i + 1}`} disabled={busy || i === images.length - 1} onClick={() => run(() => apiFetch(`${base}/${img.id}/move`, { method: "POST", json: { direction: "down" } }))}><ArrowDown aria-hidden className="size-5" /></Button>
                <Button variant="ghost" size="icon" aria-label={`Hacer principal la foto ${i + 1}`} disabled={busy || i === 0} onClick={() => run(() => apiFetch(`${base}/${img.id}/main`, { method: "POST", json: {} }), "Foto principal actualizada.")}><Star aria-hidden className="size-5" /></Button>
                <ConfirmDialog
                  title={`¿Borrar la foto ${i + 1}?`}
                  description={img.uploaded ? "Se elimina del producto y del almacenamiento." : "Se quita del producto; el archivo de demostración no se modifica."}
                  confirmLabel="Borrar foto"
                  danger
                  onConfirm={async () => {
                    await apiFetch(`${base}/${img.id}`, { method: "DELETE" });
                    await refresh();
                    toast.success("Foto eliminada.");
                  }}
                  trigger={(open) => <Button variant="ghost" size="icon" aria-label={`Borrar foto ${i + 1}`} disabled={busy} onClick={open}><Trash2 aria-hidden className="size-5" /></Button>}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
