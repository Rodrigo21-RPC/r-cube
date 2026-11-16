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

const digits = (s: string) => s.replace(/\D/g, "");

/** Número de la tienda solo con dígitos, o null si no hay (FR-039). */
function storeDigits(storeNumber: string): string | null {
  const d = digits(storeNumber);
  return d ? d : null;
}

const link = (number: string, text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

/**
 * Celular peruano de un cliente en formato internacional (51 más 9 dígitos que empiezan con 9), o null si no lo es.
 * Acepta espacios, guiones, paréntesis y el prefijo +51 (HU-60, FR-040).
 */
export function peruvianWhatsappNumber(phone: string): string | null {
  const d = digits(phone);
  const national = d.length === 11 && d.startsWith("51") ? d.slice(2) : d;
  return /^9\d{8}$/.test(national) ? `51${national}` : null;
}

/** Consulta de un cliente sobre un producto: nombra el producto, la variante elegida y el enlace (HU-59, FR-037). */
export function productInquiryUrl(storeNumber: string, p: { name: string; variantLabel?: string | null; url: string }): string | null {
  const number = storeDigits(storeNumber);
  if (!number) return null;
  const variant = p.variantLabel ? ` (${p.variantLabel})` : "";
  return link(number, `Hola R Cube, quiero información de ${p.name}${variant}. ${p.url}`);
}

/** Consulta general del botón flotante (HU-59, FR-038). */
export function generalInquiryUrl(storeNumber: string): string | null {
  const number = storeDigits(storeNumber);
  return number ? link(number, "Hola R Cube, tengo una consulta.") : null;
}

/** Saludo del administrador al cliente, con el número de pedido si lo hace desde un pedido (HU-60, FR-040). */
export function customerWhatsappUrl(phone: string, c: { name: string; orderNumber?: string }): string | null {
  const number = peruvianWhatsappNumber(phone);
  if (!number) return null;
  const order = c.orderNumber ? ` por tu pedido ${c.orderNumber}` : "";
  return link(number, `Hola ${c.name}, te escribimos de R Cube${order}.`);
}
