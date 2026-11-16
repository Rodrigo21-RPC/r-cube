import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { schema } from "@db/client";
import { orderTotals } from "@shared/money";
import { PAYMENT_LABEL, type CheckoutOptions } from "@shared/types";
import { whatsappUrl } from "@shared/whatsapp";
import { AppError, requireCustomer, validationHook, type AppEnv } from "../middleware";
import { quoteCart } from "../services/pricing";
import { simulateCard } from "../services/payments";
import { createOrder, loadOrderDetail } from "../services/orders";
import { findAddress, listAddresses } from "../services/addresses";
import { couponAppError, findCoupon } from "../services/coupons";

const { storeSettings, deliveryZone, cartItem, user } = schema;

const phone = z.string().trim().regex(/^9\d{8}$/, "Escribe un celular de 9 dígitos que empiece con 9.");
/** Datos de entrega escritos a mano («Otra dirección»); con `addressId` se usan los de la dirección guardada. */
const manualDelivery = z.object({
  name: z.string({ error: "Escribe el nombre de quien recibe." }).trim().min(2, "Escribe el nombre de quien recibe.").max(80),
  phone,
  address: z.string({ error: "Escribe la dirección de entrega." }).trim().min(5, "Escribe la dirección de entrega.").max(160),
  district: z.string({ error: "Escribe el distrito." }).trim().min(2, "Escribe el distrito.").max(80),
  reference: z.string().trim().max(160).optional(),
});
const deliverySchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("pickup") }),
  z.object({
    method: z.literal("delivery"),
    zoneId: z.string().min(1, "Elige una zona de delivery."),
    addressId: z.string().min(1).max(100).optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    district: z.string().optional(),
    reference: z.string().optional(),
  }),
]);
const paymentSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("card"),
    cardNumber: z.string().max(30),
    expMonth: z.number().int(),
    expYear: z.number().int(),
    cvv: z.string().max(4),
  }),
  z.object({
    method: z.literal("yape_plin"),
    operationCode: z.string({ error: "Escribe el código de operación." }).trim().regex(/^\d{6,12}$/, "El código de operación tiene de 6 a 12 dígitos."),
  }),
  z.object({ method: z.literal("transfer"), operationCode: z.string().trim().max(30).optional() }),
  z.object({ method: z.literal("whatsapp") }),
]);
const orderSchema = z.object({
  delivery: deliverySchema,
  payment: paymentSchema,
  expectedTotalCents: z.number().int().min(0),
  couponCode: z.string().trim().max(40).optional(),
});

export const checkoutRoutes = new Hono<AppEnv>()
  .use(requireCustomer)
  /** Zonas, métodos activos, datos de pago de ejemplo y dirección del perfil (HU-14, HU-15, HU-17, HU-18). */
  .get("/options", async (c) => {
    const db = c.get("db");
    const [[s], zones, [me], addresses] = await Promise.all([
      db.select().from(storeSettings).where(eq(storeSettings.id, 1)),
      db.select({ id: deliveryZone.id, name: deliveryZone.name, costCents: deliveryZone.costCents }).from(deliveryZone).where(eq(deliveryZone.active, true)).orderBy(asc(deliveryZone.sortOrder)),
      db.select().from(user).where(eq(user.id, c.get("user")!.id)),
      listAddresses(db, c.get("user")!.id),
    ]);
    const def = addresses.find((a) => a.isDefault);
    if (!s) throw new AppError(503, "NOT_CONFIGURED", "La tienda aún no está configurada.");
    const body: CheckoutOptions = {
      zones,
      methods: s.enabledMethods,
      pickupAddress: s.pickupAddress,
      yape: { number: s.yapeNumber, qrUrl: s.yapeQrUrl },
      plin: { number: s.plinNumber },
      bank: { name: s.bankName, holder: s.bankHolder, account: s.bankAccount, cci: s.bankCci },
      whatsappNumber: s.whatsappNumber,
      address: { name: def?.recipientName ?? me!.name, phone: def?.phone ?? me!.phone ?? "", address: def?.line ?? "", district: def?.district ?? "", reference: def?.reference ?? "" },
      addresses,
    };
    return c.json(body);
  })
  /** Crea el pedido con los 4 métodos simulados (HU-14 a HU-21, RN-01 a RN-07, RN-11). */
  .post("/orders", zValidator("json", orderSchema, validationHook), async (c) => {
    const db = c.get("db");
    const userId = c.get("user")!.id;
    const body = c.req.valid("json");
    const [s] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1));
    if (!s) throw new AppError(503, "NOT_CONFIGURED", "La tienda aún no está configurada.");
    if (!s.enabledMethods.includes(body.payment.method))
      throw new AppError(400, "VALIDATION", "Ese método de pago no está disponible.", { "payment.method": "Elige otro método de pago." });

    const items = await db
      .select({ productId: cartItem.productId, variantId: cartItem.variantId, quantity: cartItem.quantity })
      .from(cartItem)
      .where(eq(cartItem.userId, userId));
    if (!items.length) throw new AppError(400, "EMPTY_CART", "Tu carrito está vacío.");
    const quote = await quoteCart(db, items, { couponCode: body.couponCode });
    if (quote.couponError) throw couponAppError(quote.couponError.code);
    const problem = quote.warnings.find((w) => w.type !== "price_changed");
    if (problem) throw new AppError(409, "STOCK", problem.message, undefined, { productId: problem.productId, variantId: problem.variantId ?? null });

    // Entrega: una dirección guardada del cliente (sus datos se congelan en el pedido) o la escrita a mano (HU-48).
    let delivery: { method: "pickup" } | { method: "delivery"; zoneId: string; name: string; phone: string; address: string; district: string; reference?: string };
    if (body.delivery.method === "pickup") {
      delivery = { method: "pickup" };
    } else if (body.delivery.addressId) {
      const saved = await findAddress(db, userId, body.delivery.addressId);
      if (!saved)
        throw new AppError(400, "VALIDATION", "Esa dirección ya no existe; elige otra.", { "delivery.addressId": "Esa dirección ya no existe; elige otra." });
      delivery = { method: "delivery", zoneId: body.delivery.zoneId, name: saved.recipientName, phone: saved.phone, address: saved.line, district: saved.district, reference: saved.reference || undefined };
    } else {
      const r = manualDelivery.safeParse(body.delivery);
      if (!r.success) {
        const fields: Record<string, string> = {};
        for (const issue of r.error.issues) fields[`delivery.${issue.path.join(".")}`] ??= issue.message;
        throw new AppError(400, "VALIDATION", "Revisa los datos ingresados.", fields);
      }
      delivery = { method: "delivery", zoneId: body.delivery.zoneId, ...r.data };
    }

    let shippingCents = 0;
    let zoneName = "";
    if (delivery.method === "delivery") {
      const [zone] = await db.select().from(deliveryZone).where(and(eq(deliveryZone.id, delivery.zoneId), eq(deliveryZone.active, true)));
      if (!zone)
        throw new AppError(400, "VALIDATION", "Esa zona de delivery ya no está disponible.", { "delivery.zoneId": "Esa zona ya no está disponible; elige otra zona." });
      shippingCents = zone.costCents;
      zoneName = zone.name;
    }
    const lines = quote.lines.map((l) => ({
      productId: l.productId, variantId: l.variantId, variantLabel: l.variantLabel, sku: l.sku, name: l.name,
      unitPriceCents: l.unitPriceCents, quantity: l.quantity, imageUrl: l.imageUrl,
    }));
    const totals = orderTotals(lines, shippingCents, quote.coupon?.discountCents ?? 0);
    if (totals.totalCents !== body.expectedTotalCents)
      throw new AppError(409, "PRICE_CHANGED", "El total cambió desde que lo revisaste. Confirma el nuevo total.", undefined, { totalCents: totals.totalCents });

    const couponRow = quote.coupon && body.couponCode ? await findCoupon(db, body.couponCode) : undefined;

    // La tarjeta se decide antes de la transacción: un rechazo no crea nada (HU-16).
    let pay: Parameters<typeof createOrder>[1]["payment"];
    if (body.payment.method === "card") {
      const r = simulateCard({ number: body.payment.cardNumber, expMonth: body.payment.expMonth, expYear: body.payment.expYear, cvv: body.payment.cvv });
      if (r.status === "invalid") throw new AppError(400, "VALIDATION", r.message, { [`payment.${r.field}`]: r.message });
      if (r.status !== "approved") throw new AppError(402, "CARD_REJECTED", r.message);
      pay = { method: "card", status: "approved", cardLast4: r.last4 };
    } else {
      pay = { method: body.payment.method, status: "pending", operationCode: "operationCode" in body.payment ? body.payment.operationCode || undefined : undefined };
    }

    const number = await createOrder(db, {
      userId,
      lines,
      delivery: delivery.method === "delivery" ? { ...delivery, shippingCents } : delivery,
      payment: pay,
      coupon: quote.coupon && couponRow ? { id: couponRow.id, code: couponRow.code, discountCents: quote.coupon.discountCents } : undefined,
    });
    const order = (await loadOrderDetail(db, number, userId))!;
    const link =
      pay.method === "whatsapp"
        ? whatsappUrl(s.whatsappNumber, {
            number,
            items: order.items.map((i) => ({ name: i.name, quantity: i.quantity })),
            totalCents: order.totalCents,
            paymentLabel: PAYMENT_LABEL.whatsapp,
            delivery: delivery.method === "delivery" ? `Delivery a ${zoneName}` : "Recojo en tienda",
          })
        : undefined;
    return c.json({ order, whatsappUrl: link }, 201);
  });
