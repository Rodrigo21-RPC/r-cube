import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { AdminSettings, AdminZone } from "@shared/admin-types";
import type { CheckoutOptions } from "@shared/types";
import { api, ids, resetDb, rowsOf, signInAdmin, signUp } from "../helpers";

let admin: Awaited<ReturnType<typeof signInAdmin>>;
beforeEach(async () => {
  await resetDb();
  admin = await signInAdmin();
});

const valid = {
  whatsappNumber: "51911222333",
  yapeNumber: "911222333",
  plinNumber: "911222444",
  bankName: "Banco Nuevo",
  bankHolder: "R Cube S.A.C.",
  bankAccount: "191-7654321-0-99",
  bankCci: "00219100765432109999",
  enabledMethods: ["card", "yape_plin", "whatsapp"],
};
const patch = (body: Record<string, unknown>) => api("/admin/settings", { method: "PATCH", cookie: admin.cookie, json: body });

describe("HU-41: configurar la tienda", () => {
  it("HU-41: los cambios se reflejan en el checkout y quedan en la auditoría con antes y después", async () => {
    expect((await patch(valid)).status).toBe(200);
    const u = await signUp();
    const o = (await (await api("/checkout/options", { cookie: u.cookie })).json()) as CheckoutOptions;
    expect(o.methods).toEqual(["card", "yape_plin", "whatsapp"]);
    expect(o.whatsappNumber).toBe("51911222333");
    expect(o.bank.cci).toBe("00219100765432109999");
    const [log] = await rowsOf(sql`select data from audit_log where action = 'configuracion'`);
    expect(log!.data).toMatchObject({ before: { whatsappNumber: "51987654321" }, after: { whatsappNumber: "51911222333" } });
  });

  it("HU-41: valida WhatsApp, Yape, CCI y que quede al menos un método activo", async () => {
    const res = await patch({ ...valid, whatsappNumber: "987654321", yapeNumber: "12", bankCci: "123", enabledMethods: [] });
    expect(res.status).toBe(400);
    const fields = ((await res.json()) as { error: { fields: Record<string, string> } }).error.fields;
    expect(Object.keys(fields)).toEqual(expect.arrayContaining(["whatsappNumber", "yapeNumber", "bankCci", "enabledMethods"]));
  });

  it("HU-41, RN-05: zonas nuevas, editadas y desactivadas; los pedidos anteriores conservan su costo", async () => {
    const u = await signUp();
    await api(`/cart/items/${ids.p3}`, { method: "PUT", cookie: u.cookie, json: { quantity: 1 } });
    const { order } = (await (await api("/checkout/orders", {
      method: "POST",
      cookie: u.cookie,
      json: {
        delivery: { method: "delivery", zoneId: ids.zone, name: "Ana", phone: "987654321", address: "Av. Larco 1", district: "Miraflores" },
        payment: { method: "transfer" },
        expectedTotalCents: 299900 + 1500,
      },
    })).json()) as { order: { number: string } };

    const created = (await (await api("/admin/zones", { method: "POST", cookie: admin.cookie, json: { name: "Surco", costCents: 2000 } })).json()) as AdminZone;
    expect(created).toMatchObject({ name: "Surco", costCents: 2000, active: true });
    await api(`/admin/zones/${ids.zone}`, { method: "PATCH", cookie: admin.cookie, json: { costCents: 2500 } });
    await api(`/admin/zones/${created.id}`, { method: "PATCH", cookie: admin.cookie, json: { active: false } });
    expect((await api("/admin/zones", { method: "POST", cookie: admin.cookie, json: { name: "X", costCents: -1 } })).status).toBe(400);

    const o = (await (await api("/checkout/options", { cookie: u.cookie })).json()) as CheckoutOptions;
    expect(o.zones).toEqual([{ id: ids.zone, name: "Lima Centro", costCents: 2500 }]);
    const old = (await (await api(`/orders/${order.number}`, { cookie: u.cookie })).json()) as { totals: { shippingCents: number } };
    expect(old.totals.shippingCents).toBe(1500);
    const s = (await (await api("/admin/settings", { cookie: admin.cookie })).json()) as AdminSettings;
    expect(s.zones.map((z) => z.name).sort()).toEqual(["Lima Centro", "Surco", "Zona cerrada"]);
    expect((await rowsOf(sql`select action from audit_log where action = 'zona'`)).length).toBe(3);
  });
});
