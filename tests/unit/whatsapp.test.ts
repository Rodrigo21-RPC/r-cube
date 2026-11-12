import { describe, expect, it } from "vitest";
import { whatsappMessage, whatsappUrl } from "@shared/whatsapp";

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
