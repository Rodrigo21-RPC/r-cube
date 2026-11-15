import { schema } from "@db/client";
import type { AuditAction } from "@db/schema";
import type { Tx } from "./stock";

export interface AuditEntry {
  action: AuditAction;
  entityType: string;
  entityId: string;
  entityLabel: string;
  detail: string;
  before?: unknown;
  after?: unknown;
}

/** Registra una acción del panel dentro de la transacción que la ejecuta (HU-42, FR-025). */
export async function audit(tx: Tx, actorUserId: string, e: AuditEntry) {
  await tx.insert(schema.auditLog).values({
    id: crypto.randomUUID(),
    actorUserId,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    entityLabel: e.entityLabel,
    detail: e.detail,
    data: e.before !== undefined || e.after !== undefined ? { before: e.before, after: e.after } : null,
  });
}
