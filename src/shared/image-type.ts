export type ImageType = { ext: "jpg" | "png" | "webp"; mime: "image/jpeg" | "image/png" | "image/webp" };

const startsWith = (b: Uint8Array, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** Tipo real de una imagen por sus primeros bytes, no por la extensión ni el Content-Type (HU-31). */
export function detectImageType(b: Uint8Array): ImageType | null {
  if (startsWith(b, [0xff, 0xd8, 0xff])) return { ext: "jpg", mime: "image/jpeg" };
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: "png", mime: "image/png" };
  if (startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WEBP"), 8)) return { ext: "webp", mime: "image/webp" };
  return null;
}
