import { lazy } from "react";
import type { RouteObject } from "react-router";
import { AdminLayout } from "./AdminLayout";

const Summary = lazy(() => import("./pages/Summary"));
const Products = lazy(() => import("./pages/Products"));
const ProductForm = lazy(() => import("./pages/ProductForm"));
const Taxonomy = lazy(() => import("./pages/Taxonomy"));

/** Rutas del panel /admin, protegidas por AdminLayout (HU-26). */
export const adminRoute: RouteObject = {
  path: "/admin",
  element: <AdminLayout />,
  children: [
    { index: true, element: <Summary /> },
    { path: "productos", element: <Products /> },
    { path: "productos/nuevo", element: <ProductForm /> },
    { path: "productos/:id", element: <ProductForm /> },
    { path: "categorias", element: <Taxonomy /> },
  ],
};
