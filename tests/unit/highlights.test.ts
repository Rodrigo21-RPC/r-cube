import { describe, expect, it } from "vitest";
import { HIGHLIGHTS_MAX, HIGHLIGHT_MAX, TAGLINE_MAX, normalizeHighlights } from "@shared/highlights";

describe("HU-56, HU-57, FR-014: límites de la frase y los destacados", () => {
  it("FR-014: la frase admite 90 caracteres, cada destacado 60 y hay hasta 5 destacados", () => {
    expect(TAGLINE_MAX).toBe(90);
    expect(HIGHLIGHT_MAX).toBe(60);
    expect(HIGHLIGHTS_MAX).toBe(5);
  });
});

describe("HU-57, FR-018: normalizar los destacados", () => {
  it("HU-57: recorta los espacios y descarta los vacíos", () => {
    expect(normalizeHighlights(["  Pantalla de 120 Hz ", "", "   ", "Carga rápida"])).toEqual(["Pantalla de 120 Hz", "Carga rápida"]);
  });

  it("HU-57: conserva el orden y no corta los textos largos (los límites los valida el servidor)", () => {
    const largo = "x".repeat(HIGHLIGHT_MAX + 10);
    expect(normalizeHighlights(["B", "A", largo])).toEqual(["B", "A", largo]);
  });

  it("HU-57: una lista vacía o de puros vacíos da una lista vacía", () => {
    expect(normalizeHighlights([])).toEqual([]);
    expect(normalizeHighlights(["", "  ", "\t"])).toEqual([]);
  });

  it("HU-57: no quita los símbolos de HTML (se muestran como texto, FR-016)", () => {
    expect(normalizeHighlights(["<b>hola</b>"])).toEqual(["<b>hola</b>"]);
  });
});
