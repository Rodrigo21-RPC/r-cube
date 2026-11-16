import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { ids, resetDb, rowsOf, withDb } from "./helpers";

beforeEach(resetDb);

/** Devuelve el nombre de la restricción que rechazó la sentencia, o «sin error». */
async function violation(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (e) {
    const cause = (e as { cause?: { constraint_name?: string; message?: string } }).cause;
    return cause?.constraint_name ?? cause?.message ?? String(e);
  }
  return "sin error";
}

const insertImage = (origin: string, author = "", license = "", url = "") =>
  withDb((db) =>
    db.execute(sql`insert into product_image (id, product_id, url, alt, position, origin, credit_author, credit_license, credit_url)
      values (${crypto.randomUUID()}, ${ids.p3}, '/img/productos/galeria/x.webp', 'Foto', 0, ${origin}, ${author}, ${license}, ${url})`),
  );

describe("HU-58, FR-021: crédito de las fotos en la base de datos", () => {
  it("FR-021: una foto externa sin autor, licencia o enlace no se puede guardar", async () => {
    expect(await violation(() => insertImage("externa", "", "CC BY 4.0", "https://commons.wikimedia.org/wiki/File:X.jpg"))).toBe("product_image_credit_required");
    expect(await violation(() => insertImage("externa", "Ana", "", "https://commons.wikimedia.org/wiki/File:X.jpg"))).toBe("product_image_credit_required");
    expect(await violation(() => insertImage("externa", "Ana", "CC BY 4.0", ""))).toBe("product_image_credit_required");
    expect(await rowsOf(sql`select 1 from product_image where product_id = ${ids.p3}`)).toEqual([]);
  });

  it("FR-021: una foto externa con los tres datos sí se guarda", async () => {
    expect(await violation(() => insertImage("externa", "Ana Pérez", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:X.jpg"))).toBe("sin error");
  });

  it("FR-021: el origen solo puede ser subida, proyecto, externa o tarjeta", async () => {
    expect(await violation(() => insertImage("otra"))).toBe("product_image_origin_valid");
    for (const origin of ["subida", "proyecto", "tarjeta"]) expect(await violation(() => insertImage(origin)), origin).toBe("sin error");
  });

  it("HU-31: una foto insertada sin origen (la subida del panel) toma «subida»", async () => {
    await withDb((db) =>
      db.execute(sql`insert into product_image (id, product_id, url, alt, position) values ('i-sin-origen', ${ids.p3}, '/api/media/x.png', 'Foto', 0)`),
    );
    expect(await rowsOf(sql`select origin, credit_author, credit_license, credit_url from product_image where id = 'i-sin-origen'`)).toEqual([
      { origin: "subida", credit_author: "", credit_license: "", credit_url: "" },
    ]);
  });
});

describe("HU-56, FR-014: frase y destacados en la base de datos", () => {
  it("FR-014: un producto nuevo queda sin frase y sin destacados", async () => {
    expect(await rowsOf(sql`select tagline, highlights from product where id = ${ids.p3}`)).toEqual([{ tagline: "", highlights: [] }]);
  });

  it("FR-014: la frase admite 90 caracteres y rechaza 91", async () => {
    const set = (n: number) => withDb((db) => db.execute(sql`update product set tagline = ${"x".repeat(n)} where id = ${ids.p3}`));
    expect(await violation(() => set(90))).toBe("sin error");
    expect(await violation(() => set(91))).toBe("product_tagline_max");
  });

  it("FR-014: los destacados admiten una lista de hasta 5 y rechazan 6 o algo que no es lista", async () => {
    const set = (v: unknown) => withDb((db) => db.execute(sql`update product set highlights = ${JSON.stringify(v)}::jsonb where id = ${ids.p3}`));
    expect(await violation(() => set(["a", "b", "c", "d", "e"]))).toBe("sin error");
    expect(await violation(() => set(["a", "b", "c", "d", "e", "f"]))).toBe("product_highlights_valid");
    expect(await violation(() => set({ a: 1 }))).toBe("product_highlights_valid");
  });
});
