import { beforeEach, describe, expect, it } from "vitest";
import { api, resetDb, signInAdmin, signUp } from "../helpers";

beforeEach(resetDb);

describe("HU-26, FR-002: el panel exige rol de administrador", () => {
  it("HU-26: sin sesión responde 401 sin datos", async () => {
    const res = await api("/admin/summary");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: expect.objectContaining({ code: "UNAUTHENTICATED" }) });
  });

  it("HU-26: un cliente recibe 403 sin datos", async () => {
    const u = await signUp();
    const res = await api("/admin/summary", { cookie: u.cookie });
    expect(res.status).toBe(403);
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(["error"]);
  });

  it("HU-26: un administrador accede", async () => {
    const a = await signInAdmin();
    expect((await api("/admin/summary", { cookie: a.cookie })).status).toBe(200);
  });
});
