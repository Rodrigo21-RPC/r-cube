import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------- Better Auth

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role", { enum: ["cliente", "administrador"] }).notNull().default("cliente"),
  phone: text("phone"),
  addressLine: text("address_line"),
  district: text("district"),
  addressReference: text("address_reference"),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  blocked: boolean("blocked").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

// ---------------------------------------------------------------- Catálogo

export const category = pgTable("category", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const brand = pgTable("brand", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export type ProductSpec = { label: string; value: string };

export const product = pgTable(
  "product",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    brandId: text("brand_id")
      .notNull()
      .references(() => brand.id),
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id),
    description: text("description").notNull().default(""),
    specs: jsonb("specs").$type<ProductSpec[]>().notNull().default([]),
    priceCents: integer("price_cents").notNull(),
    compareAtCents: integer("compare_at_cents"),
    stock: integer("stock").notNull().default(0),
    /** Resumen derivado de las variantes (feature 003, research R1): lo mantiene syncProductFromVariants. */
    hasVariants: boolean("has_variants").notNull().default(false),
    maxPriceCents: integer("max_price_cents"),
    active: boolean("active").notNull().default(true),
    searchText: text("search_text").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("product_price_positive", sql`${t.priceCents} > 0`),
    check("product_stock_non_negative", sql`${t.stock} >= 0`),
    index("product_active_category_idx").on(t.active, t.categoryId),
    index("product_active_created_idx").on(t.active, t.createdAt.desc()),
    index("product_active_price_idx").on(t.active, t.priceCents),
  ],
);

export const productImage = pgTable(
  "product_image",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull(),
    position: integer("position").notNull().default(0),
    /** Clave del archivo en R2; null en las fotos estáticas de demostración (HU-31). */
    r2Key: text("r2_key"),
  },
  (t) => [index("product_image_product_idx").on(t.productId, t.position)],
);

// ---------------------------------------------------------------- Variantes (003)

/** Opción vendible de un producto con su propio SKU, precio y stock (HU-43, HU-44). */
export const productVariant = pgTable(
  "product_variant",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    color: text("color").notNull().default(""),
    storage: text("storage").notNull().default(""),
    ram: text("ram").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    stock: integer("stock").notNull().default(0),
    imageId: text("image_id").references(() => productImage.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("product_variant_price_positive", sql`${t.priceCents} > 0`),
    check("product_variant_stock_non_negative", sql`${t.stock} >= 0`),
    check("product_variant_sku_format", sql`${t.sku} ~ '^[A-Z0-9_-]{3,40}$'`),
    check("product_variant_attr_length", sql`char_length(${t.color}) <= 40 and char_length(${t.storage}) <= 40 and char_length(${t.ram}) <= 40`),
    check("product_variant_has_attribute", sql`${t.color} <> '' or ${t.storage} <> '' or ${t.ram} <> ''`),
    uniqueIndex("product_variant_sku_uq").on(t.sku),
    uniqueIndex("product_variant_combo_uq").on(t.productId, t.color, t.storage, t.ram),
    index("product_variant_product_idx").on(t.productId, t.active),
  ],
);

// ---------------------------------------------------------------- Carrito

export const cartItem = pgTable(
  "cart_item",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariant.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    /** Último precio que vio el cliente; solo sirve para avisar cambios (HU-13), nunca para cobrar. */
    seenPriceCents: integer("seen_price_cents"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("cart_item_line_uq").on(t.userId, t.productId, sql`coalesce(${t.variantId}, '')`),
    check("cart_item_quantity_positive", sql`${t.quantity} >= 1`),
  ],
);

// ---------------------------------------------------------------- Configuración

export const deliveryZone = pgTable("delivery_zone", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  costCents: integer("cost_cents").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const PAYMENT_METHODS = ["card", "yape_plin", "transfer", "whatsapp"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const storeSettings = pgTable("store_settings", {
  id: integer("id").primaryKey().default(1),
  whatsappNumber: text("whatsapp_number").notNull(),
  yapeNumber: text("yape_number").notNull(),
  plinNumber: text("plin_number").notNull(),
  yapeQrUrl: text("yape_qr_url").notNull(),
  bankName: text("bank_name").notNull(),
  bankHolder: text("bank_holder").notNull(),
  bankAccount: text("bank_account").notNull(),
  bankCci: text("bank_cci").notNull(),
  pickupAddress: text("pickup_address").notNull(),
  enabledMethods: text("enabled_methods").array().$type<PaymentMethod[]>().notNull(),
});

// ---------------------------------------------------------------- Pedidos

export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 1 });

export type OrderStatusDb = "pending_payment" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    status: text("status", {
      enum: ["pending_payment", "paid", "preparing", "shipped", "delivered", "cancelled"],
    }).notNull(),
    deliveryMethod: text("delivery_method", { enum: ["pickup", "delivery"] }).notNull(),
    deliveryZoneId: text("delivery_zone_id").references(() => deliveryZone.id),
    shippingCents: integer("shipping_cents").notNull(),
    shipName: text("ship_name"),
    shipPhone: text("ship_phone"),
    shipAddress: text("ship_address"),
    shipDistrict: text("ship_district"),
    shipReference: text("ship_reference"),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    couponId: text("coupon_id").references(() => coupon.id),
    couponCode: text("coupon_code"),
    totalCents: integer("total_cents").notNull(),
    taxableBaseCents: integer("taxable_base_cents").notNull(),
    igvCents: integer("igv_cents").notNull(),
    paymentMethod: text("payment_method", { enum: PAYMENT_METHODS }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_user_created_idx").on(t.userId, t.createdAt.desc()),
    index("orders_status_created_idx").on(t.status, t.createdAt),
  ],
);

export const orderItem = pgTable(
  "order_item",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id),
    productName: text("product_name").notNull(),
    variantId: text("variant_id").references(() => productVariant.id),
    variantLabel: text("variant_label"),
    sku: text("sku"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
    imageUrl: text("image_url"),
  },
  (t) => [index("order_item_order_idx").on(t.orderId)],
);

export const payment = pgTable("payment", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  method: text("method", { enum: PAYMENT_METHODS }).notNull(),
  status: text("status", { enum: ["approved", "pending", "rejected", "confirmed"] }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  cardLast4: text("card_last4"),
  operationCode: text("operation_code"),
  createdAt: createdAt(),
});

export const orderEvent = pgTable(
  "order_event",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actorType: text("actor_type", { enum: ["cliente", "administrador", "sistema"] }).notNull(),
    actorUserId: text("actor_user_id").references(() => user.id),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [index("order_event_order_idx").on(t.orderId, t.createdAt)],
);

// ---------------------------------------------------------------- Administración (002)

export const STOCK_SOURCES = ["inicial", "ajuste", "venta", "cancelacion"] as const;
export type StockSource = (typeof STOCK_SOURCES)[number];

/** Historial de cada cambio de stock (HU-33, FR-011). */
export const stockMovement = pgTable(
  "stock_movement",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariant.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    stockBefore: integer("stock_before").notNull(),
    stockAfter: integer("stock_after").notNull(),
    source: text("source", { enum: STOCK_SOURCES }).notNull(),
    orderId: text("order_id").references(() => orders.id),
    reason: text("reason"),
    actorType: text("actor_type", { enum: ["cliente", "administrador", "sistema"] }).notNull(),
    actorUserId: text("actor_user_id").references(() => user.id),
    createdAt: createdAt(),
  },
  (t) => [
    check("stock_movement_delta_nonzero", sql`${t.delta} <> 0`),
    check("stock_movement_after_non_negative", sql`${t.stockAfter} >= 0`),
    index("stock_movement_product_idx").on(t.productId, t.createdAt.desc()),
  ],
);

export const AUDIT_ACTIONS = [
  "producto_creado",
  "producto_editado",
  "precio_cambiado",
  "producto_estado",
  "foto",
  "categoria",
  "marca",
  "stock_ajustado",
  "pedido_estado",
  "pago_confirmado",
  "pago_rechazado",
  "cliente_bloqueado",
  "cliente_reactivado",
  "configuracion",
  "zona",
  "variante",
  "cupon",
  "resena_oculta",
  "resena_visible",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Registro de acciones del panel; solo se inserta, nunca se edita (HU-42). */
export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id),
    action: text("action", { enum: AUDIT_ACTIONS }).notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    entityLabel: text("entity_label").notNull(),
    detail: text("detail").notNull(),
    data: jsonb("data").$type<{ before?: unknown; after?: unknown }>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_log_created_idx").on(t.createdAt.desc()),
    index("audit_log_action_idx").on(t.action, t.createdAt.desc()),
  ],
);

// ---------------------------------------------------------------- Experiencia avanzada (003)

/** Productos guardados por un cliente (HU-45). */
export const favorite = pgTable(
  "favorite",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] }), index("favorite_user_idx").on(t.userId, t.createdAt.desc())],
);

/** Reseña de un producto entregado; una por producto y cliente (HU-46, HU-47, RN-09). */
export const review = pgTable(
  "review",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    check("review_rating_range", sql`${t.rating} between 1 and 5`),
    check("review_comment_length", sql`${t.comment} is null or char_length(${t.comment}) <= 1000`),
    uniqueIndex("review_product_user_uq").on(t.productId, t.userId),
    index("review_product_visible_idx").on(t.productId, t.createdAt.desc()).where(sql`not ${t.hidden}`),
    index("review_created_idx").on(t.createdAt.desc()),
  ],
);

/** Dirección guardada de un cliente; solo una predeterminada (HU-48). */
export const address = pgTable(
  "address",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    recipientName: text("recipient_name").notNull(),
    phone: text("phone").notNull().default(""),
    line: text("line").notNull(),
    district: text("district").notNull(),
    reference: text("reference"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("address_default_uq").on(t.userId).where(sql`${t.isDefault}`),
    index("address_user_idx").on(t.userId, t.createdAt.desc()),
  ],
);

export const COUPON_KINDS = ["percent", "fixed"] as const;
export type CouponKind = (typeof COUPON_KINDS)[number];

/** Cupón de descuento; las vigencias son días calendario de Lima (HU-49, HU-50). */
export const coupon = pgTable(
  "coupon",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    kind: text("kind", { enum: COUPON_KINDS }).notNull(),
    value: integer("value").notNull(),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    endsOn: date("ends_on", { mode: "string" }).notNull(),
    maxUses: integer("max_uses").notNull(),
    usedCount: integer("used_count").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("coupon_code_format", sql`${t.code} ~ '^[A-Z0-9-]{3,20}$'`),
    check(
      "coupon_value_range",
      sql`(${t.kind} = 'percent' and ${t.value} between 1 and 90) or (${t.kind} = 'fixed' and ${t.value} >= 100)`,
    ),
    check("coupon_dates_order", sql`${t.endsOn} >= ${t.startsOn}`),
    check("coupon_max_uses_positive", sql`${t.maxUses} >= 1`),
    check("coupon_used_non_negative", sql`${t.usedCount} >= 0`),
    uniqueIndex("coupon_code_uq").on(t.code),
  ],
);

/** Aviso dentro de la app sobre un cambio de estado de un pedido (HU-53). */
export const notification = pgTable(
  "notification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    orderNumber: text("order_number").notNull(),
    message: text("message").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notification_user_idx").on(t.userId, t.readAt, t.createdAt.desc())],
);
