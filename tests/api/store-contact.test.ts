import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { AdminSettings } from "@shared/admin-types";
import type { StoreContact } from "@shared/types";
import { api, resetDb, rowsOf, signInAdmin } from "./helpers";

const get = async () => (await (await api("/catalog/contact")).json()) as StoreContact;

beforeEach(resetDb); // la tienda de prueba trae el WhatsApp 51987654321

describe("HU-59, FR-039: contacto público de la tienda", () => {
  it("HU-59: es público y devuelve el nombre y el número de WhatsApp solo con dígitos", async () => {
    const res = await api("/catalog/contact");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: "R Cube", whatsappNumber: "51987654321" });
  });

  it("HU-59, FR-040: un número guardado con +, espacios o guiones sale solo con dígitos", async () => {
    await rowsOf(sql`update store_settings set whatsapp_number = '+51 987-000 111' where id = 1`);
    expect((await get()).whatsappNumber).toBe("51987000111");
  });

  it("HU-59, FR-039: un cambio del número en el panel se refleja sin publicar de nuevo", async () => {
    const admin = await signInAdmin();
    const settings = (await (await api("/admin/settings", { cookie: admin.cookie })).json()) as AdminSettings;
    const body = Object.fromEntries(Object.entries(settings).filter(([key]) => key !== "zones"));
    const res = await api("/admin/settings", { method: "PATCH", cookie: admin.cookie, json: { ...body, whatsappNumber: "51912345678" } });
    expect(res.status).toBe(200);
    expect((await get()).whatsappNumber).toBe("51912345678");
  });

  it("HU-59, FR-039: sin número configurado devuelve cadena vacía", async () => {
    await rowsOf(sql`update store_settings set whatsapp_number = '' where id = 1`);
    expect(await get()).toEqual({ name: "R Cube", whatsappNumber: "" });
  });

  it("HU-59, FR-039: sin configuración de tienda devuelve cadena vacía y no falla", async () => {
    await rowsOf(sql`delete from store_settings`);
    const res = await api("/catalog/contact");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: "R Cube", whatsappNumber: "" });
  });

  it("HU-59, FR-039: solo expone esas dos claves, sin datos de pago ni de cuentas", async () => {
    expect(Object.keys(await get()).sort()).toEqual(["name", "whatsappNumber"]);
  });
});
