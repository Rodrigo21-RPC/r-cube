import { asc, eq } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import { detectImageType } from "@shared/image-type";
import type { AdminImage } from "@shared/admin-types";
import { AppError } from "../middleware";
import { audit } from "./audit";
import type { Tx } from "./stock";

const { productImage, product } = schema;
export const MAX_IMAGES = 6;
export const MAX_BYTES = 2 * 1024 * 1024;

const toDto = (i: typeof productImage.$inferSelect): AdminImage => ({
  id: i.id, url: i.url, alt: i.alt, position: i.position, uploaded: i.r2Key !== null,
});

async function productName(tx: Tx, productId: string) {
  const [p] = await tx.select({ name: product.name }).from(product).where(eq(product.id, productId));
  if (!p) throw new AppError(404, "NOT_FOUND", "El producto no existe.");
  return p.name;
}

async function ordered(tx: Tx, productId: string) {
  return tx.select().from(productImage).where(eq(productImage.productId, productId)).orderBy(asc(productImage.position), asc(productImage.id));
}

/** Deja las posiciones como 0..n-1 en el orden dado. */
async function renumber(tx: Tx, ids: string[]) {
  for (const [i, id] of ids.entries()) await tx.update(productImage).set({ position: i }).where(eq(productImage.id, id));
}

/** Sube una foto a R2 tras validar tamaño y tipo real; máximo 6 por producto (HU-31, FR-009). */
export async function uploadImage(db: Db, bucket: R2Bucket, productId: string, file: File, adminId: string): Promise<AdminImage> {
  if (file.size > MAX_BYTES) throw new AppError(400, "INVALID_IMAGE", "La foto pesa más de 2 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) throw new AppError(400, "INVALID_IMAGE", "Solo se aceptan fotos JPG, PNG o WebP.");
  const name = await productName(db, productId);
  const current = await ordered(db, productId);
  if (current.length >= MAX_IMAGES) throw new AppError(409, "MAX_IMAGES", "Máximo 6 fotos por producto");

  const id = crypto.randomUUID();
  const key = `productos/${productId}/${id}.${type.ext}`;
  await bucket.put(key, bytes, { httpMetadata: { contentType: type.mime } });
  try {
    const row = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(productImage)
        .values({ id, productId, url: `/api/media/${key}`, alt: name, position: current.length, r2Key: key })
        .returning();
      await audit(tx, adminId, { action: "foto", entityType: "producto", entityId: productId, entityLabel: name, detail: `Foto agregada a ${name}` });
      return inserted!;
    });
    return toDto(row);
  } catch (e) {
    await bucket.delete(key); // sin registro en la base no debe quedar el archivo
    throw e;
  }
}

async function find(tx: Tx, productId: string, imageId: string) {
  const list = await ordered(tx, productId);
  const idx = list.findIndex((i) => i.id === imageId);
  if (idx < 0) throw new AppError(404, "NOT_FOUND", "La foto no existe.");
  return { list, idx };
}

export async function moveImage(db: Db, productId: string, imageId: string, direction: "up" | "down", adminId: string) {
  await db.transaction(async (tx) => {
    const { list, idx } = await find(tx, productId, imageId);
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= list.length) return;
    const ids = list.map((i) => i.id);
    [ids[idx], ids[target]] = [ids[target]!, ids[idx]!];
    await renumber(tx, ids);
    await audit(tx, adminId, { action: "foto", entityType: "producto", entityId: productId, entityLabel: await productName(tx, productId), detail: "Orden de fotos cambiado" });
  });
}

export async function makeMainImage(db: Db, productId: string, imageId: string, adminId: string) {
  await db.transaction(async (tx) => {
    const { list } = await find(tx, productId, imageId);
    await renumber(tx, [imageId, ...list.map((i) => i.id).filter((id) => id !== imageId)]);
    await audit(tx, adminId, { action: "foto", entityType: "producto", entityId: productId, entityLabel: await productName(tx, productId), detail: "Foto principal cambiada" });
  });
}

export async function updateImageAlt(db: Db, productId: string, imageId: string, alt: string, adminId: string) {
  await db.transaction(async (tx) => {
    await find(tx, productId, imageId);
    await tx.update(productImage).set({ alt }).where(eq(productImage.id, imageId));
    await audit(tx, adminId, { action: "foto", entityType: "producto", entityId: productId, entityLabel: await productName(tx, productId), detail: `Texto alternativo: «${alt}»` });
  });
}

/** Borra la foto; si fue subida, también su archivo en R2. Las fotos de demostración no tocan archivos estáticos. */
export async function deleteImage(db: Db, bucket: R2Bucket, productId: string, imageId: string, adminId: string) {
  const key = await db.transaction(async (tx) => {
    const { list, idx } = await find(tx, productId, imageId);
    await tx.delete(productImage).where(eq(productImage.id, imageId));
    await renumber(tx, list.filter((_, i) => i !== idx).map((i) => i.id));
    await audit(tx, adminId, { action: "foto", entityType: "producto", entityId: productId, entityLabel: await productName(tx, productId), detail: "Foto eliminada" });
    return list[idx]!.r2Key;
  });
  if (key) await bucket.delete(key);
}
