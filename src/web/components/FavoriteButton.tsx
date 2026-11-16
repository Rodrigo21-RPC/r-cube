import { useLocation, useNavigate } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { useSession } from "@web/auth";
import { cn } from "@web/lib/cn";

const IDS_KEY = ["favorites", "ids"] as const;

/** Ids de los favoritos del cliente; una sola consulta alimenta todos los corazones (HU-45). */
export function useFavoriteIds() {
  const { data: me } = useSession();
  return useQuery({
    queryKey: IDS_KEY,
    queryFn: () => apiFetch<{ ids: string[] }>("/favorites/ids"),
    enabled: me?.role === "cliente",
  });
}

/** Al volver de iniciar sesión guarda el favorito que el visitante quiso marcar (HU-45, FR-011). */
export async function saveFavoriteAfterSignIn(productId: string | null) {
  if (!productId) return;
  try {
    await apiFetch(`/favorites/${encodeURIComponent(productId)}`, { method: "PUT" });
  } catch {
    // Un administrador no tiene favoritos o el producto ya no existe: no se bloquea el ingreso.
  }
  await queryClient.invalidateQueries({ queryKey: ["favorites"] });
}

/**
 * Corazón de favoritos: botón con `aria-pressed` y nombre «Agregar … a favoritos» o «Quitar … de favoritos».
 * El visitante va a ingresar y el favorito queda guardado al volver (HU-45).
 */
export function FavoriteButton({ productId, name, className }: { productId: string; name: string; className?: string }) {
  const { data: me } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const ids = useFavoriteIds();
  const on = Boolean(ids.data?.ids.includes(productId));

  const toggle = useMutation({
    mutationFn: (next: boolean) => apiFetch(`/favorites/${productId}`, { method: next ? "PUT" : "DELETE" }),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: IDS_KEY });
      const before = queryClient.getQueryData<{ ids: string[] }>(IDS_KEY);
      queryClient.setQueryData<{ ids: string[] }>(IDS_KEY, (d) => ({
        ids: next ? [productId, ...(d?.ids ?? []).filter((i) => i !== productId)] : (d?.ids ?? []).filter((i) => i !== productId),
      }));
      return { before };
    },
    onError: (e, _next, ctx) => {
      queryClient.setQueryData(IDS_KEY, ctx?.before);
      toast.error(e instanceof ApiError ? e.message : "No se pudo actualizar tus favoritos.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });

  if (me && me.role !== "cliente") return null;

  function onClick() {
    if (!me) {
      const back = encodeURIComponent(location.pathname + location.search);
      navigate(`/ingresar?volver=${back}&favorito=${encodeURIComponent(productId)}`);
      return;
    }
    toggle.mutate(!on);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? `Quitar ${name} de favoritos` : `Agregar ${name} a favoritos`}
      className={cn("relative z-10 inline-flex size-11 items-center justify-center rounded-full text-text hover:bg-surface-2", className)}
    >
      <Heart aria-hidden className={cn("size-5", on && "fill-danger text-danger")} />
    </button>
  );
}
