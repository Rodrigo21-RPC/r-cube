import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Popover } from "radix-ui";
import { Bell } from "lucide-react";
import type { NotificationsSummary } from "@shared/types";
import { apiFetch } from "@web/api";
import { useSession } from "@web/auth";
import { NotificationItem, refreshNotifications } from "@web/components/NotificationItem";
import { Button } from "@web/components/ui/button";

/**
 * Campana de avisos del cliente (HU-53): contador de sin leer, los últimos 20 y «Ver todos». Consulta el servidor
 * al enfocar la ventana, al cambiar de página y cada minuto, sin recargar (SC-006).
 */
export function NotificationBell() {
  const { data: me } = useSession();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const enabled = me?.role === "cliente";
  const q = useQuery({
    queryKey: ["notifications", "summary"],
    queryFn: () => apiFetch<NotificationsSummary>("/notifications/summary"),
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const readAll = useMutation({ mutationFn: () => apiFetch("/notifications/read-all", { method: "POST" }), onSettled: () => refreshNotifications() });

  // Al navegar se actualiza el contador (FR-030).
  useEffect(() => {
    if (enabled) void refreshNotifications();
  }, [location.pathname, enabled]);

  if (!enabled) return null;
  const unread = q.data?.unread ?? 0;
  const shown = unread > 99 ? "99+" : String(unread);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="relative inline-flex size-11 items-center justify-center rounded-full hover:bg-surface"
          aria-label={unread > 0 ? `Avisos, ${unread} sin leer` : "Avisos"}
        >
          <Bell aria-hidden className="size-5" />
          {unread > 0 && (
            <span aria-hidden className="tabular absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-accent px-1.5 text-center text-xs font-semibold leading-5 text-on-accent">
              {shown}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-[min(24rem,92vw)] overflow-hidden rounded-[18px] border border-border bg-canvas text-text shadow-xl print:hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="text-[17px] font-semibold">Avisos</h2>
            {unread > 0 && (
              <Button size="sm" variant="ghost" onClick={() => readAll.mutate()} disabled={readAll.isPending}>Marcar todos como leídos</Button>
            )}
          </div>
          {q.isPending ? (
            <p className="p-4 text-sm text-muted">Cargando avisos…</p>
          ) : q.isError ? (
            <p role="alert" className="p-4 text-sm text-danger">No pudimos cargar tus avisos.</p>
          ) : q.data.latest.length === 0 ? (
            <p className="p-4 text-[15px] text-muted">No tienes avisos.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {q.data.latest.map((n) => (
                <NotificationItem key={n.id} n={n} onOpen={() => setOpen(false)} />
              ))}
            </ul>
          )}
          <div className="border-t border-border px-4 py-3 text-center">
            <Link to="/avisos" onClick={() => setOpen(false)} className="text-sm font-medium text-accent underline underline-offset-2">Ver todos</Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
