import { useLocation } from "react-router";
import { MessageCircle } from "lucide-react";
import { generalInquiryUrl } from "@shared/whatsapp";
import { useStoreContact } from "@web/hooks/useStoreContact";

/** Pantallas donde el botón flotante no aparece: el checkout y el comprobante (HU-59, FR-038). */
const hidden = (pathname: string) => pathname.startsWith("/checkout") || pathname.endsWith("/comprobante");

/**
 * Botón flotante «Escríbenos por WhatsApp» para consultas generales (HU-59). Queda por debajo de la vista ampliada de
 * fotos, no se imprime y sin número configurado no se muestra.
 */
export function WhatsAppFloat() {
  const { pathname } = useLocation();
  const { data } = useStoreContact();
  const link = data ? generalInquiryUrl(data.whatsappNumber) : null;
  if (!link || hidden(pathname)) return null;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-4 right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-whatsapp px-4 font-medium text-on-whatsapp shadow-lg transition hover:brightness-110 print:hidden md:px-5"
    >
      <MessageCircle aria-hidden className="size-6 shrink-0" />
      <span className="hidden md:inline">Escríbenos por WhatsApp</span>
    </a>
  );
}
