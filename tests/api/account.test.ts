import { beforeEach, describe, expect, it } from "vitest";
import type { Me } from "@shared/types";
import { api, resetDb, signUp } from "./helpers";

beforeEach(resetDb);

describe("HU-09: perfil del cliente", () => {
  it("HU-09: sin sesión responde 401", async () => {
    expect((await api("/account/me")).status).toBe(401);
  });

  it("HU-09: edita nombre, teléfono y dirección; el correo no cambia", async () => {
    const u = await signUp({ email: "perfil@prueba.pe" });
    const res = await api("/account/me", {
      method: "PATCH",
      cookie: u.cookie,
      json: {
        name: "Nombre Nuevo",
        phone: "912345678",
        email: "otro@prueba.pe",
        address: { line: "Av. Arequipa 100", district: "Lince", reference: "Frente al parque" },
      },
    });
    expect(res.status).toBe(200);
    const me = (await (await api("/account/me", { cookie: u.cookie })).json()) as Me;
    expect(me).toMatchObject({
      name: "Nombre Nuevo",
      phone: "912345678",
      email: "perfil@prueba.pe",
      address: { line: "Av. Arequipa 100", district: "Lince", reference: "Frente al parque" },
    });
  });

  it("HU-09: datos inválidos dan error por campo", async () => {
    const u = await signUp();
    const res = await api("/account/me", {
      method: "PATCH",
      cookie: u.cookie,
      json: { name: "A", phone: "123", address: { line: "", district: "", reference: "" } },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { fields: Record<string, string> } };
    expect(Object.keys(body.error.fields)).toEqual(expect.arrayContaining(["name", "phone"]));
  });
});
