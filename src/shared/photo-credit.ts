/**
 * Licencias admitidas para las fotos externas de la demostración: dominio público, CC0, CC BY y CC BY-SA.
 * Las licencias NC (no comercial) y ND (sin obras derivadas) no se admiten (FR-021).
 */
const CC_BY = /^cc by(-sa)? (\d+(?:\.\d+)?)$/i;
const CC_ZERO = /^cc0(?: \d+(?:\.\d+)?)?$/i;
const PUBLIC_DOMAIN = /^(?:dominio público|public domain)$/i;

export function isAllowedLicense(name: string): boolean {
  const n = name.trim();
  return CC_BY.test(n) || CC_ZERO.test(n) || PUBLIC_DOMAIN.test(n);
}

/** Enlace a la licencia (HU-58, FR-022); el dominio público no tiene enlace. */
export function licenseUrl(name: string): string | null {
  const n = name.trim();
  const by = CC_BY.exec(n);
  if (by) return `https://creativecommons.org/licenses/${by[1] ? "by-sa" : "by"}/${by[2]}/`;
  if (CC_ZERO.test(n)) return "https://creativecommons.org/publicdomain/zero/1.0/";
  return null;
}
