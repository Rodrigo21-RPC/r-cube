import { Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import type { Notification } from "@shared/types";
import { apiFetch, queryClient } from "@web/api";
import { cn } from "@web/lib/cn";

const rtf = new Intl.RelativeTimeFormat("es-PE", { numeric: "auto" });

/** Hora relativa en español de Perú («hace 5 minutos», «ayer») (HU-53). */
export function relativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "hace un momento";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86_400), "day");
}

export const markRead = (id: string) => apiFetch(`/notifications/${id}/read`, { method: "POST" });
export const refreshNotifications = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

/** Un aviso: lleva al pedido, queda leído al abrirlo y también se puede marcar sin abrirlo (HU-53, FR-031). */
export function NotificationItem({ n, onOpen }: { n: Notification; onOpen?: () => void }) {
  const read = useMutation({ mutationFn: () => markRead(n.id), onSettled: () => refreshNotifications() });
  return (
    <li className={cn("flex items-start gap-3 border-t border-border p-3 first:border-t-0", !n.read && "bg-accent/5")}>
      <span aria-hidden className={cn("mt-2 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-accent")} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to={`/pedidos/${n.orderNumber}`}
          onClick={() => {
            if (!n.read) read.mutate();
            onOpen?.();
          }}
          className={cn("text-[15px] hover:underline", !n.read && "font-semibold")}
        >
          {n.message}
        </Link>
        <span className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
          <time dateTime={n.createdAt}>{relativeTime(n.createdAt)}</time>
          <span>{n.read ? "Leído" : "Sin leer"}</span>
          {!n.read && (
            <button type="button" onClick={() => read.mutate()} className="text-accent underline underline-offset-2" aria-label={`Marcar como leído: ${n.message}`}>
              Marcar como leído
            </button>
          )}
        </span>
      </div>
    </li>
  );
}
