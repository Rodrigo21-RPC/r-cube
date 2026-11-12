import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { schema } from "@db/client";
import { profileSchema } from "@shared/schemas";
import type { Me } from "@shared/types";
import { requireUser, validationHook, type AppEnv } from "../middleware";

const { user } = schema;

async function loadMe(db: AppEnv["Variables"]["db"], id: string): Promise<Me> {
  const [u] = await db.select().from(user).where(eq(user.id, id));
  return {
    id: u!.id,
    name: u!.name,
    email: u!.email,
    phone: u!.phone ?? "",
    role: u!.role,
    address: { line: u!.addressLine ?? "", district: u!.district ?? "", reference: u!.addressReference ?? "" },
  };
}

/** Perfil del cliente: nombre, teléfono y dirección; el correo no se edita (HU-09). */
export const accountRoutes = new Hono<AppEnv>()
  .use(requireUser)
  .get("/me", async (c) => c.json(await loadMe(c.get("db"), c.get("user")!.id)))
  .patch("/me", zValidator("json", profileSchema, validationHook), async (c) => {
    const body = c.req.valid("json");
    const id = c.get("user")!.id;
    await c
      .get("db")
      .update(user)
      .set({
        name: body.name,
        phone: body.phone,
        addressLine: body.address.line || null,
        district: body.address.district || null,
        addressReference: body.address.reference || null,
      })
      .where(eq(user.id, id));
    return c.json(await loadMe(c.get("db"), id));
  });
