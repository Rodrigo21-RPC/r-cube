import { Hono } from "hono";
import { requireUser, AppError, type AppEnv } from "../middleware";
import { loadOrderDetail } from "../services/orders";

/** Pedidos del cliente: solo los propios (RN-08). */
export const orderRoutes = new Hono<AppEnv>()
  .use(requireUser)
  .get("/:number", async (c) => {
    const order = await loadOrderDetail(c.get("db"), c.req.param("number"), c.get("user")!.id);
    if (!order) throw new AppError(404, "NOT_FOUND", "No encontramos ese pedido.");
    return c.json(order);
  });
