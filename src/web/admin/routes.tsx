import { lazy } from "react";
import type { RouteObject } from "react-router";
import { AdminLayout } from "./AdminLayout";

const Summary = lazy(() => import("./pages/Summary"));

/** Rutas del panel /admin, protegidas por AdminLayout (HU-26). */
export const adminRoute: RouteObject = {
  path: "/admin",
  element: <AdminLayout />,
  children: [{ index: true, element: <Summary /> }],
};
