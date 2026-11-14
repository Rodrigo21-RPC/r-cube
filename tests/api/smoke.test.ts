import { describe, expect, it } from "vitest";
import { exports } from "cloudflare:workers";

describe("RNF-10: prueba de humo del Worker con la base", () => {
  it("RNF-10: GET /api/health responde ok tras consultar la base", async () => {
    const res = await exports.default.fetch("http://localhost/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
