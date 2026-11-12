import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Db } from "@db/client";
import { schema } from "@db/client";
import { hashPassword, verifyPassword } from "./password";

export const SESSION_DAYS = 7;

/** Better Auth por petición: necesita la conexión de esa petición (research R3). */
export function createAuth(db: Db, env: { BETTER_AUTH_SECRET: string; PUBLIC_URL: string }) {
  return betterAuth({
    appName: "R Cube",
    baseURL: env.PUBLIC_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.PUBLIC_URL],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        rateLimit: schema.rateLimit,
      },
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    session: { expiresIn: 60 * 60 * 24 * SESSION_DAYS, updateAge: 60 * 60 * 24 },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "cliente", input: false },
        phone: { type: "string", required: true, input: true },
        blocked: { type: "boolean", required: false, defaultValue: false, input: false },
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 100,
      customRules: { "/sign-in/email": { window: 60, max: 20 } },
    },
    advanced: {
      useSecureCookies: true,
      defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: "lax" },
      database: { generateId: () => crypto.randomUUID() },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
