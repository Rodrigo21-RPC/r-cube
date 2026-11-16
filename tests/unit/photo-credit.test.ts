import { describe, expect, it } from "vitest";
import { isAllowedLicense, licenseUrl } from "@shared/photo-credit";

describe("HU-58, FR-021: licencias admitidas para las fotos externas", () => {
  it("FR-021: acepta CC0, dominio público, CC BY y CC BY-SA", () => {
    for (const name of ["CC0 1.0", "CC BY 4.0", "CC BY 2.0", "CC BY-SA 3.0", "CC BY-SA 4.0", "Dominio público", "Public domain"]) {
      expect(isAllowedLicense(name), name).toBe(true);
    }
  });

  it("FR-021: rechaza las licencias NC y ND, GFDL y lo vacío", () => {
    for (const name of ["CC BY-NC 4.0", "CC BY-ND 4.0", "CC BY-NC-SA 4.0", "CC BY-NC-ND 4.0", "GFDL", "Todos los derechos reservados", "", "  "]) {
      expect(isAllowedLicense(name), name).toBe(false);
    }
  });
});

describe("HU-58, FR-022: enlace de la licencia", () => {
  it("FR-022: devuelve el enlace de Creative Commons de cada licencia", () => {
    expect(licenseUrl("CC BY-SA 4.0")).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
    expect(licenseUrl("CC BY 3.0")).toBe("https://creativecommons.org/licenses/by/3.0/");
    expect(licenseUrl("CC0 1.0")).toBe("https://creativecommons.org/publicdomain/zero/1.0/");
  });

  it("FR-022: el dominio público no tiene enlace de licencia", () => {
    expect(licenseUrl("Dominio público")).toBeNull();
    expect(licenseUrl("Public domain")).toBeNull();
  });
});
