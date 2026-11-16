import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { schema } from "@db/client";
import { profileSchema, savedAddressSchema } from "@shared/schemas";
import type { Me } from "@shared/types";
import { requireUser, validationHook, type AppEnv } from "../middleware";
import { createAddress, deleteAddress, listAddresses, setDefaultAddress, updateAddress, writeProfileAddress } from "../services/addresses";

const { user } = schema;

async function loadMe(db: AppEnv["Variables"]["db"], id: string): Promise<Me> {
  const [u] = await db.select().from(user).where(eq(user.id, id));
  // La dirección del perfil es la predeterminada de «Mis direcciones» (feature 003, FR-019).
  const [def] = (await listAddresses(db, id)).filter((a) => a.isDefault);
  return {
    id: u!.id,
    name: u!.name,
    email: u!.email,
    phone: u!.phone ?? "",
    role: u!.role,
    address: { line: def?.line ?? "", district: def?.district ?? "", reference: def?.reference ?? "" },
  };
}

/** Perfil del cliente (HU-09) y sus direcciones guardadas (HU-48); el correo no se edita. */
export const accountRoutes = new Hono<AppEnv>()
  .use(requireUser)
  .get("/me", async (c) => c.json(await loadMe(c.get("db"), c.get("user")!.id)))
  .patch("/me", zValidator("json", profileSchema, validationHook), async (c) => {
    const body = c.req.valid("json");
    const id = c.get("user")!.id;
    const db = c.get("db");
    await db.update(user).set({ name: body.name, phone: body.phone }).where(eq(user.id, id));
    await writeProfileAddress(db, id, { name: body.name, phone: body.phone }, body.address);
    return c.json(await loadMe(db, id));
  })
  .get("/addresses", async (c) => c.json(await listAddresses(c.get("db"), c.get("user")!.id)))
  .post("/addresses", zValidator("json", savedAddressSchema, validationHook), async (c) =>
    c.json(await createAddress(c.get("db"), c.get("user")!.id, c.req.valid("json")), 201),
  )
  .patch("/addresses/:id", zValidator("json", savedAddressSchema, validationHook), async (c) =>
    c.json(await updateAddress(c.get("db"), c.get("user")!.id, c.req.param("id"), c.req.valid("json"))),
  )
  .post("/addresses/:id/default", async (c) => c.json(await setDefaultAddress(c.get("db"), c.get("user")!.id, c.req.param("id"))))
  .delete("/addresses/:id", async (c) => {
    await deleteAddress(c.get("db"), c.get("user")!.id, c.req.param("id"));
    return c.body(null, 204);
  });
