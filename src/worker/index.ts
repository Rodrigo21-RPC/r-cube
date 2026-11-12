import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { sql } from "drizzle-orm";
import { errorResponse, withContext, type AppEnv } from "./middleware";
import { catalogRoutes } from "./routes/catalog";
import { authRoutes } from "./routes/auth";
import { accountRoutes } from "./routes/account";
import { cartRoutes } from "./routes/cart";

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
  .route("/auth", authRoutes)
  .route("/account", accountRoutes)
  .route("/catalog", catalogRoutes)
  .route("/cart", cartRoutes);

export type AppType = typeof routes;

export default {
  fetch: app.fetch,
  async scheduled(_controller, _env, _ctx) {},
} satisfies ExportedHandler<Env>;
