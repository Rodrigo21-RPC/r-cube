import { Suspense } from "react";
import { Link, Outlet } from "react-router";
import { Toaster } from "sonner";
import { Header } from "./Header";
import { LoadingBlock } from "./States";
import { ThemeToggle } from "@web/theme/ThemeToggle";
import { generalInquiryUrl } from "@shared/whatsapp";
import { useStoreContact } from "@web/hooks/useStoreContact";
import { WhatsAppFloat } from "./WhatsAppFloat";

/** Enlace «WhatsApp» del pie; sin número configurado no se muestra (HU-59, FR-038, FR-039). */
function FooterWhatsApp() {
  const { data } = useStoreContact();
  const link = data ? generalInquiryUrl(data.whatsappNumber) : null;
  if (!link) return null;
  return (
    <>
      {" · "}
      <a href={link} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
        WhatsApp
      </a>
    </>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="print:hidden sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Saltar al contenido
      </a>
      <Header themeToggle={<ThemeToggle />} />
      <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6">
        <Suspense fallback={<LoadingBlock />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-border print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-24 pt-6 text-sm text-muted md:flex-row md:justify-between md:px-6 md:pb-6">
          <p>© {new Date().getFullYear()} R Cube. Precios en soles con IGV incluido.</p>
          <p>
            Pagos simulados en modo de prueba: no se cobra dinero real.{" "}
            <Link to="/catalogo" className="text-accent underline underline-offset-2">
              Ver catálogo
            </Link>
            {" · "}
            <Link to="/creditos-fotos" className="text-accent underline underline-offset-2">
              Créditos de las fotos
            </Link>
            <FooterWhatsApp />
          </p>
        </div>
      </footer>
      <WhatsAppFloat />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
