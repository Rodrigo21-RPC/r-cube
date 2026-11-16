import { and, desc, eq, ne, sql } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import type { SavedAddressInput } from "@shared/schemas";
import type { Address } from "@shared/types";
import { AppError } from "../middleware";
import type { Tx } from "./stock";

const { address } = schema;

/** Máximo de direcciones guardadas por cliente (data-model.md). */
export const MAX_ADDRESSES = 10;

const toDto = (a: typeof address.$inferSelect): Address => ({
  id: a.id, label: a.label, recipientName: a.recipientName, phone: a.phone, line: a.line, district: a.district,
  reference: a.reference ?? "", isDefault: a.isDefault,
});

/** Serializa los cambios de direcciones de un cliente: el tope de 10 y «una sola predeterminada» no se cruzan. */
const lockUser = (tx: Tx, userId: string) => tx.execute(sql`select id from "user" where id = ${userId} for update`);

/** Direcciones del cliente: la predeterminada primero y luego las más nuevas (HU-48). */
export async function listAddresses(db: Db | Tx, userId: string): Promise<Address[]> {
  const rows = await db.select().from(address).where(eq(address.userId, userId)).orderBy(desc(address.isDefault), desc(address.createdAt), desc(address.id));
  return rows.map(toDto);
}

export async function findAddress(db: Db | Tx, userId: string, id: string): Promise<Address | null> {
  const [row] = await db.select().from(address).where(and(eq(address.id, id), eq(address.userId, userId)));
  return row ? toDto(row) : null;
}

/** La primera dirección queda predeterminada; desde la 11 se pide borrar alguna (FR-016, FR-017). */
export async function createAddress(db: Db, userId: string, input: SavedAddressInput): Promise<Address> {
  return db.transaction(async (tx) => {
    await lockUser(tx, userId);
    const existing = await tx.select({ id: address.id }).from(address).where(eq(address.userId, userId));
    if (existing.length >= MAX_ADDRESSES)
      throw new AppError(409, "TOO_MANY_ADDRESSES", `Puedes guardar hasta ${MAX_ADDRESSES} direcciones. Borra alguna para agregar otra.`);
    const [row] = await tx
      .insert(address)
      .values({ id: crypto.randomUUID(), userId, ...columns(input), isDefault: existing.length === 0 })
      .returning();
    return toDto(row!);
  });
}

export async function updateAddress(db: Db, userId: string, id: string, input: SavedAddressInput): Promise<Address> {
  const [row] = await db.update(address).set(columns(input)).where(and(eq(address.id, id), eq(address.userId, userId))).returning();
  if (!row) throw notFound();
  return toDto(row);
}

/** Cambia la predeterminada en una transacción: nunca hay dos (índice único parcial) ni ninguna. */
export async function setDefaultAddress(db: Db, userId: string, id: string): Promise<Address> {
  return db.transaction(async (tx) => {
    await lockUser(tx, userId);
    const [target] = await tx.select().from(address).where(and(eq(address.id, id), eq(address.userId, userId)));
    if (!target) throw notFound();
    await tx.update(address).set({ isDefault: false }).where(and(eq(address.userId, userId), ne(address.id, id)));
    const [row] = await tx.update(address).set({ isDefault: true }).where(eq(address.id, id)).returning();
    return toDto(row!);
  });
}

/** Al borrar la predeterminada, la más reciente de las restantes pasa a serlo (FR-017). */
export async function deleteAddress(db: Db, userId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await lockUser(tx, userId);
    const [target] = await tx.select().from(address).where(and(eq(address.id, id), eq(address.userId, userId)));
    if (!target) throw notFound();
    await tx.delete(address).where(eq(address.id, id));
    if (target.isDefault) {
      const [next] = await tx.select({ id: address.id }).from(address).where(eq(address.userId, userId)).orderBy(desc(address.createdAt), desc(address.id)).limit(1);
      if (next) await tx.update(address).set({ isDefault: true }).where(eq(address.id, next.id));
    }
  });
}

/**
 * Compatibilidad con la 001 (FR-019): la dirección del perfil es la predeterminada. Guardar una dirección no
 * vacía actualiza la predeterminada o crea «Principal»; una vacía no borra nada.
 */
export async function writeProfileAddress(
  db: Db,
  userId: string,
  profile: { name: string; phone: string },
  a: { line: string; district: string; reference: string },
): Promise<void> {
  if (!a.line.trim()) return;
  await db.transaction(async (tx) => {
    await lockUser(tx, userId);
    const [def] = await tx.select().from(address).where(and(eq(address.userId, userId), eq(address.isDefault, true)));
    if (def) {
      await tx.update(address).set({ line: a.line, district: a.district, reference: a.reference || null }).where(eq(address.id, def.id));
    } else {
      await tx.insert(address).values({
        id: crypto.randomUUID(), userId, label: "Principal", recipientName: profile.name, phone: profile.phone,
        line: a.line, district: a.district, reference: a.reference || null, isDefault: true,
      });
    }
  });
}

const columns = (i: SavedAddressInput) => ({
  label: i.label, recipientName: i.recipientName, phone: i.phone, line: i.line, district: i.district, reference: i.reference || null,
});
const notFound = () => new AppError(404, "NOT_FOUND", "No encontramos esa dirección.");
