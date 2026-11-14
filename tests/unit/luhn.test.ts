import { describe, expect, it } from "vitest";
import { isValidLuhn, onlyDigits } from "@shared/luhn";

describe("HU-16: validación Luhn del número de tarjeta", () => {
  it("HU-16: las tarjetas de prueba son válidas", () => {
    expect(isValidLuhn("4111 1111 1111 1111")).toBe(true);
    expect(isValidLuhn("4000000000000002")).toBe(true);
  });

  it("HU-16: un dígito cambiado la invalida", () => {
    expect(isValidLuhn("4111 1111 1111 1112")).toBe(false);
  });

  it("HU-16: rechaza textos, longitudes fuera de 13 a 19 y vacíos", () => {
    expect(isValidLuhn("abcd")).toBe(false);
    expect(isValidLuhn("4111")).toBe(false);
    expect(isValidLuhn("")).toBe(false);
  });

  it("HU-16: ignora espacios y guiones", () => {
    expect(onlyDigits("4111-1111 1111 1111")).toBe("4111111111111111");
  });
});
