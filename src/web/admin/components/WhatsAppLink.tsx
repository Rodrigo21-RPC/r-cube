import { MessageCircle } from "lucide-react";
import { customerWhatsappUrl } from "@shared/whatsapp";
import { Button } from "@web/components/ui/button";

interface Props {
  /** Celular del cliente tal como está en su cuenta (puede traer espacios, guiones o +51). */
  phone: string;
  name: string;
  /** Número de pedido cuando el botón está en el detalle de un pedido. */
  orderNumber?: string;
}

/**
 * «Escribir por WhatsApp» al cliente desde el panel (HU-60): abre wa.me con su celular y un saludo. Si el cliente no tiene
 * un celular peruano válido el botón queda deshabilitado y no abre nada (FR-040).
 */
export function WhatsAppLink({ phone, name, orderNumber }: Props) {
  const url = customerWhatsappUrl(phone, { name, orderNumber });
  if (!url) {
    return (
      <Button type="button" variant="secondary" disabled>
        <MessageCircle aria-hidden className="size-5" /> Escribir por WhatsApp
        <span className="text-sm font-normal text-muted">· Sin celular válido</span>
      </Button>
    );
  }
  return (
    <Button asChild variant="whatsapp">
      <a href={url} target="_blank" rel="noopener noreferrer">
        <MessageCircle aria-hidden className="size-5" /> Escribir por WhatsApp
      </a>
    </Button>
  );
}
