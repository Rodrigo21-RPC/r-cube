import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { sql } from "drizzle-orm";
import { createDb } from "@db/client";
import { errorResponse, withContext, type AppEnv } from "./middleware";
import { catalogRoutes } from "./routes/catalog";
import { authRoutes } from "./routes/auth";
import { accountRoutes } from "./routes/account";
import { cartRoutes } from "./routes/cart";
import { checkoutRoutes } from "./routes/checkout";
import { orderRoutes } from "./routes/orders";
import { adminRoutes } from "./routes/admin";
import { mediaRoutes } from "./routes/media";
import { expirePendingOrders } from "./cron";

const app = new Hono<AppEnv>().basePath("/api");

app.use("*", secureHeaders());
app.use("*", withContext);
app.onError((err, c) => errorResponse(c, err));
app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Recurso no encontrado." } }, 404));

app
  .get("/health", async (c) => {
    await c.get("db").execute(sql`select 1`);
    return c.json({ ok: true as const });
  })
  .route("/auth", authRoutes)
  .route("/account", accountRoutes)
  .route("/catalog", catalogRoutes)
  .route("/cart", cartRoutes)
  .route("/checkout", checkoutRoutes)
  .route("/orders", orderRoutes)
  .route("/admin", adminRoutes)
  .route("/media", mediaRoutes);

export default {
  fetch: app.fetch,
  /** Cron horario: vence los pedidos impagos de más de 24 h (RN-12). */
  async scheduled(_controller, env, ctx) {
    const { db, close } = createDb(env.HYPERDRIVE.connectionString);
    ctx.waitUntil(expirePendingOrders(db).finally(close));
  },
} satisfies ExportedHandler<Env>;
