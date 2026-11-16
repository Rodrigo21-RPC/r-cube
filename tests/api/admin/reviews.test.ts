import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { AdminReview, Page } from "@shared/admin-types";
import type { ReviewsPage } from "@shared/types";
import { api, deliverOrder, ids, placeOrder, resetDb, rowsOf, signInAdmin, signUp, withDb } from "../helpers";

let admin: Awaited<ReturnType<typeof signInAdmin>>;
let ana: Awaited<ReturnType<typeof signUp>>;
let luis: Awaited<ReturnType<typeof signUp>>;

async function addReview(id: string, productId: string, userId: string, rating: number, hoursAgo: number, hidden = false) {
  await withDb((db) =>
    db.execute(sql`insert into review (id, product_id, user_id, rating, comment, hidden, created_at)
      values (${id}, ${productId}, ${userId}, ${rating}, ${`Comentario ${id}`}, ${hidden}, now() - ${hoursAgo} * interval '1 hour')`),
  );
}

beforeEach(async () => {
  await resetDb();
  admin = await signInAdmin();
  ana = await signUp({ name: "Ana Pérez", email: "ana@prueba.pe" });
  luis = await signUp({ name: "Luis Soto", email: "luis@prueba.pe" });
  await addReview("r1", ids.p3, ana.user.id, 5, 1);
  await addReview("r2", ids.p3, luis.user.id, 3, 2);
  await addReview("r3", ids.p10, ana.user.id, 4, 3, true);
});

const list = async (qs = "") => (await (await api(`/admin/reviews?${qs}`, { cookie: admin.cookie })).json()) as Page<AdminReview>;
const act = (id: string, what: "hide" | "show") => api(`/admin/reviews/${id}/${what}`, { method: "POST", cookie: admin.cookie, json: {} });
const publicPage = async (cookie?: string) => (await (await api(`/catalog/products/${ids.p3}/reviews`, { cookie })).json()) as ReviewsPage;
const audits = (action: string) => rowsOf(sql`select detail, data from audit_log where action = ${action} order by created_at`);

describe("HU-47: lista de reseñas del panel", () => {
  it("HU-47: lista todas de la más nueva a la más antigua con producto, cliente, estrellas, comentario y estado", async () => {
    const page = await list();
    expect(page).toMatchObject({ total: 3, page: 1, pageSize: 20 });
    expect(page.items.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
    expect(page.items[0]).toMatchObject({
      productName: "Galaxy S23", authorName: "Ana Pérez", authorEmail: "ana@prueba.pe", rating: 5, comment: "Comentario r1", hidden: false,
    });
  });

  it("HU-47: filtra por estado y busca por producto", async () => {
    expect((await list("status=hidden")).items.map((r) => r.id)).toEqual(["r3"]);
    expect((await list("status=visible")).items.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect((await list("q=iphone")).items.map((r) => r.id)).toEqual(["r3"]);
    expect((await api("/admin/reviews?status=otro", { cookie: admin.cookie })).status).toBe(400);
  });
});

describe("HU-47, FR-015: ocultar y mostrar", () => {
  it("HU-47: ocultar saca la reseña de la tienda y del promedio y queda auditado", async () => {
    expect(await publicPage()).toMatchObject({ average: 4, count: 2 });
    const res = await act("r1", "hide");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "r1", hidden: true });
    const after = await publicPage();
    expect(after).toMatchObject({ average: 3, count: 1 });
    expect(after.items.map((r) => r.id)).toEqual(["r2"]);
    const log = await audits("resena_oculta");
    expect(log).toEqual([expect.objectContaining({ detail: expect.stringContaining("Galaxy S23") })]);
    expect(log[0]!.data).toMatchObject({ before: { hidden: false }, after: { hidden: true } });
  });

  it("HU-47: mostrar la devuelve a la tienda y al promedio y queda auditado", async () => {
    await act("r3", "show");
    expect((await rowsOf(sql`select hidden from review where id = 'r3'`))[0]!.hidden).toBe(false);
    expect(await audits("resena_visible")).toHaveLength(1);
  });

  it("HU-47: repetir la misma acción no cambia nada ni duplica la auditoría", async () => {
    await act("r1", "hide");
    expect((await act("r1", "hide")).status).toBe(200);
    expect(await audits("resena_oculta")).toHaveLength(1);
  });

  it("HU-47: una reseña inexistente responde 404", async () => {
    expect((await act("no-existe", "hide")).status).toBe(404);
  });

  it("HU-47: el autor de una reseña oculta la sigue viendo y no puede enviar otra", async () => {
    const { number } = await placeOrder(ana.cookie, [{ productId: ids.p3 }]);
    await deliverOrder(number!);
    await act("r1", "hide");
    const mine = await publicPage(ana.cookie);
    expect(mine.mine).toMatchObject({ id: "r1", hidden: true });
    expect(mine.canReview).toBe(false);
    const again = await api(`/catalog/products/${ids.p3}/reviews`, { method: "POST", cookie: ana.cookie, json: { rating: 1 } });
    expect(again.status).toBe(409);
  });

  it("HU-47: un cliente no accede a la moderación", async () => {
    expect((await api("/admin/reviews", { cookie: ana.cookie })).status).toBe(403);
    expect((await api("/admin/reviews/r1/hide", { method: "POST", cookie: ana.cookie, json: {} })).status).toBe(403);
    expect((await api("/admin/reviews")).status).toBe(401);
  });
});
