import { Suspense } from "react";
import { Link, Outlet } from "react-router";
import { Toaster } from "sonner";
import { Header } from "./Header";
import { LoadingBlock } from "./States";
import { ThemeToggle } from "@web/theme/ThemeToggle";

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Saltar al contenido
      </a>
      <Header themeToggle={<ThemeToggle />} />
      <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6">
        <Suspense fallback={<LoadingBlock />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted md:flex-row md:justify-between md:px-6">
          <p>© {new Date().getFullYear()} R Cube. Precios en soles con IGV incluido.</p>
          <p>
            Pagos simulados en modo de prueba: no se cobra dinero real.{" "}
            <Link to="/catalogo" className="text-accent hover:underline">
              Ver catálogo
            </Link>
          </p>
        </div>
      </footer>
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
