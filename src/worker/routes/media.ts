import { Hono } from "hono";
import type { AppEnv } from "../middleware";

/** Fotos subidas al panel, servidas desde R2 con caché larga: la clave nunca se reutiliza (HU-31). */
export const mediaRoutes = new Hono<AppEnv>().get("/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/api\/media\//, ""));
  if (!key.startsWith("productos/") || key.includes("..")) return c.json({ error: { code: "NOT_FOUND", message: "No encontrado." } }, 404);
  const obj = await c.env.FOTOS.get(key);
  if (!obj) return c.json({ error: { code: "NOT_FOUND", message: "No encontrado." } }, 404);
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
});
