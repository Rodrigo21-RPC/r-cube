import { describe, expect, it } from "vitest";
import { formatPEN } from "@shared/money";
import { priceRangeText, variantLabel } from "@shared/variant";

describe("HU-43, HU-44: nombre de una variante", () => {
  it("HU-44: ordena almacenamiento, color y RAM", () => {
    expect(variantLabel({ storage: "256 GB", color: "Azul", ram: "8 GB" })).toBe("256 GB · Azul · 8 GB RAM");
  });

  it("HU-44: omite los atributos vacíos", () => {
    expect(variantLabel({ storage: "", color: "Azul", ram: "8 GB" })).toBe("Azul · 8 GB RAM");
    expect(variantLabel({ storage: "128 GB", color: "", ram: "" })).toBe("128 GB");
    expect(variantLabel({ storage: "", color: "Negro", ram: "" })).toBe("Negro");
  });

  it("HU-44: recorta espacios sobrantes", () => {
    expect(variantLabel({ storage: " 256 GB ", color: " Azul ", ram: "" })).toBe("256 GB · Azul");
  });
});

describe("HU-43, FR-003: rango de precios", () => {
  it("muestra «S/ a a S/ b» cuando hay rango", () => {
    expect(priceRangeText(399900, 459900)).toBe(`${formatPEN(399900)} a ${formatPEN(459900)}`);
  });

  it("muestra un solo precio si coinciden o no hay máximo", () => {
    expect(priceRangeText(399900, 399900)).toBe(formatPEN(399900));
    expect(priceRangeText(399900, null)).toBe(formatPEN(399900));
  });
});
