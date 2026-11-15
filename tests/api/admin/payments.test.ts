import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { AdminOrderDetail, PendingPayment } from "@shared/admin-types";
import { api, ids, resetDb, rowsOf, signInAdmin, signUp, withDb } from "../helpers";

let admin: Awaited<ReturnType<typeof signInAdmin>>;
let older: string;
let newer: string;

async function pending(cookie: string, payment: Record<string, unknown>) {
  await api(`/cart/items/${ids.p3}`, { method: "PUT", cookie, json: { quantity: 1 } });
  const res = await api("/checkout/orders", { method: "POST", cookie, json: { delivery: { method: "pickup" }, payment, expectedTotalCents: 299900 } });
  return ((await res.json()) as { order: { number: string } }).order.number;
}

beforeEach(async () => {
  await resetDb();
  admin = await signInAdmin();
  const u = await signUp();
  older = await pending(u.cookie, { method: "yape_plin", operationCode: "12345678" });
  newer = await pending(u.cookie, { method: "transfer" });
  await withDb((db) => db.execute(sql`update orders set created_at = now() - interval '3 hours' where number = ${older}`));
});

const stockOf = async () => Number((await rowsOf(sql`select stock from product where id = ${ids.p3}`))[0]!.stock);

describe("HU-36: pagos por confirmar", () => {
  it("HU-36, RN-12: lista los pendientes del más antiguo al más nuevo con código y vencimiento", async () => {
    const list = (await (await api("/admin/payments/pending", { cookie: admin.cookie })).json()) as PendingPayment[];
    expect(list.map((p) => p.number)).toEqual([older, newer]);
    expect(list[0]).toMatchObject({ method: "yape_plin", operationCode: "12345678", totalCents: 299900 });
    const hours = (new Date(list[0]!.expiresAt).getTime() - new Date(list[0]!.createdAt).getTime()) / 3_600_000;
    expect(hours).toBeCloseTo(24, 5);
  });

  it("HU-36: confirmar deja el pedido Pagado, el pago confirmado y un evento del administrador", async () => {
    const res = await api(`/admin/orders/${older}/payment/confirm`, { method: "POST", cookie: admin.cookie, json: {} });
    expect(res.status).toBe(200);
    const d = (await res.json()) as AdminOrderDetail;
    expect(d.status).toBe("paid");
    expect(d.payment.status).toBe("confirmed");
    expect(d.events.at(-1)).toMatchObject({ fromStatus: "pending_payment", toStatus: "paid", actor: "administrador" });
    const list = (await (await api("/admin/payments/pending", { cookie: admin.cookie })).json()) as PendingPayment[];
    expect(list.map((p) => p.number)).toEqual([newer]);
  });

  it("HU-36, RN-13: rechazar exige motivo, cancela, devuelve el stock y marca el pago rechazado", async () => {
    expect((await api(`/admin/orders/${older}/payment/reject`, { method: "POST", cookie: admin.cookie, json: {} })).status).toBe(400);
    const before = await stockOf();
    const res = await api(`/admin/orders/${older}/payment/reject`, { method: "POST", cookie: admin.cookie, json: { reason: "Código de operación inexistente" } });
    expect(res.status).toBe(200);
    const d = (await res.json()) as AdminOrderDetail;
    expect(d.status).toBe("cancelled");
    expect(d.payment.status).toBe("rejected");
    expect(d.events.at(-1)).toMatchObject({ toStatus: "cancelled", reason: "Código de operación inexistente" });
    expect(await stockOf()).toBe(before + 1);
  });

  it("HU-36: confirmar un pedido que ya no está pendiente → 409 STATE_CHANGED", async () => {
    await withDb((db) => db.execute(sql`update orders set status = 'cancelled' where number = ${older}`));
    const res = await api(`/admin/orders/${older}/payment/confirm`, { method: "POST", cookie: admin.cookie, json: {} });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("STATE_CHANGED");
  });

  it("HU-42: confirmar y rechazar quedan en la auditoría", async () => {
    await api(`/admin/orders/${older}/payment/confirm`, { method: "POST", cookie: admin.cookie, json: {} });
    await api(`/admin/orders/${newer}/payment/reject`, { method: "POST", cookie: admin.cookie, json: { reason: "No llegó la transferencia" } });
    const actions = (await rowsOf(sql`select action from audit_log order by created_at`)).map((r) => r.action);
    expect(actions).toEqual(["pago_confirmado", "pago_rechazado"]);
  });
});
