import { lazy } from "react";
import type { RouteObject } from "react-router";
import { AdminLayout } from "./AdminLayout";

const Summary = lazy(() => import("./pages/Summary"));
const Products = lazy(() => import("./pages/Products"));
const ProductForm = lazy(() => import("./pages/ProductForm"));
const Taxonomy = lazy(() => import("./pages/Taxonomy"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Payments = lazy(() => import("./pages/Payments"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerDetail = lazy(() => import("./pages/CustomerDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const Audit = lazy(() => import("./pages/Audit"));

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
    { path: "pedidos", element: <Orders /> },
    { path: "pedidos/:number", element: <OrderDetail /> },
    { path: "pagos", element: <Payments /> },
    { path: "clientes", element: <Customers /> },
    { path: "clientes/:id", element: <CustomerDetail /> },
    { path: "configuracion", element: <Settings /> },
    { path: "auditoria", element: <Audit /> },
  ],
};
