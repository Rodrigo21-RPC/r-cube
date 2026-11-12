import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { sql } from "drizzle-orm";
import { errorResponse, withContext, type AppEnv } from "./middleware";

const app = new Hono<AppEnv>().basePath("/api");

app.use("*", secureHeaders());
app.use("*", withContext);
app.onError((err, c) => errorResponse(c, err));
app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Recurso no encontrado." } }, 404));

const routes = app
  .get("/health", async (c) => {
    await c.get("db").execute(sql`select 1`);
    return c.json({ ok: true as const });
  })
  .on(["GET", "POST"], "/auth/*", (c) => c.get("auth").handler(c.req.raw));

export type AppType = typeof routes;

export default {
  fetch: app.fetch,
  async scheduled(_controller, _env, _ctx) {},
} satisfies ExportedHandler<Env>;
