import { describe, expect, it } from "vitest";
import {
  customerWhatsappUrl,
  generalInquiryUrl,
  peruvianWhatsappNumber,
  productInquiryUrl,
  whatsappMessage,
  whatsappUrl,
} from "@shared/whatsapp";

const order = {
  number: "RC-000042",
  items: [
    { name: "iPhone 15 Pro 256 GB", quantity: 1 },
    { name: "Pasta térmica 4 g", quantity: 2 },
  ],
  totalCents: 496900,
  paymentLabel: "Coordinación por WhatsApp",
  delivery: "Delivery a Lima Centro",
};

describe("HU-20: coordinación por WhatsApp", () => {
  it("HU-20: el mensaje incluye N.º, productos, cantidades, total, método y entrega", () => {
    const text = whatsappMessage(order);
    expect(text).toContain("RC-000042");
    expect(text).toContain("1 x iPhone 15 Pro 256 GB");
    expect(text).toContain("2 x Pasta térmica 4 g");
    expect(text).toContain("S/ 4,969.00");
    expect(text).toContain("Coordinación por WhatsApp");
    expect(text).toContain("Delivery a Lima Centro");
  });

  it("HU-20: el enlace va a wa.me con el número de la tienda y el texto codificado", () => {
    const url = whatsappUrl("51 987 000 111", order);
    expect(url.startsWith("https://wa.me/51987000111?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1]!)).toBe(whatsappMessage(order));
  });
});

const textOf = (url: string | null) => decodeURIComponent(url!.split("?text=")[1]!);

describe("HU-60, FR-040: celular peruano del cliente", () => {
  it("HU-60: normaliza espacios, guiones, paréntesis y el prefijo +51", () => {
    for (const phone of ["987654321", "987 654 321", "987-654-321", "+51 987 654 321", "(51) 987654321", "51987654321", " 987654321 "]) {
      expect(peruvianWhatsappNumber(phone), phone).toBe("51987654321");
    }
  });

  it("HU-60: rechaza lo que no es un celular peruano de 9 dígitos que empieza con 9", () => {
    for (const phone of ["", "98765432", "187654321", "+1 305 555 0100", "0987654321", "abc", "9876543210", "5198765432"]) {
      expect(peruvianWhatsappNumber(phone), phone).toBeNull();
    }
  });
});

describe("HU-59, FR-037, FR-038: consulta del cliente a la tienda", () => {
  it("HU-59: el mensaje del producto nombra el producto y su enlace", () => {
    const url = productInquiryUrl("51987000111", { name: "Samsung Galaxy S23 256 GB", url: "https://rcube.pe/producto/samsung-galaxy-s23-256-gb" });
    expect(url!.startsWith("https://wa.me/51987000111?text=")).toBe(true);
    expect(textOf(url)).toBe("Hola R Cube, quiero información de Samsung Galaxy S23 256 GB. https://rcube.pe/producto/samsung-galaxy-s23-256-gb");
  });

  it("HU-59: con variante elegida el mensaje la incluye entre paréntesis", () => {
    const url = productInquiryUrl("51987000111", { name: "Motorola Edge 60 Pro", variantLabel: "256 GB · Azul", url: "https://rcube.pe/producto/motorola-edge-60-pro" });
    expect(textOf(url)).toBe("Hola R Cube, quiero información de Motorola Edge 60 Pro (256 GB · Azul). https://rcube.pe/producto/motorola-edge-60-pro");
  });

  it("HU-59: tildes, comillas, & y # llegan completos (FR-037, escenario 6)", () => {
    const name = 'Cargador "Rápido" & Cía #1 ñandú';
    const url = productInquiryUrl("51987000111", { name, url: "https://rcube.pe/producto/x?a=1&b=2" });
    expect(textOf(url)).toBe(`Hola R Cube, quiero información de ${name}. https://rcube.pe/producto/x?a=1&b=2`);
    expect(url!.split("?text=")[1]).not.toMatch(/[&#" ]/);
  });

  it("HU-59: el botón flotante usa la consulta general", () => {
    expect(textOf(generalInquiryUrl("51987000111"))).toBe("Hola R Cube, tengo una consulta.");
  });

  it("HU-59: el número de la tienda se reduce a dígitos y sin número no hay enlace (FR-039)", () => {
    expect(generalInquiryUrl("+51 987-000 111")!.startsWith("https://wa.me/51987000111?text=")).toBe(true);
    expect(generalInquiryUrl("")).toBeNull();
    expect(generalInquiryUrl("   ")).toBeNull();
    expect(productInquiryUrl("", { name: "X", url: "https://rcube.pe/producto/x" })).toBeNull();
  });
});

describe("HU-60, FR-040: saludo del administrador al cliente", () => {
  it("HU-60: desde el pedido el saludo lleva el número de pedido", () => {
    const url = customerWhatsappUrl("987654321", { name: "Mateo Quispe", orderNumber: "RC-000001" });
    expect(url!.startsWith("https://wa.me/51987654321?text=")).toBe(true);
    expect(textOf(url)).toBe("Hola Mateo Quispe, te escribimos de R Cube por tu pedido RC-000001.");
  });

  it("HU-60: desde la ficha del cliente el saludo no lleva pedido", () => {
    expect(textOf(customerWhatsappUrl("+51 987-654 321", { name: "Mateo Quispe" }))).toBe("Hola Mateo Quispe, te escribimos de R Cube.");
  });

  it("HU-60: con un celular inválido no hay enlace", () => {
    expect(customerWhatsappUrl("", { name: "Mateo" })).toBeNull();
    expect(customerWhatsappUrl("12345", { name: "Mateo", orderNumber: "RC-000001" })).toBeNull();
  });
});
