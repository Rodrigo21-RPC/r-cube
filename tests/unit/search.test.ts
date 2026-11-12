import { describe, expect, it } from "vitest";
import { buildSearchText, normalizeSearch } from "@shared/search";

describe("HU-02: búsqueda sin mayúsculas ni tildes", () => {
  it("HU-02: normaliza mayúsculas, tildes y espacios", () => {
    expect(normalizeSearch("Teléfono ÁPPLE")).toBe("telefono apple");
    expect(normalizeSearch("  Ñandú   Pro ")).toBe("nandu pro");
  });

  it("HU-02: el texto de búsqueda une nombre, marca y descripción normalizados", () => {
    expect(buildSearchText("Galaxy S23", "Samsung", "Cámara potente")).toBe(
      "galaxy s23 samsung camara potente",
    );
  });
});
