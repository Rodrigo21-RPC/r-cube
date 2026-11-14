export const onlyDigits = (text: string) => text.replace(/[\s-]/g, "");

/** Validación Luhn de un número de tarjeta de 13 a 19 dígitos (HU-16). */
export function isValidLuhn(input: string): boolean {
  const digits = onlyDigits(input);
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}
