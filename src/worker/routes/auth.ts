import { Hono, type Context } from "hono";
import { eq, sql } from "drizzle-orm";
import { schema } from "@db/client";
import { signInSchema, signUpSchema } from "@shared/schemas";
import { AppError, parseBody, type AppEnv } from "../middleware";

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

/** Traduce los errores de Better Auth al contrato { error: { code, message, fields? } }. */
async function translate(res: Response): Promise<Response> {
  if (res.ok || res.status === 302) return res;
  const data = (await res.clone().json().catch(() => null)) as { code?: string; message?: string } | null;
  const code = data?.code ?? "AUTH_ERROR";
  const known: Record<string, [number, string, Record<string, string>?]> = {
    USER_ALREADY_EXISTS: [422, "Este correo ya está registrado.", { email: "Este correo ya está registrado." }],
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: [422, "Este correo ya está registrado.", { email: "Este correo ya está registrado." }],
    INVALID_EMAIL_OR_PASSWORD: [401, "Correo o contraseña incorrectos."],
    INVALID_PASSWORD: [400, "La contraseña actual no es correcta.", { currentPassword: "La contraseña actual no es correcta." }],
    PASSWORD_TOO_SHORT: [400, "Usa al menos 8 caracteres.", { newPassword: "Usa al menos 8 caracteres." }],
    PASSWORD_TOO_LONG: [400, "La contraseña es demasiado larga.", { newPassword: "Máximo 128 caracteres." }],
  };
  const [status, message, fields] = known[code] ?? [
    res.status,
    res.status === 429 ? "Demasiados intentos. Espera un momento e intenta de nuevo." : res.status === 401 ? "Inicia sesión para continuar." : "No pudimos completar la operación. Intenta de nuevo.",
  ];
  const headers = new Headers(res.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  return new Response(JSON.stringify({ error: { code, message, fields } }), { status, headers });
}

function forward(c: Context<AppEnv>, body: unknown) {
  const headers = new Headers(c.req.raw.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  return c.get("auth").handler(new Request(c.req.url, { method: "POST", headers, body: JSON.stringify(body) }));
}

async function readJson(c: Context<AppEnv>) {
  return (await c.req.json().catch(() => ({}))) as unknown;
}

export const authRoutes = new Hono<AppEnv>()
  /** Registro con validación por campo; el rol nunca se toma del formulario (HU-07). */
  .post("/sign-up/email", async (c) => {
    const data = parseBody(signUpSchema, await readJson(c));
    return translate(await forward(c, data));
  })
  /** Inicio de sesión con bloqueo temporal tras 5 fallos y rechazo de cuentas bloqueadas (HU-08, RN-08). */
  .post("/sign-in/email", async (c) => {
    const parsed = signInSchema.safeParse(await readJson(c));
    if (!parsed.success) throw new AppError(401, "INVALID_EMAIL_OR_PASSWORD", "Correo o contraseña incorrectos.");
    const db = c.get("db");
    const { user } = schema;
    const [account] = await db
      .select({ id: user.id, blocked: user.blocked, lockedUntil: user.lockedUntil })
      .from(user)
      .where(eq(user.email, parsed.data.email));

    if (account?.blocked)
      throw new AppError(403, "BLOCKED", "Tu cuenta está bloqueada. Comunícate con R Cube para más información.");
    if (account?.lockedUntil && account.lockedUntil > new Date())
      throw new AppError(423, "LOCKED", `Por seguridad bloqueamos el acceso durante ${LOCK_MINUTES} minutos tras varios intentos fallidos.`);

    const res = await forward(c, parsed.data);
    if (account && res.status === 401) {
      // Al quinto fallo seguido: bloqueo de 15 minutos y el contador vuelve a 0.
      await db.execute(sql`update "user" set
        failed_login_count = case when failed_login_count + 1 >= ${MAX_FAILURES} then 0 else failed_login_count + 1 end,
        locked_until = case when failed_login_count + 1 >= ${MAX_FAILURES}
          then now() + make_interval(mins => ${LOCK_MINUTES}) else locked_until end
        where id = ${account.id}`);
    } else if (account && res.ok) {
      await db.update(user).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(user.id, account.id));
    }
    return translate(res);
  })
  .on(["GET", "POST"], "/*", async (c) => translate(await c.get("auth").handler(c.req.raw)));
