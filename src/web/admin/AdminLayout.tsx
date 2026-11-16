import { Suspense, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { Toaster } from "sonner";
import {
  BarChart3, ClipboardList, CreditCard, FolderTree, History, LogOut, Menu, MessageSquare, Package, Settings, ShieldAlert, Users, X,
} from "lucide-react";
import { ApiError } from "@web/api";
import { signIn, signOut, useSession } from "@web/auth";
import { ThemeToggle } from "@web/theme/ThemeToggle";
import { LoadingBlock } from "@web/components/States";
import { Button } from "@web/components/ui/button";
import { Field, Input } from "@web/components/ui/form";
import { Card } from "@web/components/ui/misc";

const NAV = [
  { to: "/admin", label: "Resumen", icon: BarChart3, end: true },
  { to: "/admin/productos", label: "Productos", icon: Package },
  { to: "/admin/categorias", label: "Categorías y marcas", icon: FolderTree },
  { to: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/admin/pagos", label: "Pagos por confirmar", icon: CreditCard },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/resenas", label: "Reseñas", icon: MessageSquare },
  { to: "/admin/configuracion", label: "Configuración", icon: Settings },
  { to: "/admin/auditoria", label: "Auditoría", icon: History },
];

/** Ingreso propio del panel (HU-26). */
function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (x) {
      setError(x instanceof ApiError ? x.message : "No pudimos iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-sm">
        <div className="mb-5 flex items-center gap-2">
          <img src="/img/logo.png" alt="" width={36} height={36} className="size-9 rounded-lg bg-black" />
          <h1 className="text-xl font-semibold">Panel de R Cube</h1>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {error && <p role="alert" className="rounded-2xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
          <Field label="Correo">{(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Field label="Contraseña">{(p) => <Input {...p} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
          <Button type="submit" size="lg" disabled={busy}>{busy ? "Ingresando…" : "Ingresar al panel"}</Button>
        </form>
        <p className="mt-4 text-center text-sm"><Link to="/" className="text-accent underline underline-offset-2">Volver a la tienda</Link></p>
      </Card>
    </main>
  );
}

function NoPermission() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <Card className="flex max-w-sm flex-col items-center gap-3 text-center">
        <ShieldAlert aria-hidden className="size-10 text-danger" />
        <h1 className="text-xl font-semibold">No tienes permiso para entrar al panel</h1>
        <p className="text-muted">El panel es solo para administradores de R Cube.</p>
        <Button asChild><Link to="/">Ir a la tienda</Link></Button>
      </Card>
    </main>
  );
}

/** Layout del panel: menú lateral, tema y cierre de sesión; protege las rutas /admin (HU-26). */
export function AdminLayout() {
  const session = useSession();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);

  if (session.isPending) return <main className="p-6"><LoadingBlock /></main>;
  if (!session.data) return <AdminLogin />;
  if (session.data.role !== "administrador") return <NoPermission />;

  async function logout() {
    await signOut();
    navigate("/admin", { replace: true });
  }

  return (
    <div className="flex min-h-dvh bg-canvas text-text">
      <a href="#contenido-admin" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent">
        Saltar al contenido
      </a>
      <aside
        id="menu-admin"
        className={`${menu ? "fixed inset-0 z-40 block" : "hidden"} w-64 shrink-0 border-r border-border bg-canvas p-4 lg:static lg:block`}
        aria-label="Menú del panel"
      >
        <div className="mb-6 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2 font-semibold">
            <img src="/img/logo.png" alt="" width={32} height={32} className="size-8 rounded-lg bg-black" />
            R Cube Admin
          </Link>
          <button type="button" className="lg:hidden" aria-label="Cerrar menú" onClick={() => setMenu(false)}><X aria-hidden className="size-5" /></button>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenu(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] ${isActive ? "bg-accent text-on-accent" : "hover:bg-surface"}`
              }
            >
              <Icon aria-hidden className="size-5" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-8 flex flex-col gap-1 border-t border-border pt-4">
          <Link to="/" className="rounded-xl px-3 py-2 text-[15px] hover:bg-surface">Ver la tienda</Link>
          <button type="button" onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-2 text-left text-[15px] hover:bg-surface">
            <LogOut aria-hidden className="size-5" /> Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 lg:px-8">
          <button type="button" className="lg:hidden" aria-label="Abrir menú" aria-expanded={menu} aria-controls="menu-admin" onClick={() => setMenu(true)}>
            <Menu aria-hidden className="size-6" />
          </button>
          <p className="text-sm text-muted">Hola, {session.data.name.split(" ")[0]}</p>
          <ThemeToggle />
        </header>
        <main id="contenido-admin" className="flex-1 px-4 py-6 lg:px-8">
          <Suspense fallback={<LoadingBlock />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
