import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { Notification, NotificationsSummary } from "@shared/types";
import { expirePendingOrders } from "@worker/cron";
import { api, ids, placeOrder, resetDb, rowsOf, signInAdmin, signUp, withDb } from "./helpers";

let admin: Awaited<ReturnType<typeof signInAdmin>>;
let u: Awaited<ReturnType<typeof signUp>>;
const card = { method: "card", cardNumber: "4111111111111111", expMonth: 12, expYear: 2030, cvv: "123" };

beforeEach(async () => {
  await resetDb();
  admin = await signInAdmin();
  u = await signUp({ name: "Ana Pérez" });
});

const summary = async (cookie = u.cookie) => (await (await api("/notifications/summary", { cookie })).json()) as NotificationsSummary;
const messages = async () => (await summary()).latest.map((n) => n.message);
const status = (n: string, to: string, expectedStatus: string, reason?: string) =>
  api(`/admin/orders/${n}/status`, { method: "POST", cookie: admin.cookie, json: { to, expectedStatus, reason } });

describe("HU-53, FR-029: se avisa cuando el administrador o el sistema cambian el estado", () => {
  it("HU-53: confirmar el pago, preparar, enviar y entregar generan un aviso cada uno, del más nuevo al más antiguo", async () => {
    const { number } = await placeOrder(u.cookie, [{ productId: ids.p3 }], { delivery: "delivery" });
    expect((await summary()).unread).toBe(0); // crear el pedido no avisa: lo hizo el propio cliente
    expect((await api(`/admin/orders/${number}/payment/confirm`, { method: "POST", cookie: admin.cookie, json: {} })).status).toBe(200);
    await status(number!, "preparing", "paid");
    await status(number!, "shipped", "preparing");
    await status(number!, "delivered", "shipped");
    expect(await messages()).toEqual([
      `Tu pedido ${number} está Entregado`,
      `Tu pedido ${number} está Enviado`,
      `Tu pedido ${number} está Preparando`,
      `Tu pedido ${number} está Pagado`,
    ]);
    const s = await summary();
    expect(s.unread).toBe(4);
    expect(s.latest[0]).toMatchObject({ orderNumber: number, read: false });
  });

  it("HU-53: cancelar el administrador o rechazar un pago avisa con el motivo", async () => {
    const a = (await placeOrder(u.cookie, [{ productId: ids.p3 }])).number!;
    const b = (await placeOrder(u.cookie, [{ productId: ids.p10 }])).number!;
    await status(a, "cancelled", "pending_payment", "Sin stock real");
    await api(`/admin/orders/${b}/payment/reject`, { method: "POST", cookie: admin.cookie, json: { reason: "Código de operación inexistente" } });
    expect(await messages()).toEqual([`Tu pedido ${b} fue cancelado: Código de operación inexistente`, `Tu pedido ${a} fue cancelado: Sin stock real`]);
  });

  it("HU-53: la cancelación automática a las 24 h avisa con el motivo del sistema", async () => {
    const { number } = await placeOrder(u.cookie, [{ productId: ids.p3 }]);
    await withDb((db) => db.execute(sql`update orders set created_at = now() - interval '25 hours'`));
    expect(await withDb((db) => expirePendingOrders(db))).toBe(1);
    expect(await messages()).toEqual([`Tu pedido ${number} fue cancelado: Pago no recibido en 24 h`]);
  });

  it("HU-53: cancelar el propio cliente no genera aviso", async () => {
    const { number } = await placeOrder(u.cookie, [{ productId: ids.p3 }]);
    await api(`/orders/${number}/cancel`, { method: "POST", cookie: u.cookie, json: { reason: "no_lo_necesito" } });
    expect(await rowsOf(sql`select 1 from notification`)).toEqual([]);
  });

  it("HU-53: un cambio de estado que falla no deja aviso", async () => {
    const { number } = await placeOrder(u.cookie, [{ productId: ids.p3 }], { payment: card });
    const res = await status(number!, "shipped", "paid"); // paid → shipped no es una transición válida
    expect(res.status).toBe(409);
    const stale = await status(number!, "preparing", "pending_payment"); // el estado cambió mientras se revisaba
    expect(stale.status).toBe(409);
    expect(await rowsOf(sql`select 1 from notification`)).toEqual([]);
  });

  it("HU-53: cada cliente recibe solo los avisos de sus pedidos", async () => {
    const other = await signUp();
    await placeOrder(u.cookie, [{ productId: ids.p3 }], { payment: card });
    await status((await rowsOf(sql`select number from orders`))[0]!.number as string, "preparing", "paid");
    expect((await summary(other.cookie)).unread).toBe(0);
    expect((await summary()).unread).toBe(1);
  });
});

describe("HU-53, FR-030, FR-031: lista, contador y lectura", () => {
  async function seed(n: number) {
    const { number } = await placeOrder(u.cookie, [{ productId: ids.p3 }]);
    await withDb(async (db) => {
      const [o] = (await db.execute(sql`select id from orders where number = ${number}`)) as unknown as { id: string }[];
      for (let i = 0; i < n; i++)
        await db.execute(sql`insert into notification (id, user_id, order_id, order_number, message, created_at)
          values (${`n${String(i).padStart(2, "0")}`}, ${u.user.id}, ${o!.id}, ${number}, ${`Aviso ${i}`}, now() - ${n - i} * interval '1 minute')`);
    });
    return number!;
  }

  it("HU-53: el resumen trae el contador y los 20 más nuevos; la lista completa pagina de 20 en 20", async () => {
    await seed(25);
    const s = await summary();
    expect(s.unread).toBe(25);
    expect(s.latest).toHaveLength(20);
    expect(s.latest[0]!.message).toBe("Aviso 24");
    const p1 = (await (await api("/notifications", { cookie: u.cookie })).json()) as { items: Notification[]; total: number; page: number; pageSize: number };
    expect(p1).toMatchObject({ total: 25, page: 1, pageSize: 20 });
    expect(p1.items).toHaveLength(20);
    const p2 = (await (await api("/notifications?page=2", { cookie: u.cookie })).json()) as { items: Notification[] };
    expect(p2.items.map((n) => n.message)).toEqual(["Aviso 4", "Aviso 3", "Aviso 2", "Aviso 1", "Aviso 0"]);
  });

  it("HU-53: marcar uno como leído baja el contador; marcar todos lo deja en cero", async () => {
    await seed(3);
    expect((await api("/notifications/n02/read", { method: "POST", cookie: u.cookie })).status).toBe(204);
    const s = await summary();
    expect(s.unread).toBe(2);
    expect(s.latest.find((n) => n.id === "n02")!.read).toBe(true);
    expect((await api("/notifications/read-all", { method: "POST", cookie: u.cookie })).status).toBe(204);
    expect((await summary()).unread).toBe(0);
  });

  it("RN-08: no se puede ver ni marcar un aviso de otro cliente", async () => {
    await seed(1);
    const other = await signUp();
    expect((await api("/notifications/n00/read", { method: "POST", cookie: other.cookie })).status).toBe(404);
    expect((await summary(other.cookie)).latest).toEqual([]);
    expect((await summary()).unread).toBe(1); // sigue sin leer
    await api("/notifications/read-all", { method: "POST", cookie: other.cookie });
    expect((await summary()).unread).toBe(1);
  });

  it("HU-53: sin sesión 401 y una cuenta de administrador 403", async () => {
    expect((await api("/notifications/summary")).status).toBe(401);
    expect((await api("/notifications/summary", { cookie: admin.cookie })).status).toBe(403);
  });
});
