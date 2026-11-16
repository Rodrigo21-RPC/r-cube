import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { adminRoute } from "./admin/routes";

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
const Favorites = page(() => import("./pages/Favorites"));
const Addresses = page(() => import("./pages/Addresses"));
const ReceiptPage = page(() => import("./pages/Receipt"));
const Notifications = page(() => import("./pages/Notifications"));
const PhotoCredits = page(() => import("./pages/PhotoCredits"));
const NotFound = page(() => import("./pages/NotFound"));

export const router = createBrowserRouter([
  adminRoute,
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
      { path: "/cuenta/direcciones", element: <Addresses /> },
      { path: "/creditos-fotos", element: <PhotoCredits /> },
      { path: "/favoritos", element: <Favorites /> },
      { path: "/avisos", element: <Notifications /> },
      { path: "/pedidos", element: <Orders /> },
      { path: "/pedidos/:number", element: <OrderDetail /> },
      { path: "/pedidos/:number/comprobante", element: <ReceiptPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
