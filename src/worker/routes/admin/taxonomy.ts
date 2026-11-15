import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, asc, eq, sql } from "drizzle-orm";
import { schema } from "@db/client";
import { slugify } from "@shared/slug";
import type { TaxonomyItem } from "@shared/admin-types";
import { AppError, validationHook, type AppEnv } from "../../middleware";
import { audit } from "../../services/audit";

/** Rutas iguales para categorías y marcas (HU-32). */
function taxonomy(kind: "categoria" | "marca") {
  const table = kind === "categoria" ? schema.category : schema.brand;
    const label = kind === "categoria" ? "Categoría" : "Marca";
  // Columnas calificadas a mano: dentro de la subconsulta, "id" sin tabla apuntaría a product.id.
  const tableName = kind === "categoria" ? "category" : "brand";
  const fkName = kind === "categoria" ? "category_id" : "brand_id";
  const activeProducts = sql<number>`(select count(*)::int from product p where p.${sql.raw(fkName)} = ${sql.raw(`"${tableName}"."id"`)} and p.active)`;

  const list = (db: AppEnv["Variables"]["db"], id?: string) =>
    db
      .select({ id: table.id, name: table.name, slug: table.slug, active: table.active, activeProducts })
      .from(table)
      .where(id ? eq(table.id, id) : undefined)
      .orderBy(asc(table.name));

  async function assertUnique(db: AppEnv["Variables"]["db"], name: string, exceptId?: string) {
    const [dup] = await db
      .select({ id: table.id })
      .from(table)
      .where(sql`(lower(${table.name}) = lower(${name}) or ${table.slug} = ${slugify(name)})`);
    if (dup && dup.id !== exceptId)
      throw new AppError(409, "DUPLICATE", `Ya existe una ${label.toLowerCase()} con ese nombre.`, { name: "Ese nombre ya está en uso." });
  }

  const nameSchema = z.string().trim().min(2, "Escribe el nombre (mínimo 2 letras).").max(60);

  return new Hono<AppEnv>()
    .get("/", async (c) => c.json((await list(c.get("db"))) satisfies TaxonomyItem[]))
    .post("/", zValidator("json", z.object({ name: nameSchema }), validationHook), async (c) => {
      const db = c.get("db");
      const { name } = c.req.valid("json");
      await assertUnique(db, name);
      const id = crypto.randomUUID();
      await db.transaction(async (tx) => {
        await tx.insert(table).values({ id, name, slug: slugify(name), active: true });
        await audit(tx, c.get("user")!.id, { action: kind, entityType: kind, entityId: id, entityLabel: name, detail: `${label} creada: ${name}` });
      });
      return c.json((await list(db, id))[0]!, 201);
    })
    .patch(
      "/:id",
      zValidator("json", z.object({ name: nameSchema.optional(), active: z.boolean().optional(), confirm: z.boolean().optional() }), validationHook),
      async (c) => {
        const db = c.get("db");
        const id = c.req.param("id");
        const body = c.req.valid("json");
        const [current] = await list(db, id);
        if (!current) throw new AppError(404, "NOT_FOUND", `La ${label.toLowerCase()} no existe.`);
        if (body.name && body.name !== current.name) await assertUnique(db, body.name, id);
        if (body.active === false && current.active && current.activeProducts > 0 && !body.confirm)
          throw new AppError(
            409,
            "HAS_ACTIVE_PRODUCTS",
            `${current.activeProducts} producto(s) activos dejarán de verse en la tienda. Confirma para continuar.`,
            undefined,
            { count: current.activeProducts },
          );
        await db.transaction(async (tx) => {
          await tx
            .update(table)
            .set({
              ...(body.name ? { name: body.name, slug: slugify(body.name) } : {}),
              ...(body.active !== undefined ? { active: body.active } : {}),
            })
            .where(and(eq(table.id, id)));
          const changes = [
            body.name && body.name !== current.name ? `renombrada de «${current.name}» a «${body.name}»` : null,
            body.active !== undefined && body.active !== current.active ? (body.active ? "activada" : "desactivada") : null,
          ].filter(Boolean);
          if (changes.length)
            await audit(tx, c.get("user")!.id, {
              action: kind, entityType: kind, entityId: id, entityLabel: body.name ?? current.name,
              detail: `${label} ${current.name}: ${changes.join(", ")}`,
              before: { name: current.name, active: current.active },
              after: { name: body.name ?? current.name, active: body.active ?? current.active },
            });
        });
        return c.json((await list(db, id))[0]!);
      },
    );
}

export const taxonomyRoutes = new Hono<AppEnv>().route("/categories", taxonomy("categoria")).route("/brands", taxonomy("marca"));
