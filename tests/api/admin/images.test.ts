import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { sql } from "drizzle-orm";
import type { AdminImage, AdminProduct } from "@shared/admin-types";
import type { ProductDetail } from "@shared/types";
import { api, clearR2, ids, resetDb, rowsOf, signInAdmin } from "../helpers";

let admin: Awaited<ReturnType<typeof signInAdmin>>;
beforeEach(async () => {
  await resetDb();
  await clearR2();
  admin = await signInAdmin();
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(64).fill(1)]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(64).fill(2)]);

function upload(productId: string, data: Uint8Array, name = "foto.png", type = "image/png") {
  const form = new FormData();
  form.append("file", new File([data], name, { type }));
  return api(`/admin/products/${productId}/images`, { method: "POST", cookie: admin.cookie, body: form });
}
const product = async (id: string) => (await (await api(`/admin/products/${id}`, { cookie: admin.cookie })).json()) as AdminProduct;

describe("HU-31: fotos de productos en R2", () => {
  it("HU-31: sube una foto válida, la guarda en R2 y se sirve por /api/media", async () => {
    const res = await upload(ids.p3, PNG);
    expect(res.status).toBe(201);
    const img = (await res.json()) as AdminImage;
    expect(img.url).toMatch(/^\/api\/media\/productos\//);
    expect(img).toMatchObject({ alt: "Galaxy S23", uploaded: true });
    const media = await api(img.url.replace(/^\/api/, ""));
    expect(media.status).toBe(200);
    expect(media.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await media.arrayBuffer())).toEqual(PNG);
    expect((await env.FOTOS.list()).objects).toHaveLength(1);
  });

  it("HU-31: rechaza tipos no permitidos y archivos de más de 2 MB", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.7 documento");
    const r1 = await upload(ids.p3, pdf, "doc.jpg", "image/jpeg");
    expect(r1.status).toBe(400);
    expect(((await r1.json()) as { error: { code: string } }).error.code).toBe("INVALID_IMAGE");
    const big = new Uint8Array(2 * 1024 * 1024 + 1);
    big.set([0xff, 0xd8, 0xff, 0xe0]);
    expect((await upload(ids.p3, big, "grande.jpg", "image/jpeg")).status).toBe(400);
    expect((await env.FOTOS.list()).objects).toHaveLength(0);
  });

  it("HU-31, FR-033: máximo 8 fotos por producto (antes 6, ampliado en la feature 004)", async () => {
    for (let i = 0; i < 7; i++) expect((await upload(ids.p10, JPG, "f.jpg", "image/jpeg")).status, `foto ${i + 2}`).toBe(201); // ya tenía 1
    const res = await upload(ids.p10, JPG, "f.jpg", "image/jpeg");
    expect(res.status).toBe(409);
    const error = ((await res.json()) as { error: { code: string; message: string } }).error;
    expect(error).toMatchObject({ code: "MAX_IMAGES", message: "Máximo 8 fotos por producto" });
    expect((await product(ids.p10)).images).toHaveLength(8);
  });

  it("HU-31: principal, orden y texto alternativo se reflejan en la tienda", async () => {
    const a = (await (await upload(ids.p3, PNG)).json()) as AdminImage;
    const b = (await (await upload(ids.p3, JPG, "b.jpg", "image/jpeg")).json()) as AdminImage;
    await api(`/admin/products/${ids.p3}/images/${b.id}/main`, { method: "POST", cookie: admin.cookie, json: {} });
    let detail = (await (await api(`/catalog/products/${ids.p3}`)).json()) as ProductDetail;
    expect(detail.images.map((i) => i.url)).toEqual([b.url, a.url]);
    await api(`/admin/products/${ids.p3}/images/${b.id}/move`, { method: "POST", cookie: admin.cookie, json: { direction: "down" } });
    await api(`/admin/products/${ids.p3}/images/${a.id}`, { method: "PATCH", cookie: admin.cookie, json: { alt: "Galaxy S23 de frente" } });
    detail = (await (await api(`/catalog/products/${ids.p3}`)).json()) as ProductDetail;
    expect(detail.images).toEqual([{ url: a.url, alt: "Galaxy S23 de frente" }, { url: b.url, alt: "Galaxy S23" }]);
  });

  it("HU-31: borrar quita el objeto de R2 y la siguiente pasa a principal; una foto de demostración no toca archivos estáticos", async () => {
    const a = (await (await upload(ids.p3, PNG)).json()) as AdminImage;
    const b = (await (await upload(ids.p3, JPG, "b.jpg", "image/jpeg")).json()) as AdminImage;
    expect((await api(`/admin/products/${ids.p3}/images/${a.id}`, { method: "DELETE", cookie: admin.cookie })).status).toBe(200);
    expect((await env.FOTOS.list()).objects).toHaveLength(1);
    expect((await product(ids.p3)).images.map((i) => [i.id, i.position])).toEqual([[b.id, 0]]);
    const demo = (await product(ids.p10)).images[0]!;
    expect(demo.uploaded).toBe(false);
    expect((await api(`/admin/products/${ids.p10}/images/${demo.id}`, { method: "DELETE", cookie: admin.cookie })).status).toBe(200);
    expect((await product(ids.p10)).images).toEqual([]);
    expect((await rowsOf(sql`select action from audit_log where action = 'foto'`)).length).toBeGreaterThanOrEqual(4);
  });
});
