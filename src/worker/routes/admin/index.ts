import { Hono } from "hono";
import { requireAdmin, type AppEnv } from "../../middleware";
import { summaryRoutes } from "./summary";

/** Sub-router del panel: un único requireAdmin protege todas las rutas /api/admin/* (HU-26, FR-002). */
export const adminRoutes = new Hono<AppEnv>().use(requireAdmin).route("/", summaryRoutes);
