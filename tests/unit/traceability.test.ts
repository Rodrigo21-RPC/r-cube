import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/** Historias vigentes de `HISTORIAS-DE-USUARIO.md`: se excluyen las filas «Retirada» (por ejemplo, HU-19). */
function readStories() {
  const text = readFileSync(join(ROOT, "docs", "requisitos", "HISTORIAS-DE-USUARIO.md"), "utf8");
  const stories: { id: string; retired: boolean }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\|\s*(HU-\d+)\s*\|\s*([^|]*?)\s*\|/.exec(line);
    if (m) stories.push({ id: m[1]!, retired: /^retirada$/i.test(m[2]!) });
  }
  return stories;
}

function testFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return testFiles(path);
    return /\.(test|spec)\.ts$/.test(entry.name) ? [path] : [];
  });
}

/** Líneas que declaran un `describe`, `test` o `it`: ahí vive el título de cada prueba. */
function testTitles() {
  const declaration = /\b(describe|test|it)(\.\w+)*\(/;
  const titles: string[] = [];
  for (const file of [...testFiles("tests"), ...testFiles("e2e")]) {
    if (file.endsWith("traceability.test.ts")) continue;
    for (const line of readFileSync(join(ROOT, file), "utf8").split(/\r?\n/)) {
      if (declaration.test(line)) titles.push(line);
    }
  }
  return titles;
}

describe("RNF-08, RNF-09, SC-009: trazabilidad de las historias de usuario", () => {
  const stories = readStories();
  const titles = testTitles();

  it("RNF-08: el archivo de historias se lee completo (HU-01 a HU-60, con HU-19 retirada)", () => {
    expect(stories).toHaveLength(60);
    expect(stories.map((s) => s.id)).toEqual(Array.from({ length: 60 }, (_, i) => `HU-${String(i + 1).padStart(2, "0")}`));
    expect(stories.filter((s) => s.retired).map((s) => s.id)).toEqual(["HU-19"]);
  });

  it("RNF-09, SC-009: cada historia vigente aparece en el título de al menos una prueba de tests/ o e2e/", () => {
    const sinPrueba = stories.filter((s) => !s.retired).filter((s) => !titles.some((t) => new RegExp(`\\b${s.id}\\b`).test(t)));
    expect(sinPrueba.map((s) => s.id)).toEqual([]);
  });
});
