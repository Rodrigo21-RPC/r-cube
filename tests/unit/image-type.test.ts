import { describe, expect, it } from "vitest";
import { detectImageType } from "@shared/image-type";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("HU-31: tipo real de la imagen por sus bytes", () => {
  it("HU-31: detecta JPG, PNG y WebP", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({ ext: "jpg", mime: "image/jpeg" });
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toEqual({ ext: "png", mime: "image/png" });
    expect(detectImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")))).toEqual({ ext: "webp", mime: "image/webp" });
  });

  it("HU-31: rechaza un PDF, un texto disfrazado y un archivo vacío", () => {
    expect(detectImageType(bytes(...ascii("%PDF-1.7")))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("esto no es una imagen .jpg"))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
    expect(detectImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE")))).toBeNull();
  });
});
