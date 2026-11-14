import { formatPEN } from "./money";

export interface WhatsappOrder {
  number: string;
  items: { name: string; quantity: number }[];
  totalCents: number;
  paymentLabel: string;
  delivery: string;
}

/** Mensaje con el resumen del pedido para coordinar con la tienda (HU-20). */
export function whatsappMessage(o: WhatsappOrder): string {
  return [
    `Hola R Cube, quiero coordinar mi pedido ${o.number}.`,
    ...o.items.map((i) => `- ${i.quantity} x ${i.name}`),
    `Total: ${formatPEN(o.totalCents)}`,
    `Pago: ${o.paymentLabel}`,
    `Entrega: ${o.delivery}`,
  ].join("\n");
}

/** Enlace wa.me con el número de la tienda y el mensaje codificado (HU-20). */
export function whatsappUrl(storeNumber: string, o: WhatsappOrder): string {
  return `https://wa.me/${storeNumber.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage(o))}`;
}
