import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { CatalogPage } from "@shared/types";
import { api, resetDb, withDb } from "./helpers";

const LIMIT_MS = 300;

beforeAll(async () => {
  await resetDb();
  // 1 000 productos activos repartidos en 2 categorías y 2 marcas (SC-008).
  await withDb((db) =>
    db.execute(sql`insert into product (id, slug, name, brand_id, category_id, description, price_cents, stock, search_text, created_at)
      select 'vol-' || g, 'vol-' || g, 'Equipo de prueba ' || g,
        case when g % 2 = 0 then 'brand-apple' else 'brand-samsung' end,
        case when g % 3 = 0 then 'cat-laptops' else 'cat-celulares' end,
        'Descripción con cámara y batería ' || g, 10000 + g * 37, g % 7,
        'equipo de prueba ' || g || ' descripcion con camara y bateria',
        now() - make_interval(mins => g)
      from generate_series(1, 1000) g`),
  );
  await api("/catalog/products"); // calienta el Worker (el arranque en frío no cuenta)
});

async function timed(path: string) {
  const t = performance.now();
  const res = await api(path);
  const body = (await res.json()) as CatalogPage;
  return { ms: performance.now() - t, body, status: res.status };
}

describe("SC-008, RNF-04: catálogo con 1 000 productos", () => {
  it.each([
    "/catalog/products",
    "/catalog/products?q=camara&sort=relevance",
    "/catalog/products?category=celulares&brand=apple&min=100&max=300&available=1&sort=price_desc&page=3",
  ])("SC-008: %s responde en menos de 300 ms", async (path) => {
    const runs = [await timed(path), await timed(path), await timed(path)];
    const best = Math.min(...runs.map((r) => r.ms));
    expect(runs[0]!.status).toBe(200);
    expect(runs[0]!.body.items.length).toBeGreaterThan(0);
    expect(best).toBeLessThan(LIMIT_MS);
  });
});
