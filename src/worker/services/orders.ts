import { and, asc, eq, sql } from "drizzle-orm";
import { schema, type Db } from "@db/client";
import { orderTotals } from "@shared/money";
import { CANCELLABLE_BY_CUSTOMER, type OrderStatus } from "@shared/order-status";
import type { OrderDetail, PaymentMethodCode } from "@shared/types";
import { AppError } from "../middleware";
import { applyStockChange, recordMovement, type Tx } from "./stock";
import { lockProduct, syncProductFromVariants } from "./variants";

const { orders, orderItem, payment, orderEvent, product, productVariant, cartItem, deliveryZone, storeSettings } = schema;

export type Actor = { type: "cliente" | "administrador" | "sistema"; userId: string | null };

export interface NewOrder {
  userId: string;
  lines: {
    productId: string;
    variantId?: string | null;
    variantLabel?: string | null;
    sku?: string | null;
    name: string;
    unitPriceCents: number;
    quantity: number;
    imageUrl: string;
  }[];
  delivery:
    | { method: "pickup" }
    | { method: "delivery"; zoneId: string; shippingCents: number; name: string; phone: string; address: string; district: string; reference?: string };
  payment: { method: PaymentMethodCode; status: "approved" | "pending"; cardLast4?: string; operationCode?: string };
}

/**
 * Crea el pedido en una sola transacción: descuenta stock con UPDATE condicional, numera con la
 * secuencia, congela nombre y precio, registra pago y primer evento, y vacía el carrito (RN-02, RN-03, RN-07).
 */
export async function createOrder(db: Db, input: NewOrder): Promise<string> {
  return db.transaction(async (tx) => {
    const sold: { productId: string; variantId: string | null; quantity: number; after: number }[] = [];
    // Orden estable por producto: dos pedidos con los mismos productos nunca se bloquean entre sí.
    for (const l of [...input.lines].sort((a, b) => a.productId.localeCompare(b.productId) || (a.variantId ?? "").localeCompare(b.variantId ?? ""))) {
      const shown = l.variantLabel ? `${l.name} (${l.variantLabel})` : l.name;
      if (l.variantId) {
        // Con variante se bloquea el producto para serializar y se descuenta el stock de la variante (research R1).
        await lockProduct(tx, l.productId);
        const [row] = await tx
          .update(productVariant)
          .set({ stock: sql`${productVariant.stock} - ${l.quantity}::int` })
          .where(
            and(
              eq(productVariant.id, l.variantId),
              eq(productVariant.productId, l.productId),
              eq(productVariant.active, true),
              sql`${productVariant.stock} >= ${l.quantity}::int`,
              sql`exists(select 1 from product p where p.id = ${productVariant.productId} and p.active)`,
            ),
          )
          .returning({ priceCents: productVariant.priceCents, after: productVariant.stock });
        if (!row) throw new AppError(409, "STOCK", `Ya no hay stock suficiente de ${shown}. Revisa tu carrito.`, undefined, { productId: l.productId, variantId: l.variantId });
        if (row.priceCents !== l.unitPriceCents)
          throw new AppError(409, "PRICE_CHANGED", `El precio de ${shown} cambió. Revisa el nuevo total antes de pagar.`);
        await syncProductFromVariants(tx, l.productId);
        sold.push({ productId: l.productId, variantId: l.variantId, quantity: l.quantity, after: row.after });
        continue;
      }
      const [row] = await tx
        .update(product)
        .set({ stock: sql`${product.stock} - ${l.quantity}::int` })
        .where(and(eq(product.id, l.productId), eq(product.active, true), eq(product.hasVariants, false), sql`${product.stock} >= ${l.quantity}::int`))
        .returning({ priceCents: product.priceCents, after: product.stock });
      if (!row) throw new AppError(409, "STOCK", `Ya no hay stock suficiente de ${l.name}. Revisa tu carrito.`, undefined, { productId: l.productId });
      if (row.priceCents !== l.unitPriceCents)
        throw new AppError(409, "PRICE_CHANGED", `El precio de ${l.name} cambió. Revisa el nuevo total antes de pagar.`);
      sold.push({ productId: l.productId, variantId: null, quantity: l.quantity, after: row.after });
    }
    const shipping = input.delivery.method === "delivery" ? input.delivery.shippingCents : 0;
    const totals = orderTotals(input.lines, shipping, 0);
    const status: OrderStatus = input.payment.status === "approved" ? "paid" : "pending_payment";
    const [{ seq } = { seq: 0 }] = (await tx.execute(sql`select nextval('order_number_seq')::int as seq`)) as unknown as { seq: number }[];
    const id = crypto.randomUUID();
    const number = `RC-${String(seq).padStart(6, "0")}`;
    const d = input.delivery;
    await tx.insert(orders).values({
      id,
      number,
      userId: input.userId,
      status,
      deliveryMethod: d.method,
      deliveryZoneId: d.method === "delivery" ? d.zoneId : null,
      shipName: d.method === "delivery" ? d.name : null,
      shipPhone: d.method === "delivery" ? d.phone : null,
      shipAddress: d.method === "delivery" ? d.address : null,
      shipDistrict: d.method === "delivery" ? d.district : null,
      shipReference: d.method === "delivery" ? d.reference || null : null,
      ...totals,
      paymentMethod: input.payment.method,
    });
    await tx.insert(orderItem).values(
      input.lines.map((l) => ({
        id: crypto.randomUUID(),
        orderId: id,
        productId: l.productId,
        productName: l.name,
        variantId: l.variantId ?? null,
        variantLabel: l.variantLabel ?? null,
        sku: l.sku ?? null,
        unitPriceCents: l.unitPriceCents,
        quantity: l.quantity,
        lineTotalCents: l.unitPriceCents * l.quantity,
        imageUrl: l.imageUrl,
      })),
    );
    await tx.insert(payment).values({
      id: crypto.randomUUID(),
      orderId: id,
      method: input.payment.method,
      status: input.payment.status,
      amountCents: totals.totalCents,
      cardLast4: input.payment.cardLast4 ?? null,
      operationCode: input.payment.operationCode ?? null,
    });
    await tx.insert(orderEvent).values({
      id: crypto.randomUUID(),
      orderId: id,
      fromStatus: null,
      toStatus: status,
      actorType: "cliente",
      actorUserId: input.userId,
    });
    // Historial de stock de la venta (FR-013); el stock ya se descontó arriba.
    for (const s of sold) {
      await recordMovement(tx, {
        productId: s.productId,
        variantId: s.variantId,
        delta: -s.quantity,
        before: s.after + s.quantity,
        after: s.after,
        source: "venta",
        orderId: id,
        actor: { type: "cliente", userId: input.userId },
      });
    }
    await tx.delete(cartItem).where(eq(cartItem.userId, input.userId));
    return number;
  });
}

/**
 * Cancela un pedido si su estado está entre los permitidos, devuelve el stock y deja el motivo (RN-10).
 * Bloquea la fila para que una cancelación concurrente (cliente y vencimiento) solo ocurra una vez.
 */
export async function cancelOrder(
  db: Db,
  orderId: string,
  actor: Actor,
  reason: string,
  allowedFrom: ReadonlySet<OrderStatus> = CANCELLABLE_BY_CUSTOMER,
  /** Se ejecuta dentro de la misma transacción si la cancelación procede (auditoría, pago rechazado). */
  alsoInTx?: (tx: Tx, fromStatus: OrderStatus) => Promise<void>,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [current] = (await tx.execute(sql`select status from orders where id = ${orderId} for update`)) as unknown as {
      status: OrderStatus;
    }[];
    if (!current || !allowedFrom.has(current.status)) return false;
    await tx.update(orders).set({ status: "cancelled" }).where(eq(orders.id, orderId));
    const lines = await tx
      .select({ productId: orderItem.productId, variantId: orderItem.variantId, quantity: orderItem.quantity })
      .from(orderItem)
      .where(eq(orderItem.orderId, orderId))
      .orderBy(asc(orderItem.productId), asc(orderItem.variantId));
    for (const l of lines) {
      await applyStockChange(tx, { productId: l.productId, variantId: l.variantId, delta: l.quantity, source: "cancelacion", orderId, actor });
    }
    await tx.insert(orderEvent).values({
      id: crypto.randomUUID(),
      orderId,
      fromStatus: current.status,
      toStatus: "cancelled",
      actorType: actor.type,
      actorUserId: actor.userId,
      reason,
    });
    if (alsoInTx) await alsoInTx(tx, current.status);
    return true;
  });
}

/** Detalle de un pedido; con userId solo devuelve los del dueño (RN-08). */
export async function loadOrderDetail(db: Db, number: string, userId?: string): Promise<OrderDetail | null> {
  const where = userId ? and(eq(orders.number, number), eq(orders.userId, userId)) : eq(orders.number, number);
  const [o] = await db
    .select({ order: orders, zoneName: deliveryZone.name })
    .from(orders)
    .leftJoin(deliveryZone, eq(deliveryZone.id, orders.deliveryZoneId))
    .where(where);
  if (!o) return null;
  const id = o.order.id;
  const [items, [pay], events, [settings]] = await Promise.all([
    db.select().from(orderItem).where(eq(orderItem.orderId, id)).orderBy(asc(orderItem.productName)),
    db.select().from(payment).where(eq(payment.orderId, id)),
    db.select().from(orderEvent).where(eq(orderEvent.orderId, id)).orderBy(asc(orderEvent.createdAt)),
    db.select({ pickupAddress: storeSettings.pickupAddress }).from(storeSettings).where(eq(storeSettings.id, 1)),
  ]);
  const ord = o.order;
  return {
    number: ord.number,
    createdAt: ord.createdAt.toISOString(),
    status: ord.status,
    totalCents: ord.totalCents,
    deliveryMethod: ord.deliveryMethod,
    zoneName: o.zoneName,
    shipping:
      ord.deliveryMethod === "delivery"
        ? { name: ord.shipName ?? "", phone: ord.shipPhone ?? "", address: ord.shipAddress ?? "", district: ord.shipDistrict ?? "", reference: ord.shipReference ?? "" }
        : null,
    pickupAddress: ord.deliveryMethod === "pickup" ? (settings?.pickupAddress ?? null) : null,
    items: items.map((i) => ({
      productId: i.productId,
      name: i.productName,
      variantLabel: i.variantLabel,
      sku: i.sku,
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
      lineTotalCents: i.lineTotalCents,
      imageUrl: i.imageUrl,
    })),
    couponCode: ord.couponCode,
    totals: {
      subtotalCents: ord.subtotalCents,
      shippingCents: ord.shippingCents,
      discountCents: ord.discountCents,
      taxableBaseCents: ord.taxableBaseCents,
      igvCents: ord.igvCents,
      totalCents: ord.totalCents,
    },
    payment: {
      method: ord.paymentMethod,
      status: pay?.status ?? "pending",
      cardLast4: pay?.cardLast4 ?? null,
      operationCode: pay?.operationCode ?? null,
    },
    events: events.map((e) => ({
      fromStatus: (e.fromStatus as OrderStatus | null) ?? null,
      toStatus: e.toStatus as OrderStatus,
      actor: e.actorType,
      reason: e.reason,
      createdAt: e.createdAt.toISOString(),
    })),
    canCancel: CANCELLABLE_BY_CUSTOMER.has(ord.status),
  };
}
