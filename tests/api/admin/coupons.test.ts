import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { AdminCoupon, Page } from "@shared/admin-types";
import { limaToday } from "@shared/coupon";
import { api, resetDb, rowsOf, signInAdmin, signUp, withDb } from "../helpers";

let admin: Awaited<ReturnType<typeof signInAdmin>>;
beforeEach(async () => {
  await resetDb();
  admin = await signInAdmin();
});

/** Día de Lima desplazado `days` días respecto de hoy. */
const day = (days: number) => new Date(new Date(`${limaToday()}T12:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
const body = (o: Record<string, unknown> = {}) => ({ code: "bienvenido10", kind: "percent", value: 10, startsOn: day(-1), endsOn: day(30), maxUses: 50, ...o });
const create = (o: Record<string, unknown> = {}) => api("/admin/coupons", { method: "POST", cookie: admin.cookie, json: body(o) });
const patch = (id: string, o: Record<string, unknown>) => api(`/admin/coupons/${id}`, { method: "PATCH", cookie: admin.cookie, json: o });
const del = (id: string) => api(`/admin/coupons/${id}`, { method: "DELETE", cookie: admin.cookie });
const list = async (qs = "") => (await (await api(`/admin/coupons?${qs}`, { cookie: admin.cookie })).json()) as Page<AdminCoupon>;
const errorOf = async (res: Response) => ((await res.json()) as { error: { code: string; fields?: Record<string, string> } }).error;
const audits = () => rowsOf(sql`select detail, data from audit_log where action = 'cupon' order by created_at`);

describe("HU-50, FR-020: crear cupones", () => {
  it("HU-50: crea un cupón Activo con el código en mayúsculas y lo audita", async () => {
    const res = await create();
    expect(res.status).toBe(201);
    expect((await res.json()) as AdminCoupon).toMatchObject({
      code: "BIENVENIDO10", kind: "percent", value: 10, maxUses: 50, usedCount: 0, active: true, status: "active", startsOn: day(-1), endsOn: day(30),
    });
    expect(await audits()).toEqual([expect.objectContaining({ detail: expect.stringContaining("BIENVENIDO10") })]);
  });

  it("FR-033: valida código, tipo, valor, fechas y usos con un error por campo", async () => {
    const bad = async (o: Record<string, unknown>, field: string) => {
      const res = await create(o);
      expect(res.status, JSON.stringify(o)).toBe(400);
      expect((await errorOf(res)).fields, JSON.stringify(o)).toHaveProperty(field);
    };
    await bad({ code: "ab" }, "code");
    await bad({ code: "A".repeat(21) }, "code");
    await bad({ code: "con espacio" }, "code");
    await bad({ kind: "otro" }, "kind");
    await bad({ value: 0 }, "value");
    await bad({ value: 91 }, "value");
    await bad({ kind: "fixed", value: 99 }, "value");
    await bad({ value: 10.5 }, "value");
    await bad({ startsOn: "2026-13-40" }, "startsOn");
    await bad({ endsOn: day(-5) }, "endsOn");
    await bad({ maxUses: 0 }, "maxUses");
    expect((await create({ kind: "fixed", value: 100 })).status).toBe(201);
    expect(await list()).toMatchObject({ total: 1 });
  });

  it("FR-020: un código repetido (sin distinguir mayúsculas) responde 409 DUPLICATE_CODE en el campo", async () => {
    await create();
    const res = await create({ code: "BienVenido10" });
    expect(res.status).toBe(409);
    const e = await errorOf(res);
    expect(e.code).toBe("DUPLICATE_CODE");
    expect(e.fields).toEqual({ code: "Ese código ya existe" });
  });
});

describe("HU-50: lista con estado", () => {
  it("HU-50: calcula Activo, Inactivo, Vencido y Agotado con la hora de Lima y pagina de 20", async () => {
    await withDb(async (db) => {
      const row = (id: string, code: string, o: { start: string; end: string; max?: number; used?: number; active?: boolean }) =>
        db.execute(sql`insert into coupon (id, code, kind, value, starts_on, ends_on, max_uses, used_count, active)
          values (${id}, ${code}, 'percent', 10, ${o.start}, ${o.end}, ${o.max ?? 5}, ${o.used ?? 0}, ${o.active ?? true})`);
      await row("c1", "ACTIVO", { start: day(-2), end: day(5) });
      await row("c2", "INACTIVO", { start: day(-2), end: day(5), active: false });
      await row("c3", "VENCIDO", { start: day(-20), end: day(-1) });
      await row("c4", "AGOTADO", { start: day(-2), end: day(5), used: 5 });
      await row("c5", "HOY", { start: day(-2), end: day(0) }); // vence hoy: todavía vale
    });
    const byCode = Object.fromEntries((await list()).items.map((c) => [c.code, c.status]));
    expect(byCode).toEqual({ ACTIVO: "active", INACTIVO: "inactive", VENCIDO: "expired", AGOTADO: "exhausted", HOY: "active" });
    expect(await list()).toMatchObject({ pageSize: 20, total: 5 });
  });
});

describe("HU-50, FR-025: editar, activar y borrar", () => {
  it("HU-50: cambia valor, vigencia, usos máximos y estado, y audita cada cambio", async () => {
    const { id } = (await (await create()).json()) as AdminCoupon;
    const res = await patch(id, { value: 15, endsOn: day(60), maxUses: 100 });
    expect(res.status).toBe(200);
    expect((await res.json()) as AdminCoupon).toMatchObject({ value: 15, endsOn: day(60), maxUses: 100 });
    expect((await patch(id, { active: false })).status).toBe(200);
    expect((await list()).items[0]).toMatchObject({ active: false, status: "inactive" });
    expect((await patch(id, { active: true })).status).toBe(200);
    expect(await audits()).toHaveLength(4); // alta, edición, desactivar y activar
  });

  it("FR-033: la edición valida la combinación completa (tipo y valor, fechas)", async () => {
    const { id } = (await (await create()).json()) as AdminCoupon;
    expect((await errorOf(await patch(id, { value: 95 }))).fields).toHaveProperty("value");
    expect((await errorOf(await patch(id, { kind: "fixed" }))).fields).toHaveProperty("value"); // 10 céntimos no es un monto válido
    expect((await errorOf(await patch(id, { endsOn: day(-10) }))).fields).toHaveProperty("endsOn");
    expect((await patch(id, { kind: "fixed", value: 500 })).status).toBe(200);
  });

  it("FR-025: no se puede cambiar el código de un cupón ya usado, pero sí lo demás", async () => {
    const { id } = (await (await create()).json()) as AdminCoupon;
    await withDb((db) => db.execute(sql`update coupon set used_count = 2 where id = ${id}`));
    const res = await patch(id, { code: "NUEVO" });
    expect(res.status).toBe(409);
    expect((await errorOf(res)).code).toBe("COUPON_USED");
    expect((await patch(id, { code: "bienvenido10", value: 20 })).status).toBe(200); // mismo código: no es un cambio
  });

  it("FR-020: los usos máximos no pueden quedar por debajo de los ya consumidos", async () => {
    const { id } = (await (await create()).json()) as AdminCoupon;
    await withDb((db) => db.execute(sql`update coupon set used_count = 7 where id = ${id}`));
    const res = await patch(id, { maxUses: 5 });
    expect(res.status).toBe(400);
    expect((await errorOf(res)).fields).toEqual({ maxUses: "El cupón ya lleva 7 usos" });
  });

  it("HU-50: borra un cupón sin usos (204) y audita; con usos responde 409 COUPON_USED", async () => {
    const a = (await (await create({ code: "SINUSO" })).json()) as AdminCoupon;
    const b = (await (await create({ code: "CONUSO" })).json()) as AdminCoupon;
    await withDb((db) => db.execute(sql`update coupon set used_count = 1 where id = ${b.id}`));
    expect((await del(a.id)).status).toBe(204);
    const res = await del(b.id);
    expect(res.status).toBe(409);
    expect((await errorOf(res)).code).toBe("COUPON_USED");
    expect((await list()).items.map((c) => c.code)).toEqual(["CONUSO"]);
    expect((await audits()).length).toBe(3); // dos altas y una baja
  });

  it("HU-50: un cupón usado por un pedido que luego se canceló tampoco se borra (el pedido lo conserva)", async () => {
    const c = (await (await create()).json()) as AdminCoupon;
    const u = await signUp();
    await withDb((db) =>
      db.execute(sql`insert into orders (id, number, user_id, status, delivery_method, shipping_cents, subtotal_cents, discount_cents, total_cents,
        taxable_base_cents, igv_cents, payment_method, coupon_id, coupon_code)
        values ('o1', 'RC-000001', ${u.user.id}, 'cancelled', 'pickup', 0, 10000, 1000, 9000, 7627, 1373, 'transfer', ${c.id}, 'BIENVENIDO10')`),
    );
    const res = await del(c.id);
    expect(res.status).toBe(409);
    expect((await errorOf(res)).code).toBe("COUPON_USED");
  });

  it("HU-50: un cupón inexistente responde 404", async () => {
    expect((await patch("no-existe", { active: false })).status).toBe(404);
    expect((await del("no-existe")).status).toBe(404);
  });

  it("HU-50: un cliente no accede a los cupones", async () => {
    const u = await signUp();
    expect((await api("/admin/coupons", { cookie: u.cookie })).status).toBe(403);
    expect((await api("/admin/coupons", { method: "POST", cookie: u.cookie, json: body() })).status).toBe(403);
  });
});
