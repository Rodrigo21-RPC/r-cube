/** Celda de CSV: neutraliza fórmulas (=, +, -, @) y entrecomilla si hace falta (HU-37, RNF-05). */
function cell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV con BOM (tildes correctas en hojas de cálculo), coma como separador y CRLF entre filas. */
export function toCsv(headers: string[], rows: string[][]): string {
  return `﻿${[headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}
