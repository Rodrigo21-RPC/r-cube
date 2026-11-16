import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Heart, Search, ShoppingCart, User } from "lucide-react";
import { useSession } from "@web/auth";
import { useCartCount } from "@web/cart/useCart";

/** Encabezado con logo, buscador, cuenta, carrito y lugar para el interruptor de tema (RNF-03). */
export function Header({ themeToggle }: { themeToggle?: React.ReactNode }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const { data: me } = useSession();
  const count = useCartCount();

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/catalogo?q=${encodeURIComponent(term)}` : "/catalogo");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 md:flex-nowrap md:px-6">
        <Link to="/" className="flex items-center gap-2 rounded-xl" aria-label="R Cube, ir al inicio">
          <img src="/img/logo.png" alt="" width={36} height={36} className="size-9 rounded-lg bg-black" />
          <span className="text-lg font-semibold tracking-tight">R Cube</span>
        </Link>

        <div className="ml-auto flex items-center gap-1 md:order-3">
          {themeToggle}
          {me?.role === "administrador" && (
            <Link to="/admin" className="inline-flex h-11 items-center rounded-full px-3 text-sm font-medium text-accent hover:bg-surface">
              Panel
            </Link>
          )}
          <Link
            to={me ? "/cuenta" : "/ingresar"}
            className="inline-flex h-11 items-center gap-2 rounded-full px-3 hover:bg-surface"
          >
            <User aria-hidden className="size-5" />
            <span className="hidden text-sm sm:inline">{me ? me.name.split(" ")[0] : "Ingresar"}</span>
            <span className="sr-only sm:hidden">{me ? "Mi cuenta" : "Ingresar"}</span>
          </Link>
          {me?.role === "cliente" && (
            <Link to="/favoritos" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface" aria-label="Mis favoritos">
              <Heart aria-hidden className="size-5" />
            </Link>
          )}
          <Link
            to="/carrito"
            className="relative inline-flex size-11 items-center justify-center rounded-full hover:bg-surface"
            aria-label={`Carrito, ${count} ${count === 1 ? "unidad" : "unidades"}`}
          >
            <ShoppingCart aria-hidden className="size-5" />
            {count > 0 && (
              <span
                aria-hidden
                className="tabular absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-accent px-1.5 text-center text-xs font-semibold leading-5 text-on-accent"
              >
                {count}
              </span>
            )}
          </Link>
        </div>

        <form role="search" onSubmit={onSearch} className="w-full md:order-2 md:mx-4 md:flex-1">
          <label htmlFor="buscar" className="sr-only">
            Buscar productos
          </label>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
            <input
              id="buscar"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar celulares, laptops, tablets…"
              className="h-11 w-full rounded-full border border-input bg-surface pl-11 pr-4 text-[15px] placeholder:text-muted"
            />
          </div>
        </form>
      </div>
    </header>
  );
}
