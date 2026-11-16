import { Hono } from "hono";
import { requireAdmin, type AppEnv } from "../../middleware";
import { summaryRoutes } from "./summary";
import { productImageRoutes, productRoutes } from "./products";
import { taxonomyRoutes } from "./taxonomy";
import { stockRoutes } from "./stock";
import { adminOrderRoutes } from "./orders";
import { paymentRoutes } from "./payments";
import { settingsRoutes } from "./settings";
import { customerRoutes } from "./customers";
import { auditRoutes } from "./audit";
import { variantRoutes } from "./variants";
import { reviewAdminRoutes } from "./reviews";
import { couponAdminRoutes } from "./coupons";

/** Sub-router del panel: un único requireAdmin protege todas las rutas /api/admin/* (HU-26, FR-002). */
export const adminRoutes = new Hono<AppEnv>().use(requireAdmin).route("/", summaryRoutes)
  .route("/", productRoutes)
  .route("/", productImageRoutes)
  .route("/", taxonomyRoutes)
  .route("/", stockRoutes)
  .route("/", adminOrderRoutes)
  .route("/", paymentRoutes)
  .route("/", settingsRoutes)
  .route("/", customerRoutes)
  .route("/", auditRoutes)
  .route("/", variantRoutes)
  .route("/", reviewAdminRoutes)
  .route("/", couponAdminRoutes);
