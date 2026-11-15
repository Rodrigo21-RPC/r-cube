import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { asc, eq, sql } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import { formatPEN } from "@shared/money";
import type { AdminSettings, AdminZone } from "@shared/admin-types";
import { AppError, validationHook, type AppEnv } from "../../middleware";
import { audit } from "../../services/audit";

const { storeSettings, deliveryZone } = schema;

const settingsBody = z.object({
  whatsappNumber: z.string().trim().regex(/^51\d{9}$/, "Usa 51 seguido de los 9 dígitos del celular."),
  yapeNumber: z.string().trim().regex(/^9\d{8}$/, "Celular de 9 dígitos que empiece con 9."),
  plinNumber: z.string().trim().regex(/^9\d{8}$/, "Celular de 9 dígitos que empiece con 9."),
  bankName: z.string().trim().min(2, "Escribe el banco.").max(80),
  bankHolder: z.string().trim().min(2, "Escribe el titular.").max(80),
  bankAccount: z.string().trim().regex(/^[\d-]{10,20}$/, "De 10 a 20 dígitos y guiones."),
  bankCci: z.string().trim().regex(/^\d{20}$/, "El CCI tiene 20 dígitos."),
  enabledMethods: z.array(z.enum(["card", "yape_plin", "transfer", "whatsapp"])).min(1, "Deja al menos un método de pago activo."),
});
const zoneName = z.string().trim().min(2, "Escribe el nombre de la zona.").max(80);
const zoneCost = z.number().int("Usa céntimos enteros.").min(0, "El costo no puede ser negativo.").max(100_000);

async function loadSettings(db: Db): Promise<AdminSettings> {
  const [[s], zones] = await Promise.all([
    db.select().from(storeSettings).where(eq(storeSettings.id, 1)),
    db.select().from(deliveryZone).orderBy(asc(deliveryZone.sortOrder), asc(deliveryZone.name)),
  ]);
  if (!s) throw new AppError(503, "NOT_CONFIGURED", "La tienda aún no está configurada.");
  return {
    whatsappNumber: s.whatsappNumber, yapeNumber: s.yapeNumber, plinNumber: s.plinNumber, bankName: s.bankName,
    bankHolder: s.bankHolder, bankAccount: s.bankAccount, bankCci: s.bankCci, enabledMethods: s.enabledMethods,
    zones: zones.map((z) => ({ id: z.id, name: z.name, costCents: z.costCents, active: z.active })),
  };
}

const LABELS: Record<string, string> = {
  whatsappNumber: "WhatsApp", yapeNumber: "Yape", plinNumber: "Plin", bankName: "Banco", bankHolder: "Titular",
  bankAccount: "Cuenta", bankCci: "CCI", enabledMethods: "Métodos activos",
};

/** Configuración de la tienda y zonas de delivery (HU-41). */
export const settingsRoutes = new Hono<AppEnv>()
  .get("/settings", async (c) => c.json(await loadSettings(c.get("db"))))
  .patch("/settings", zValidator("json", settingsBody, validationHook), async (c) => {
    const db = c.get("db");
    const body = c.req.valid("json");
    const current = await loadSettings(db);
    const changed = (Object.keys(body) as (keyof typeof body)[]).filter((k) => JSON.stringify(body[k]) !== JSON.stringify(current[k]));
    await db.transaction(async (tx) => {
      await tx.update(storeSettings).set(body).where(eq(storeSettings.id, 1));
      if (changed.length)
        await audit(tx, c.get("user")!.id, {
          action: "configuracion", entityType: "configuracion", entityId: "1", entityLabel: "Tienda",
          detail: `Configuración actualizada: ${changed.map((k) => LABELS[k]).join(", ")}`,
          before: Object.fromEntries(changed.map((k) => [k, current[k]])),
          after: Object.fromEntries(changed.map((k) => [k, body[k]])),
        });
    });
    return c.json(await loadSettings(db));
  })
  .post("/zones", zValidator("json", z.object({ name: zoneName, costCents: zoneCost }), validationHook), async (c) => {
    const db = c.get("db");
    const body = c.req.valid("json");
    const id = crypto.randomUUID();
    await db.transaction(async (tx) => {
      const [{ next } = { next: 1 }] = (await tx.execute(sql`select coalesce(max(sort_order), 0) + 1 as next from delivery_zone`)) as unknown as { next: number }[];
      await tx.insert(deliveryZone).values({ id, name: body.name, costCents: body.costCents, active: true, sortOrder: Number(next) });
      await audit(tx, c.get("user")!.id, { action: "zona", entityType: "zona", entityId: id, entityLabel: body.name, detail: `Zona creada: ${body.name} (${formatPEN(body.costCents)})` });
    });
    const zone: AdminZone = { id, name: body.name, costCents: body.costCents, active: true };
    return c.json(zone, 201);
  })
  .patch(
    "/zones/:id",
    zValidator("json", z.object({ name: zoneName.optional(), costCents: zoneCost.optional(), active: z.boolean().optional() }), validationHook),
    async (c) => {
      const db = c.get("db");
      const id = c.req.param("id");
      const body = c.req.valid("json");
      const zone = await db.transaction(async (tx) => {
        const [before] = await tx.select().from(deliveryZone).where(eq(deliveryZone.id, id));
        if (!before) throw new AppError(404, "NOT_FOUND", "La zona no existe.");
        const [after] = await tx.update(deliveryZone).set(body).where(eq(deliveryZone.id, id)).returning();
        const parts = [
          body.name !== undefined && body.name !== before.name ? `nombre «${before.name}» → «${body.name}»` : null,
          body.costCents !== undefined && body.costCents !== before.costCents ? `costo ${formatPEN(before.costCents)} → ${formatPEN(body.costCents)}` : null,
          body.active !== undefined && body.active !== before.active ? (body.active ? "activada" : "desactivada") : null,
        ].filter(Boolean);
        if (parts.length)
          await audit(tx, c.get("user")!.id, {
            action: "zona", entityType: "zona", entityId: id, entityLabel: after!.name, detail: `Zona ${before.name}: ${parts.join(", ")}`,
            before: { name: before.name, costCents: before.costCents, active: before.active },
            after: { name: after!.name, costCents: after!.costCents, active: after!.active },
          });
        return after!;
      });
      return c.json({ id: zone.id, name: zone.name, costCents: zone.costCents, active: zone.active } satisfies AdminZone);
    },
  );
