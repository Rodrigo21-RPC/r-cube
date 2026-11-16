import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { AdminProduct } from "@shared/admin-types";
import { api, ids, resetDb, rowsOf, signInAdmin, signUp } from "../helpers";

let admin: Awaited<ReturnType<typeof signInAdmin>>;
beforeEach(async () => {
  await resetDb();
  admin = await signInAdmin();
});

const base = {
  name: "Auriculares de prueba",
  brandId: ids.brandB,
  categoryId: ids.catPhones,
  description: "Auriculares para pruebas",
  specs: [{ label: "Tipo", value: "Inalámbricos" }],
  priceCents: 25000,
  compareAtCents: null,
  stock: 5,
  active: true,
};
const create = (body: Record<string, unknown>, cookie = admin.cookie) => api("/admin/products", { method: "POST", cookie, json: body });
const edit = (id: string, body: Record<string, unknown>, cookie = admin.cookie) => api(`/admin/products/${id}`, { method: "PATCH", cookie, json: body });
const fieldsOf = async (res: Response) => ((await res.json()) as { error: { code: string; fields: Record<string, string> } }).error;
const row = async (id: string) => (await rowsOf(sql`select tagline, highlights, search_text from product where id = ${id}`))[0]!;

/** Datos actuales del producto de prueba, para editarlo con el mismo cuerpo que envía el formulario. */
async function current(id: string) {
  const p = (await (await api(`/admin/products/${id}`, { cookie: admin.cookie })).json()) as AdminProduct;
  return { name: p.name, brandId: p.brandId, categoryId: p.categoryId, description: p.description, specs: p.specs, priceCents: p.priceCents, compareAtCents: p.compareAtCents, active: p.active };
}

describe("HU-57, FR-014, FR-018: crear y editar la frase y los destacados", () => {
  it("HU-57: crear con frase y destacados responde 201 y los devuelve", async () => {
    const res = await create({ ...base, tagline: "Sonido que te envuelve", highlights: ["Cancelación de ruido", "Hasta 30 h de batería", "Estuche de carga"] });
    expect(res.status).toBe(201);
    const p = (await res.json()) as AdminProduct;
    expect(p.tagline).toBe("Sonido que te envuelve");
    expect(p.highlights).toEqual(["Cancelación de ruido", "Hasta 30 h de batería", "Estuche de carga"]);
  });

  it("HU-57: crear sin los campos los deja vacíos", async () => {
    const p = (await (await create(base)).json()) as AdminProduct;
    expect(p.tagline).toBe("");
    expect(p.highlights).toEqual([]);
  });

  it("HU-57, FR-018: un PATCH los cambia, y uno que los omite los conserva", async () => {
    await edit(ids.p3, { ...(await current(ids.p3)), tagline: "Frase nueva", highlights: ["Uno", "Dos"] });
    expect(await row(ids.p3)).toMatchObject({ tagline: "Frase nueva", highlights: ["Uno", "Dos"] });
    const res = await edit(ids.p3, { ...(await current(ids.p3)), description: "Otra descripción" });
    expect(res.status).toBe(200);
    expect(await row(ids.p3)).toMatchObject({ tagline: "Frase nueva", highlights: ["Uno", "Dos"] });
  });

  it("HU-57, FR-018: vaciar la frase y los destacados desde el formulario los quita", async () => {
    await edit(ids.p3, { ...(await current(ids.p3)), tagline: "Frase", highlights: ["Uno"] });
    await edit(ids.p3, { ...(await current(ids.p3)), tagline: "", highlights: [] });
    expect(await row(ids.p3)).toMatchObject({ tagline: "", highlights: [] });
  });

  it("HU-57, FR-018: se recortan los espacios y se descartan los destacados vacíos", async () => {
    const p = (await (await create({ ...base, tagline: "  Frase con espacios  ", highlights: ["  Uno ", "", "   ", "Dos", "Tres", "Cuatro", "Cinco"] })).json()) as AdminProduct;
    expect(p.tagline).toBe("Frase con espacios");
    expect(p.highlights).toEqual(["Uno", "Dos", "Tres", "Cuatro", "Cinco"]); // 7 enviados, 5 reales
  });

  it("HU-57, FR-016: un texto con símbolos de HTML se guarda tal cual", async () => {
    const p = (await (await create({ ...base, tagline: "<b>hola</b>", highlights: ["<img src=x onerror=alert(1)>"] })).json()) as AdminProduct;
    expect(p.tagline).toBe("<b>hola</b>");
    expect(p.highlights).toEqual(["<img src=x onerror=alert(1)>"]);
  });
});

describe("HU-57, FR-018: validación con mensajes por campo (no se guarda nada)", () => {
  it("la frase de 90 caracteres se acepta y la de 91 responde «La frase no puede pasar de 90 caracteres»", async () => {
    expect((await create({ ...base, tagline: "x".repeat(90) })).status).toBe(201);
    const res = await create({ ...base, name: "Otro producto", tagline: "x".repeat(91) });
    expect(res.status).toBe(400);
    const error = await fieldsOf(res);
    expect(error.code).toBe("VALIDATION");
    expect(error.fields.tagline).toBe("La frase no puede pasar de 90 caracteres");
    expect(await rowsOf(sql`select 1 from product where name = 'Otro producto'`)).toEqual([]);
  });

  it("un sexto destacado responde «Máximo 5 destacados»", async () => {
    const res = await create({ ...base, highlights: ["a", "b", "c", "d", "e", "f"] });
    expect(res.status).toBe(400);
    expect((await fieldsOf(res)).fields.highlights).toBe("Máximo 5 destacados");
  });

  it("un destacado de 61 caracteres responde «Cada destacado admite hasta 60 caracteres» en su posición", async () => {
    const res = await create({ ...base, highlights: ["ok", "ok", "x".repeat(61)] });
    expect(res.status).toBe(400);
    expect((await fieldsOf(res)).fields["highlights.2"]).toBe("Cada destacado admite hasta 60 caracteres");
    expect((await create({ ...base, name: "Con 60", highlights: ["x".repeat(60)] })).status).toBe(201);
  });

  it("con un error al editar no cambia nada del producto", async () => {
    await edit(ids.p3, { ...(await current(ids.p3)), tagline: "Frase buena", highlights: ["Uno"] });
    const res = await edit(ids.p3, { ...(await current(ids.p3)), description: "No debe guardarse", tagline: "x".repeat(91) });
    expect(res.status).toBe(400);
    expect(await row(ids.p3)).toMatchObject({ tagline: "Frase buena", highlights: ["Uno"] });
    expect((await rowsOf(sql`select description from product where id = ${ids.p3}`))[0]!.description).not.toBe("No debe guardarse");
  });
});

describe("HU-57, FR-019, HU-42: auditoría de la frase y los destacados", () => {
  it("cambiar solo la frase y los destacados escribe una entrada «Frase y destacados de X actualizados» con antes y después", async () => {
    await edit(ids.p3, { ...(await current(ids.p3)), tagline: "Primera", highlights: ["A"] });
    await rowsOf(sql`delete from audit_log`);
    await edit(ids.p3, { ...(await current(ids.p3)), tagline: "Segunda", highlights: ["B", "C"] });
    const logs = await rowsOf(sql`select action, detail, data from audit_log order by created_at`);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      action: "producto_editado",
      detail: "Frase y destacados de Galaxy S23 actualizados",
      data: { before: { tagline: "Primera", highlights: ["A"] }, after: { tagline: "Segunda", highlights: ["B", "C"] } },
    });
  });

  it("si cambian también el precio hay dos entradas: precio_cambiado y producto_editado", async () => {
    await rowsOf(sql`delete from audit_log`);
    await edit(ids.p3, { ...(await current(ids.p3)), priceCents: 123400, tagline: "Con precio nuevo", highlights: ["Oferta"] });
    const actions = (await rowsOf(sql`select action from audit_log order by action`)).map((r) => r.action);
    expect(actions).toEqual(["precio_cambiado", "producto_editado"]);
  });

  it("una edición sin cambiar la frase ni los destacados no agrega la entrada de destacados", async () => {
    await edit(ids.p3, { ...(await current(ids.p3)), tagline: "Fija", highlights: ["X"] });
    await rowsOf(sql`delete from audit_log`);
    await edit(ids.p3, { ...(await current(ids.p3)), description: "Solo la descripción", tagline: "Fija", highlights: ["X"] });
    const details = (await rowsOf(sql`select detail from audit_log`)).map((r) => r.detail as string);
    expect(details.some((d) => d.startsWith("Frase y destacados"))).toBe(false);
  });
});

describe("HU-57, FR-017, FR-020: búsqueda sin cambios y permisos", () => {
  it("editar la frase y los destacados no cambia search_text", async () => {
    const before = (await row(ids.p3)).search_text;
    await edit(ids.p3, { ...(await current(ids.p3)), tagline: "Fulgor cuántico", highlights: ["Eterna"] });
    expect((await row(ids.p3)).search_text).toBe(before);
  });

  it("sin sesión responde 401 y con un cliente 403, sin cambiar nada", async () => {
    const body = { ...base, tagline: "No debe quedar", highlights: ["No"] };
    expect((await api("/admin/products", { method: "POST", json: body })).status).toBe(401);
    const customer = await signUp();
    expect((await create(body, customer.cookie)).status).toBe(403);
    expect((await edit(ids.p3, { ...(await current(ids.p3)), tagline: "No debe quedar" }, customer.cookie)).status).toBe(403);
    expect((await row(ids.p3)).tagline).toBe("");
    expect(await rowsOf(sql`select 1 from product where name = ${base.name}`)).toEqual([]);
  });
});
