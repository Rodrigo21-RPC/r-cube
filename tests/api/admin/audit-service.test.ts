import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { audit } from "@worker/services/audit";
import { resetDb, rowsOf, signInAdmin, withDb } from "../helpers";

beforeEach(resetDb);

describe("HU-42: audit()", () => {
  it("HU-42: una transacción revertida no deja registro", async () => {
    const a = await signInAdmin();
    await expect(
      withDb((db) =>
        db.transaction(async (tx) => {
          await audit(tx, a.user.id, { action: "configuracion", entityType: "configuracion", entityId: "1", entityLabel: "Tienda", detail: "x" });
          throw new Error("revertir");
        }),
      ),
    ).rejects.toThrow("revertir");
    expect(await rowsOf(sql`select id from audit_log`)).toEqual([]);
  });

  it("HU-42: una transacción confirmada guarda autor, tipo, objeto, detalle y datos", async () => {
    const a = await signInAdmin();
    await withDb((db) =>
      db.transaction((tx) =>
        audit(tx, a.user.id, {
          action: "precio_cambiado",
          entityType: "producto",
          entityId: "p1",
          entityLabel: "iPhone",
          detail: "Precio de iPhone: S/ 10.00 → S/ 9.00",
          before: { priceCents: 1000 },
          after: { priceCents: 900 },
        }),
      ),
    );
    const [row] = await rowsOf(sql`select actor_user_id, action, entity_type, entity_label, detail, data from audit_log`);
    expect(row).toMatchObject({
      actor_user_id: a.user.id,
      action: "precio_cambiado",
      entity_type: "producto",
      entity_label: "iPhone",
      detail: "Precio de iPhone: S/ 10.00 → S/ 9.00",
      data: { before: { priceCents: 1000 }, after: { priceCents: 900 } },
    });
  });
});
