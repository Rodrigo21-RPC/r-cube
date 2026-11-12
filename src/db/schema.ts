import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
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
  },
  (t) => [index("product_image_product_idx").on(t.productId, t.position)],
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
    quantity: integer("quantity").notNull(),
    /** Último precio que vio el cliente; solo sirve para avisar cambios (HU-13), nunca para cobrar. */
    seenPriceCents: integer("seen_price_cents"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("cart_item_user_product_uq").on(t.userId, t.productId),
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
