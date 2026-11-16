/** Revisa el contraste WCAG de los tokens de tema en src/web/styles.css (HU-25, RNF-03). */
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/web/styles.css", import.meta.url), "utf8");
const block = (sel: string) => {
  const m = css.match(new RegExp(`${sel.replace(".", "\\.")}\\s*\\{([^}]*)\\}`));
  return Object.fromEntries([...(m?.[1] ?? "").matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((x) => [x[1]!, x[2]!]));
};

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

// [primer plano, fondo, mínimo]: 4.5 texto normal, 3 para bordes de controles y foco.
const pairs: [string, string, number][] = [
  ["text", "canvas", 4.5], ["text", "surface", 4.5], ["text", "surface-2", 4.5],
  ["text-muted", "canvas", 4.5], ["text-muted", "surface", 4.5],
  ["accent", "canvas", 4.5], ["accent", "surface", 4.5], ["on-accent", "accent", 4.5],
  ["danger", "canvas", 4.5], ["danger", "surface", 4.5], ["warning", "canvas", 4.5], ["warning", "surface", 4.5],
  ["success", "canvas", 4.5], ["success", "surface", 4.5], ["on-whatsapp", "whatsapp", 4.5],
  ["input-border", "canvas", 3], ["input-border", "surface", 3], ["focus", "canvas", 3], ["focus", "surface", 3],
];

let fail = 0;
for (const [name, sel] of [["claro", ":root"], ["oscuro", ".dark"]] as const) {
  const t = block(sel);
  for (const [fg, bg, min] of pairs) {
    const r = ratio(t[fg]!, t[bg]!);
    if (r < min) fail++;
    console.log(`${r >= min ? "ok  " : "FALLA"} ${name.padEnd(6)} ${fg} sobre ${bg}: ${r.toFixed(2)} (mín. ${min})`);
  }
}
process.exit(fail ? 1 : 0);
