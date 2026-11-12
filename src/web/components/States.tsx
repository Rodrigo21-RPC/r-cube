import type { ReactNode } from "react";
import { AlertTriangle, PackageOpen } from "lucide-react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/misc";

/** Estado de carga con esqueletos (RNF-02). */
export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-72" />
      ))}
    </div>
  );
}

export function LoadingBlock({ label = "Cargando…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-40" />
      <Skeleton className="h-24" />
    </div>
  );
}

/** Estado vacío con acción (RNF-02). */
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[18px] bg-surface px-6 py-12 text-center">
      <PackageOpen aria-hidden className="size-10 text-muted" />
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="max-w-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}

/** Estado de error con «Reintentar» (RNF-02). */
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-[18px] bg-surface px-6 py-12 text-center">
      <AlertTriangle aria-hidden className="size-10 text-danger" />
      <h2 className="text-lg font-semibold">No pudimos cargar esta información</h2>
      <p className="max-w-sm text-muted">{message ?? "Revisa tu conexión e intenta de nuevo."}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
