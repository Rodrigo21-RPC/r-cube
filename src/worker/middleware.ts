import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { createDb, type Db } from "@db/client";
import { createAuth, type Auth } from "./auth";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "cliente" | "administrador";
}

export type AppEnv = {
  Bindings: Env;
  Variables: { db: Db; auth: Auth; user: SessionUser | null };
};

/** Error de negocio con la forma del contrato: { error: { code, message, fields? } }. */
export class AppError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function errorResponse(c: Context, err: unknown) {
  if (err instanceof AppError) {
    return c.json(
      { error: { code: err.code, message: err.message, fields: err.fields, ...err.extra } },
      err.status,
    );
  }
  console.error(err);
  return c.json({ error: { code: "INTERNAL", message: "Ocurrió un error inesperado. Intenta de nuevo." } }, 500);
}

/** Conexión, Better Auth y sesión por petición. */
export const withContext = createMiddleware<AppEnv>(async (c, next) => {
  const { db, close } = createDb(c.env.HYPERDRIVE.connectionString);
  const auth = createAuth(db, c.env);
  c.set("db", db);
  c.set("auth", auth);
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const u = session?.user as (SessionUser & { blocked?: boolean }) | undefined;
    // Un cliente bloqueado pierde también las sesiones abiertas (RN-08).
    c.set("user", u && !u.blocked ? { id: u.id, name: u.name, email: u.email, role: u.role } : null);
    await next();
  } finally {
    c.executionCtx.waitUntil(close());
  }
});

/** Solo cuentas de cliente (FR-016): 401 sin sesión, 403 si es administrador. */
export const requireCustomer = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Inicia sesión para continuar.");
  if (user.role !== "cliente")
    throw new AppError(403, "FORBIDDEN", "Las cuentas de administrador no pueden comprar en la tienda.");
  await next();
});

type Issues = { issues: { path: PropertyKey[]; message: string }[] };

function validationError(error: Issues | undefined): AppError {
  const fields: Record<string, string> = {};
  for (const issue of error?.issues ?? []) {
    const key = issue.path.map(String).join(".") || "form";
    fields[key] ??= issue.message;
  }
  return new AppError(400, "VALIDATION", "Revisa los datos ingresados.", fields);
}

/** Hook de @hono/zod-validator: errores por campo con código VALIDATION. */
export function validationHook(result: { success: boolean; error?: Issues }) {
  if (!result.success) throw validationError(result.error);
}

/** Valida un cuerpo con Zod o lanza 400 VALIDATION con errores por campo. */
export function parseBody<T>(schema: { safeParse: (d: unknown) => { success: true; data: T } | { success: false; error: Issues } }, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw validationError(r.error);
  return r.data;
}

/** Cualquier usuario con sesión (401 si no hay). */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("user")) throw new AppError(401, "UNAUTHENTICATED", "Inicia sesión para continuar.");
  await next();
});
