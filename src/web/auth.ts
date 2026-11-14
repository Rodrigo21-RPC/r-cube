import { useQuery } from "@tanstack/react-query";
import type { Me } from "@shared/types";
import { apiFetch, ApiError, queryClient } from "./api";

/** Sesión actual: el perfil o null si no hay sesión (HU-08). */
export function useSession() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await apiFetch<Me>("/account/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 60_000,
  });
}

export async function signIn(email: string, password: string) {
  await apiFetch("/auth/sign-in/email", { method: "POST", json: { email, password } });
  await queryClient.invalidateQueries({ queryKey: ["me"] });
}

export async function signUp(data: { name: string; email: string; phone: string; password: string }) {
  await apiFetch("/auth/sign-up/email", { method: "POST", json: data });
  await queryClient.invalidateQueries({ queryKey: ["me"] });
}

export async function signOut() {
  await apiFetch("/auth/sign-out", { method: "POST", json: {} });
  queryClient.setQueryData(["me"], null);
  queryClient.removeQueries({ queryKey: ["cart"] });
  queryClient.removeQueries({ queryKey: ["orders"] });
}
