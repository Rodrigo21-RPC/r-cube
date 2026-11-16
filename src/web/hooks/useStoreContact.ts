import { useQuery } from "@tanstack/react-query";
import type { StoreContact } from "@shared/types";
import { apiFetch } from "@web/api";

/**
 * Nombre y número de WhatsApp de la tienda (HU-59). Una sola consulta alimenta todos los botones; si falla, los
 * botones simplemente no se muestran.
 */
export function useStoreContact() {
  return useQuery({
    queryKey: ["store-contact"],
    queryFn: () => apiFetch<StoreContact>("/catalog/contact"),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
