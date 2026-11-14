import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { api, cookieFrom, resetDb, signIn, signUp, withDb } from "./helpers";

beforeEach(resetDb);

describe("HU-07: registro", () => {
  it("HU-07: crea la cuenta con sesión iniciada", async () => {
    const res = await api("/auth/sign-up/email", {
      method: "POST",
      json: { name: "Ana Pérez", email: "Ana@Prueba.pe", password: "clave-segura-1", phone: "987654321" },
    });
    expect(res.status).toBe(200);
    const cookie = cookieFrom(res);
    expect(cookie).toContain("session_token");
    const me = await api("/account/me", { cookie });
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ name: "Ana Pérez", email: "ana@prueba.pe", role: "cliente" });
  });

  it("HU-07: correo repetido da error en el campo correo", async () => {
    await signUp({ email: "repetido@prueba.pe" });
    const res = await api("/auth/sign-up/email", {
      method: "POST",
      json: { name: "Otra", email: "repetido@prueba.pe", password: "clave-segura-1", phone: "987654321" },
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { fields: Record<string, string> } };
    expect(body.error.fields.email).toMatch(/correo/i);
  });

  it("HU-07: contraseña de 7 caracteres o teléfono inválido dan error por campo", async () => {
    const res = await api("/auth/sign-up/email", {
      method: "POST",
      json: { name: "Ana", email: "corta@prueba.pe", password: "1234567", phone: "12" },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { fields: Record<string, string> } };
    expect(body.error.fields.password).toMatch(/8/);
    expect(body.error.fields.phone).toBeDefined();
  });

  it("HU-07, RNF-05: el registro no permite elegir el rol", async () => {
    const res = await api("/auth/sign-up/email", {
      method: "POST",
      json: { name: "Pícaro", email: "rol@prueba.pe", password: "clave-segura-1", phone: "987654321", role: "administrador" },
    });
    const role = await withDb(async (db) =>
      ((await db.execute(sql`select role from "user" where email = 'rol@prueba.pe'`)) as unknown as { role: string }[])[0]?.role,
    );
    expect(res.status === 400 || role === "cliente").toBe(true);
  });
});

describe("HU-08: inicio y cierre de sesión", () => {
  it("HU-08: credenciales inválidas dan un mensaje genérico", async () => {
    const u = await signUp();
    const wrong = await signIn(u.email, "otra-clave-123");
    const unknown = await signIn("nadie@prueba.pe", "otra-clave-123");
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    const m1 = ((await wrong.json()) as { error: { message: string } }).error.message;
    const m2 = ((await unknown.json()) as { error: { message: string } }).error.message;
    expect(m1).toBe(m2);
    expect(m1).toBe("Correo o contraseña incorrectos.");
  });

  it("HU-08: 5 fallos seguidos bloquean 15 minutos aunque la contraseña sea correcta", async () => {
    const u = await signUp();
    for (let i = 0; i < 5; i++) expect((await signIn(u.email, "mala-clave-000")).status).toBe(401);
    const locked = await signIn(u.email, u.password);
    expect(locked.status).toBe(423);
    expect(((await locked.json()) as { error: { code: string; message: string } }).error).toMatchObject({
      code: "LOCKED",
      message: expect.stringMatching(/15 minutos/),
    });
    const until = await withDb(async (db) =>
      ((await db.execute(sql`select locked_until from "user" where email = ${u.email}`)) as unknown as { locked_until: Date }[])[0]!.locked_until,
    );
    const minutes = (new Date(until).getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(14);
    expect(minutes).toBeLessThanOrEqual(15);
  });

  it("HU-08: un acceso correcto reinicia el contador de fallos", async () => {
    const u = await signUp();
    for (let i = 0; i < 4; i++) await signIn(u.email, "mala-clave-000");
    expect((await signIn(u.email, u.password)).status).toBe(200);
    for (let i = 0; i < 4; i++) await signIn(u.email, "mala-clave-000");
    expect((await signIn(u.email, u.password)).status).toBe(200);
  });

  it("RN-08: un cliente bloqueado no inicia sesión y ve un mensaje claro", async () => {
    const u = await signUp();
    await withDb((db) => db.execute(sql`update "user" set blocked = true where email = ${u.email}`));
    const res = await signIn(u.email, u.password);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { message: string } }).error.message).toMatch(/bloqueada/);
  });

  it("HU-08, FR-011: la sesión dura 7 días y la cookie es HttpOnly, Secure y SameSite=Lax", async () => {
    const u = await signUp();
    const res = await signIn(u.email, u.password);
    const raw = res.headers.getSetCookie().find((c) => c.includes("session_token"))!;
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/Secure/i);
    expect(raw).toMatch(/SameSite=Lax/i);
    const expires = await withDb(async (db) =>
      ((await db.execute(sql`select max(expires_at) e from session`)) as unknown as { e: Date }[])[0]!.e,
    );
    const days = (new Date(expires).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
  });

  it("HU-08: cerrar sesión termina la sesión", async () => {
    const u = await signUp();
    const out = await api("/auth/sign-out", { method: "POST", cookie: u.cookie, json: {} });
    expect(out.status).toBe(200);
    expect((await api("/account/me", { cookie: u.cookie })).status).toBe(401);
  });

  it("RNF-05: la contraseña nunca se guarda en texto plano", async () => {
    const u = await signUp({ password: "texto-plano-123" });
    const stored = await withDb(async (db) =>
      ((await db.execute(sql`select password from account where user_id = ${u.user.id}`)) as unknown as { password: string }[])[0]!.password,
    );
    expect(stored).not.toContain("texto-plano-123");
    expect(stored).toMatch(/^pbkdf2\$/);
  });
});

describe("HU-10: cambio de contraseña", () => {
  it("HU-10: con la contraseña actual correcta cambia y cierra las demás sesiones", async () => {
    const u = await signUp();
    const other = cookieFrom(await signIn(u.email, u.password));
    const res = await api("/auth/change-password", {
      method: "POST",
      cookie: u.cookie,
      json: { currentPassword: u.password, newPassword: "nueva-clave-456", revokeOtherSessions: true },
    });
    expect(res.status).toBe(200);
    expect((await api("/account/me", { cookie: other })).status).toBe(401);
    expect((await signIn(u.email, "nueva-clave-456")).status).toBe(200);
  });

  it("HU-10: con la contraseña actual incorrecta no cambia nada", async () => {
    const u = await signUp();
    const res = await api("/auth/change-password", {
      method: "POST",
      cookie: u.cookie,
      json: { currentPassword: "equivocada-000", newPassword: "nueva-clave-456", revokeOtherSessions: true },
    });
    expect(res.status).toBe(400);
    expect((await signIn(u.email, u.password)).status).toBe(200);
  });

  it("HU-10: la nueva contraseña debe tener al menos 8 caracteres", async () => {
    const u = await signUp();
    const res = await api("/auth/change-password", {
      method: "POST",
      cookie: u.cookie,
      json: { currentPassword: u.password, newPassword: "corta", revokeOtherSessions: true },
    });
    expect(res.status).toBe(400);
  });
});
