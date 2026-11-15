import { useState, type ReactNode } from "react";
import { Button } from "@web/components/ui/button";
import { Field, Input } from "@web/components/ui/form";
import { Dialog } from "@web/components/ui/misc";

/**
 * Confirmación con motivo opcional u obligatorio (cancelar, rechazar, bloquear, borrar).
 * `onConfirm` recibe el motivo; si lanza un error, el diálogo lo muestra y queda abierto.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  danger = false,
  reasonLabel,
  onConfirm,
}: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  reasonLabel?: string;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setError(null);
    if (reasonLabel && reason.trim().length < 3) return setError("Escribe el motivo (mínimo 3 caracteres).");
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      setOpen(false);
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la acción.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {trigger(() => setOpen(true))}
      <Dialog open={open} onOpenChange={setOpen} title={title} description={description}>
        {reasonLabel && <Field label={reasonLabel}>{(p) => <Input {...p} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />}</Field>}
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Volver</Button>
          <Button variant={danger ? "danger" : "primary"} disabled={busy} onClick={confirm}>{busy ? "Procesando…" : confirmLabel}</Button>
        </div>
      </Dialog>
    </>
  );
}
