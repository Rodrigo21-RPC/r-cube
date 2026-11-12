import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { createDb } from "@db/client";
import { expirePendingOrders } from "@worker/cron";
import { api, ids, resetDb, signUp, withDb } from "./helpers";

beforeEach(resetDb);

type Row = Record<string, unknown>;
const rows = (q: ReturnType<typeof sql>) => withDb(async (db) => (await db.execute(q)) as unknown as Row[]);

async function pendingOrder(hoursAgo: number) {
  const u = await signUp();
  await api(`/cart/items/${ids.p3}`, { method: "PUT", cookie: u.cookie, json: { quantity: 2 } });
  const res = await api("/checkout/orders", {
    method: "POST",
    cookie: u.cookie,
    json: { delivery: { method: "pickup" }, payment: { method: "transfer" }, expectedTotalCents: 2 * 299900 },
  });
  const { order } = (await res.json()) as { order: { number: string } };
  await withDb((db) =>
    db.execute(sql`update orders set created_at = now() - make_interval(hours => ${hoursAgo}) where number = ${order.number}`),
  );
  return order.number;
}

async function runCron() {
  const { db, close } = createDb(env.HYPERDRIVE.connectionString);
  try {
    return await expirePendingOrders(db);
  } finally {
    await close();
  }
}

describe("RN-12: vencimiento de pedidos impagos a las 24 h", () => {
  it("RN-12: cancela con motivo y actor Sistema, y devuelve el stock", async () => {
    const number = await pendingOrder(25);
    expect(Number((await rows(sql`select stock from product where id = ${ids.p3}`))[0]!.stock)).toBe(1);
    expect(await runCron()).toBe(1);
    const [o] = await rows(sql`select status from orders where number = ${number}`);
    expect(o!.status).toBe("cancelled");
    const [ev] = await rows(sql`select e.actor_type, e.reason, e.from_status from order_event e
      join orders o on o.id = e.order_id where o.number = ${number} and e.to_status = 'cancelled'`);
    expect(ev).toMatchObject({ actor_type: "sistema", reason: "Pago no recibido en 24 h", from_status: "pending_payment" });
    expect(Number((await rows(sql`select stock from product where id = ${ids.p3}`))[0]!.stock)).toBe(3);
  });

  it("RN-12: un pedido de hace 23 h no cambia", async () => {
    const number = await pendingOrder(23);
    expect(await runCron()).toBe(0);
    expect((await rows(sql`select status from orders where number = ${number}`))[0]!.status).toBe("pending_payment");
  });

  it("RN-12, RN-10: ejecutar dos veces no devuelve el stock dos veces", async () => {
    await pendingOrder(30);
    await runCron();
    expect(await runCron()).toBe(0);
    expect(Number((await rows(sql`select stock from product where id = ${ids.p3}`))[0]!.stock)).toBe(3);
    expect((await rows(sql`select id from order_event where to_status = 'cancelled'`)).length).toBe(1);
  });
});
