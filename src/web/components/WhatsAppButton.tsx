import { MessageCircle } from "lucide-react";
import { productInquiryUrl } from "@shared/whatsapp";
import { useStoreContact } from "@web/hooks/useStoreContact";
import { Button } from "@web/components/ui/button";

interface Props {
  /** Nombre del producto. */
  name: string;
  /** Variante elegida, si la hay: «256 GB · Azul». */
  variantLabel?: string | null;
  /** Enlace completo al producto que viaja en el mensaje. */
  url: string;
  className?: string;
}

/** «Consultar por WhatsApp» en el detalle del producto: abre wa.me con el producto, la variante y su enlace (HU-59). */
export function WhatsAppButton({ name, variantLabel, url, className }: Props) {
  const { data } = useStoreContact();
  const link = data ? productInquiryUrl(data.whatsappNumber, { name, variantLabel, url }) : null;
  if (!link) return null;
  return (
    <Button asChild variant="whatsapp" size="lg" className={className}>
      <a href={link} target="_blank" rel="noopener noreferrer">
        <MessageCircle aria-hidden className="size-5" /> Consultar por WhatsApp
      </a>
    </Button>
  );
}
