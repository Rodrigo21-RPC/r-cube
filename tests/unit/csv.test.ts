import { describe, expect, it } from "vitest";
import { toCsv } from "@shared/csv";

describe("HU-37: exportación CSV", () => {
  it("HU-37: empieza con BOM, separa con coma y termina filas con CRLF", () => {
    const csv = toCsv(["N.º", "Cliente"], [["RC-000001", "Ana"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿N.º,Cliente\r\nRC-000001,Ana\r\n");
  });

  it("HU-37: entrecomilla campos con coma, comillas o saltos de línea y conserva tildes", () => {
    const csv = toCsv(["Cliente"], [["Pérez, José"], ['Dice "hola"'], ["línea1\nlínea2"]]);
    expect(csv).toBe('﻿Cliente\r\n"Pérez, José"\r\n"Dice ""hola"""\r\n"línea1\nlínea2"\r\n');
  });

  it("RNF-05: neutraliza fórmulas en celdas que empiezan con =, +, - o @", () => {
    const csv = toCsv(["x"], [["=SUMA(A1)"], ["+51"], ["-3"], ["@cmd"], ["normal"]]);
    expect(csv.split("\r\n").slice(1, 6)).toEqual(["'=SUMA(A1)", "'+51", "'-3", "'@cmd", "normal"]);
  });

  it("HU-37: sin filas devuelve solo los encabezados", () => {
    expect(toCsv(["A", "B"], [])).toBe("﻿A,B\r\n");
  });
});
