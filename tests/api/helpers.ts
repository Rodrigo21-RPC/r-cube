import { env, exports } from "cloudflare:workers";
import { sql } from "drizzle-orm";
import { createDb, schema } from "@db/client";
import { buildSearchText } from "@shared/search";

export const ORIGIN = "http://localhost";

/** Petición al Worker real dentro de workerd. */
export function api(path: string, init: RequestInit & { cookie?: string; json?: unknown } = {}) {
  const headers = new Headers(init.headers);
  headers.set("origin", ORIGIN);
  if (init.cookie) headers.set("cookie", init.cookie);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.json);
  }
  return exports.default.fetch(`${ORIGIN}/api${path}`, { ...init, headers, body });
}

export function withDb<T>(fn: (db: ReturnType<typeof createDb>["db"]) => Promise<T>): Promise<T> {
  const { db, close } = createDb(env.HYPERDRIVE.connectionString);
  return fn(db).finally(close);
}

export const ids = {
  catPhones: "cat-celulares",
  catLaptops: "cat-laptops",
  brandA: "brand-apple",
  brandB: "brand-samsung",
  p10: "p-stock-10",
  p3: "p-stock-3",
  p0: "p-stock-0",
  pOff: "p-inactivo",
  zone: "zona-centro",
  zoneOff: "zona-inactiva",
};

/** Borra todo y carga un seed mínimo de prueba (research R10). */
export async function resetDb() {
  await withDb(async (db) => {
    await db.execute(sql`TRUNCATE TABLE audit_log, stock_movement, order_event, payment, order_item, orders, cart_item, product_image,
      product, brand, category, delivery_zone, store_settings, session, account, verification,
      rate_limit, "user" RESTART IDENTITY CASCADE`);
    await db.execute(sql`ALTER SEQUENCE order_number_seq RESTART WITH 1`);
    await db.insert(schema.category).values([
      { id: ids.catPhones, name: "Celulares", slug: "celulares", sortOrder: 1 },
      { id: ids.catLaptops, name: "Laptops", slug: "laptops", sortOrder: 2 },
    ]);
    await db.insert(schema.brand).values([
      { id: ids.brandA, name: "Apple", slug: "apple" },
      { id: ids.brandB, name: "Samsung", slug: "samsung" },
    ]);
    const p = (
      id: string,
      name: string,
      brandId: string,
      brandName: string,
      categoryId: string,
      priceCents: number,
      stock: number,
      extra: Partial<typeof schema.product.$inferInsert> = {},
    ) => ({
      id,
      slug: id,
      name,
      brandId,
      categoryId,
      description: `Descripción de ${name} con cámara`,
      specs: [{ label: "RAM", value: "8 GB" }],
      priceCents,
      stock,
      searchText: buildSearchText(name, brandName, `Descripción de ${name} con cámara`),
      ...extra,
    });
    await db.insert(schema.product).values([
      p(ids.p10, "iPhone 15 Pro", ids.brandA, "Apple", ids.catPhones, 499900, 10, {
        compareAtCents: 549900,
        createdAt: new Date("2026-01-03"),
      }),
      p(ids.p3, "Galaxy S23", ids.brandB, "Samsung", ids.catPhones, 299900, 3, {
        createdAt: new Date("2026-01-02"),
      }),
      p(ids.p0, "MacBook Air M1", ids.brandA, "Apple", ids.catLaptops, 399900, 0, {
        createdAt: new Date("2026-01-01"),
      }),
      p(ids.pOff, "Teléfono Retirado", ids.brandB, "Samsung", ids.catPhones, 99900, 5, { active: false }),
    ]);
    await db.insert(schema.productImage).values([
      { id: "img-1", productId: ids.p10, url: "/img/productos/celular-iphone-15-pro.jpg", alt: "iPhone 15 Pro" },
    ]);
    await db.insert(schema.deliveryZone).values([
      { id: ids.zone, name: "Lima Centro", costCents: 1500, sortOrder: 1 },
      { id: ids.zoneOff, name: "Zona cerrada", costCents: 3000, active: false, sortOrder: 2 },
    ]);
    await db.insert(schema.storeSettings).values({
      id: 1,
      whatsappNumber: "51987654321",
      yapeNumber: "987654321",
      plinNumber: "987654322",
      yapeQrUrl: "/img/yape-qr.svg",
      bankName: "Banco de Ejemplo",
      bankHolder: "R Cube S.A.C.",
      bankAccount: "191-0000000-0-00",
      bankCci: "00219100000000000000",
      pickupAddress: "Av. Ejemplo 123, Miraflores, Lima",
      enabledMethods: ["card", "yape_plin", "transfer", "whatsapp"],
    });
  });
}

let counter = 0;

/** Registra un cliente y devuelve su cookie de sesión. */
export async function signUp(overrides: Partial<{ email: string; password: string; name: string }> = {}) {
  counter += 1;
  const email = overrides.email ?? `cliente${counter}@prueba.pe`;
  const password = overrides.password ?? "clave-segura-1";
  const res = await api("/auth/sign-up/email", {
    method: "POST",
    json: { name: overrides.name ?? `Cliente ${counter}`, email, password, phone: "987654321" },
  });
  if (res.status !== 200) throw new Error(`sign-up ${res.status}: ${await res.text()}`);
  return { email, password, cookie: cookieFrom(res), user: ((await res.json()) as { user: { id: string } }).user };
}

export async function signIn(email: string, password: string) {
  return api("/auth/sign-in/email", { method: "POST", json: { email, password } });
}

export function cookieFrom(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

/** Convierte una cuenta en administrador (la 002 tendrá su propio alta). */
export async function makeAdmin(userId: string) {
  await withDb((db) => db.execute(sql`UPDATE "user" SET role = 'administrador' WHERE id = ${userId}`));
}

/** Crea un administrador y devuelve su cookie de sesión (002). */
export async function signInAdmin() {
  const u = await signUp({ name: "Admin Pruebas" });
  await makeAdmin(u.user.id);
  return u;
}

/** Borra todos los objetos del bucket R2 emulado entre pruebas. */
export async function clearR2() {
  let cursor: string | undefined;
  do {
    const list = await env.FOTOS.list({ cursor });
    if (list.objects.length) await env.FOTOS.delete(list.objects.map((o) => o.key));
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
}

export async function rowsOf(q: ReturnType<typeof sql>) {
  return withDb(async (db) => (await db.execute(q)) as unknown as Record<string, unknown>[]);
}
