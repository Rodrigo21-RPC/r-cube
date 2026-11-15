import { Hono } from "hono";
import { sql } from "drizzle-orm";
import type { AdminOrderRow, AdminSummary } from "@shared/admin-types";
import type { AppEnv } from "../../middleware";

/** Pedidos que cuentan como venta: ni pendientes ni cancelados (FR-004). */
export const SOLD = sql.raw(`('paid','preparing','shipped','delivered')`);
const LIMA = sql.raw(`'America/Lima'`);

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

/** Resumen del negocio (HU-27, FR-003, FR-004). */
export const summaryRoutes = new Hono<AppEnv>().get("/summary", async (c) => {
  const db = c.get("db");
  const q = async (query: ReturnType<typeof sql>) => (await db.execute(query)) as unknown as Row[];

  const [cards, byDay, byCategory, top, latest] = await Promise.all([
    q(sql`select
        (select coalesce(sum(total_cents),0) from orders where status in ${SOLD}
           and (created_at at time zone ${LIMA})::date = (now() at time zone ${LIMA})::date) as sales_today,
        (select count(*) from orders where status in ('paid','preparing')) as to_prepare,
        (select count(*) from orders where status = 'pending_payment') as to_confirm,
        (select count(*) from "user" where role = 'cliente') as customers,
        (select count(*) from product where active and stock <= 5) as low_stock`),
    q(sql`select to_char(d, 'YYYY-MM-DD') as date, coalesce(sum(o.total_cents),0) as total
        from generate_series((now() at time zone ${LIMA})::date - 29, (now() at time zone ${LIMA})::date, interval '1 day') d
        left join orders o on (o.created_at at time zone ${LIMA})::date = d::date and o.status in ${SOLD}
        group by d order by d`),
    q(sql`select c.name, sum(oi.line_total_cents) as total
        from order_item oi join orders o on o.id = oi.order_id join product p on p.id = oi.product_id
        join category c on c.id = p.category_id
        where o.status in ${SOLD} and o.created_at >= now() - interval '30 days'
        group by c.name order by total desc`),
    q(sql`select p.id, p.name, sum(oi.quantity) as units
        from order_item oi join orders o on o.id = oi.order_id join product p on p.id = oi.product_id
        where o.status in ${SOLD} and o.created_at >= now() - interval '30 days'
        group by p.id, p.name order by units desc, p.name limit 5`),
    q(sql`select o.number, o.created_at, u.name, u.email, o.total_cents, o.payment_method, o.status
        from orders o join "user" u on u.id = o.user_id order by o.created_at desc, o.number desc limit 5`),
  ]);

  const card = cards[0] ?? {};
  const body: AdminSummary = {
    cards: {
      salesTodayCents: num(card.sales_today),
      toPrepare: num(card.to_prepare),
      toConfirm: num(card.to_confirm),
      customers: num(card.customers),
      lowStock: num(card.low_stock),
    },
    salesByDay: byDay.map((r) => ({ date: String(r.date), totalCents: num(r.total) })),
    salesByCategory: byCategory.map((r) => ({ name: String(r.name), totalCents: num(r.total) })),
    topProducts: top.map((r) => ({ id: String(r.id), name: String(r.name), units: num(r.units) })),
    latestOrders: latest.map(toOrderRow),
  };
  return c.json(body);
});

export function toOrderRow(r: Row): AdminOrderRow {
  return {
    number: String(r.number),
    createdAt: new Date(r.created_at as string).toISOString(),
    customerName: String(r.name),
    customerEmail: String(r.email),
    totalCents: num(r.total_cents),
    method: r.payment_method as AdminOrderRow["method"],
    status: r.status as AdminOrderRow["status"],
  };
}
