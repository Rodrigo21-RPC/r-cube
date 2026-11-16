import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { Review, ReviewsPage } from "@shared/types";
import { api, deliverOrder, ids, placeOrder, resetDb, rowsOf, signUp, withDb } from "./helpers";

let u: Awaited<ReturnType<typeof signUp>>;

beforeEach(async () => {
  await resetDb();
  u = await signUp({ name: "Mateo Quispe" });
});

const slug = ids.p3;
const post = (cookie: string | undefined, json: unknown, product = slug) =>
  api(`/catalog/products/${product}/reviews`, { method: "POST", cookie, json });
const get = async (qs = "", cookie?: string) => (await (await api(`/catalog/products/${slug}/reviews${qs}`, { cookie })).json()) as ReviewsPage;
const codeOf = async (res: Response) => ((await res.json()) as { error: { code: string; fields?: Record<string, string> } }).error;

/** Deja al cliente con el Galaxy S23 en un pedido Entregado. */
async function delivered(cookie: string) {
  const { number } = await placeOrder(cookie, [{ productId: ids.p3 }]);
  await deliverOrder(number!);
}

describe("HU-46, RN-09: quién puede reseñar", () => {
  it("HU-46: un cliente con el producto en un pedido Entregado reseña y ve su nombre abreviado", async () => {
    await delivered(u.cookie);
    const res = await post(u.cookie, { rating: 4, comment: "Muy buen celular" });
    expect(res.status).toBe(201);
    expect((await res.json()) as Review).toMatchObject({ rating: 4, comment: "Muy buen celular", authorName: "Mateo Q." });
  });

  it("RN-09: sin compra o con el pedido en otro estado responde 403 NOT_DELIVERED", async () => {
    const none = await post(u.cookie, { rating: 5 });
    expect(none.status).toBe(403);
    expect((await codeOf(none)).code).toBe("NOT_DELIVERED");
    await placeOrder(u.cookie, [{ productId: ids.p3 }], { payment: { method: "card", cardNumber: "4111111111111111", expMonth: 12, expYear: 2030, cvv: "123" } });
    expect((await post(u.cookie, { rating: 5 })).status).toBe(403); // Pagado, no Entregado
    expect(await rowsOf(sql`select 1 from review`)).toEqual([]);
  });

  it("RN-09: el pedido de otro cliente no da derecho a reseñar", async () => {
    const other = await signUp({ name: "Lucía Huamán" });
    await delivered(other.cookie);
    expect((await post(u.cookie, { rating: 5 })).status).toBe(403);
  });

  it("HU-46: sin sesión responde 401", async () => {
    expect((await post(undefined, { rating: 5 })).status).toBe(401);
  });

  it("HU-46: una reseña por producto y cliente, aunque lo haya comprado dos veces", async () => {
    await delivered(u.cookie);
    await withDb((db) => db.execute(sql`update product set stock = 10 where id = ${ids.p3}`));
    await delivered(u.cookie);
    expect((await post(u.cookie, { rating: 5 })).status).toBe(201);
    const again = await post(u.cookie, { rating: 1 });
    expect(again.status).toBe(409);
    expect((await codeOf(again)).code).toBe("ALREADY_REVIEWED");
    expect(await rowsOf(sql`select 1 from review`)).toHaveLength(1);
  });

  it("HU-46: dos envíos simultáneos dejan una sola reseña (uno 201 y otro 409)", async () => {
    await delivered(u.cookie);
    const results = await Promise.all([post(u.cookie, { rating: 5 }), post(u.cookie, { rating: 4 })]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await rowsOf(sql`select 1 from review`)).toHaveLength(1);
  });
});

describe("HU-46, FR-013, FR-033: validación", () => {
  beforeEach(() => delivered(u.cookie));

  it("la calificación debe ser un entero de 1 a 5", async () => {
    for (const rating of [0, 6, 2.5, "5", undefined]) {
      const res = await post(u.cookie, { rating });
      expect(res.status, String(rating)).toBe(400);
      expect((await codeOf(res)).fields).toHaveProperty("rating");
    }
  });

  it("el comentario admite hasta 1000 caracteres, es opcional y se recorta", async () => {
    const long = await post(u.cookie, { rating: 3, comment: "x".repeat(1001) });
    expect(long.status).toBe(400);
    expect((await codeOf(long)).fields).toHaveProperty("comment");
    const ok = await post(u.cookie, { rating: 3, comment: "   " });
    expect(ok.status).toBe(201);
    expect(((await ok.json()) as Review).comment).toBeNull();
  });

  it("producto inexistente o inactivo responde 404", async () => {
    expect((await post(u.cookie, { rating: 5 }, "no-existe")).status).toBe(404);
    expect((await post(u.cookie, { rating: 5 }, ids.pOff)).status).toBe(404);
  });
});

describe("HU-46: lista, promedio y estado del cliente", () => {
  async function seedReviews() {
    const names = ["Ana Pérez", "Luis Soto", "Rosa Díaz", "Pedro Vega", "Carla Ruiz", "Iván Mora", "Sofía León"];
    const ratings = [5, 4, 4, 3, 5, 4, 2];
    for (const [i, name] of names.entries()) {
      const c = await signUp({ name });
      await withDb((db) =>
        db.execute(sql`insert into review (id, product_id, user_id, rating, comment, hidden, created_at)
          values (${`r${i}`}, ${ids.p3}, ${c.user.id}, ${ratings[i]!}, ${`Comentario ${i}`}, ${i === 6}, now() - ${i} * interval '1 hour')`),
      );
    }
  }

  it("el público ve promedio con un decimal y cantidad solo de las visibles, de 5 en 5 y de la más nueva a la más antigua", async () => {
    await seedReviews();
    const p1 = await get();
    expect(p1).toMatchObject({ average: 4.2, count: 6, total: 6, page: 1, pageSize: 5 }); // 25 / 6 = 4,17
    expect(p1.items.map((r) => r.comment)).toEqual(["Comentario 0", "Comentario 1", "Comentario 2", "Comentario 3", "Comentario 4"]);
    expect(p1.items[0]!.authorName).toBe("Ana P.");
    const p2 = await get("?page=2");
    expect(p2.items.map((r) => r.comment)).toEqual(["Comentario 5"]);
    expect(p1).not.toHaveProperty("mine");
    expect(p1).not.toHaveProperty("canReview");
  });

  it("sin reseñas el promedio es null", async () => {
    expect(await get()).toMatchObject({ average: null, count: 0, items: [] });
  });

  it("con sesión trae su reseña (incluso oculta) y si puede reseñar con el motivo", async () => {
    expect(await get("", u.cookie)).toMatchObject({ mine: null, canReview: false, reviewBlockedReason: expect.stringContaining("después de recibirlo") });
    await delivered(u.cookie);
    expect(await get("", u.cookie)).toMatchObject({ mine: null, canReview: true });
    await post(u.cookie, { rating: 5, comment: "Excelente" });
    await withDb((db) => db.execute(sql`update review set hidden = true`));
    const after = await get("", u.cookie);
    expect(after).toMatchObject({ canReview: false, reviewBlockedReason: expect.stringContaining("Ya reseñaste"), count: 0, average: null });
    expect(after.mine).toMatchObject({ rating: 5, comment: "Excelente", hidden: true });
  });

  it("el comentario se devuelve como texto, sin interpretar HTML", async () => {
    await delivered(u.cookie);
    await post(u.cookie, { rating: 5, comment: "<img src=x onerror=alert(1)>" });
    expect((await get()).items[0]!.comment).toBe("<img src=x onerror=alert(1)>");
  });

  it("producto inexistente responde 404", async () => {
    expect((await api("/catalog/products/no-existe/reviews")).status).toBe(404);
  });
});
