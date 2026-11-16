/**
 * Reduce imágenes a WebP con Chromium de Playwright (solo desarrollo, feature 004, research R8): se dibuja la imagen
 * en un lienzo a 1 200 px como máximo y se exporta con calidad decreciente hasta pesar 200 KB o menos.
 */
import { chromium, type Browser, type Page } from "@playwright/test";

export const MAX_BYTES = 200 * 1024;
export const MAX_SIDE = 1200;

export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Encoder {
  page: Page;
  encode: (bytes: Buffer, mime: string, crop?: Crop | null) => Promise<Buffer>;
  close: () => Promise<void>;
}

export async function openEncoder(): Promise<Encoder> {
  const browser: Browser = await chromium.launch();
  const page = await browser.newPage();
  const encode = async (bytes: Buffer, mime: string, crop?: Crop | null): Promise<Buffer> => {
    const b64 = await page.evaluate(
      async ({ src, maxBytes, maxSide, crop }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        // Recorte opcional del original (fracciones del ancho y el alto).
        const sx = crop ? crop.x * img.width : 0;
        const sy = crop ? crop.y * img.height : 0;
        const sw = crop ? crop.w * img.width : img.width;
        const sh = crop ? crop.h * img.height : img.height;
        for (const scale of [1, 0.85, 0.7, 0.55]) {
          const k = Math.min(1, maxSide / Math.max(sw, sh)) * scale;
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(sw * k));
          canvas.height = Math.max(1, Math.round(sh * k));
          canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
          for (const quality of [0.86, 0.8, 0.74, 0.68, 0.62, 0.56, 0.5]) {
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
            if (blob && blob.size <= maxBytes) {
              return await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
                reader.readAsDataURL(blob);
              });
            }
          }
        }
        return null;
      },
      { src: `data:${mime};base64,${bytes.toString("base64")}`, maxBytes: MAX_BYTES, maxSide: MAX_SIDE, crop: crop ?? null },
    );
    if (!b64) throw new Error(`No se logró un WebP de ${MAX_BYTES} bytes o menos`);
    return Buffer.from(b64, "base64");
  };
  return { page, encode, close: () => browser.close() };
}
