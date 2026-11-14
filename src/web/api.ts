import { QueryClient } from "@tanstack/react-query";
import type { ApiErrorBody } from "@shared/types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
    readonly body: ApiErrorBody["error"] | null = null,
  ) {
    super(message);
  }
}

/** Cliente tipado de la API: los tipos de respuesta viven en @shared/types. */
export async function apiFetch<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.json);
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers, body, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "NETWORK", "No hay conexión. Revisa tu internet e intenta de nuevo.");
  }
  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;
  const data = (await res.json().catch(() => null)) as ApiErrorBody | { message?: string; code?: string } | null;
  if (data && "error" in data && data.error) {
    throw new ApiError(res.status, data.error.code, data.error.message, data.error.fields ?? {}, data.error);
  }
  const flat = data as { message?: string; code?: string } | null;
  throw new ApiError(res.status, flat?.code ?? "ERROR", flat?.message ?? "Ocurrió un error. Intenta de nuevo.");
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});
