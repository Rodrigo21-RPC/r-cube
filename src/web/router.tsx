import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";

const page = (load: () => Promise<{ default: React.ComponentType }>) => lazy(load);

const Home = page(() => import("./pages/Home"));
const Catalog = page(() => import("./pages/Catalog"));
const Product = page(() => import("./pages/Product"));
const Cart = page(() => import("./pages/Cart"));
const Checkout = page(() => import("./pages/Checkout"));
const Confirmation = page(() => import("./pages/Confirmation"));
const Login = page(() => import("./pages/Login"));
const Register = page(() => import("./pages/Register"));
const Account = page(() => import("./pages/Account"));
const Orders = page(() => import("./pages/Orders"));
const OrderDetail = page(() => import("./pages/OrderDetail"));
const NotFound = page(() => import("./pages/NotFound"));

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/catalogo", element: <Catalog /> },
      { path: "/producto/:slug", element: <Product /> },
      { path: "/carrito", element: <Cart /> },
      { path: "/checkout", element: <Checkout /> },
      { path: "/pedido/:number/confirmacion", element: <Confirmation /> },
      { path: "/ingresar", element: <Login /> },
      { path: "/registro", element: <Register /> },
      { path: "/cuenta", element: <Account /> },
      { path: "/pedidos", element: <Orders /> },
      { path: "/pedidos/:number", element: <OrderDetail /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
