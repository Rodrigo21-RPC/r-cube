CREATE TABLE "address" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"recipient_name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"line" text NOT NULL,
	"district" text NOT NULL,
	"reference" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"kind" text NOT NULL,
	"value" integer NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"max_uses" integer NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_code_format" CHECK ("coupon"."code" ~ '^[A-Z0-9-]{3,20}$'),
	CONSTRAINT "coupon_value_range" CHECK (("coupon"."kind" = 'percent' and "coupon"."value" between 1 and 90) or ("coupon"."kind" = 'fixed' and "coupon"."value" >= 100)),
	CONSTRAINT "coupon_dates_order" CHECK ("coupon"."ends_on" >= "coupon"."starts_on"),
	CONSTRAINT "coupon_max_uses_positive" CHECK ("coupon"."max_uses" >= 1),
	CONSTRAINT "coupon_used_non_negative" CHECK ("coupon"."used_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "favorite" (
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_user_id_product_id_pk" PRIMARY KEY("user_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"order_id" text NOT NULL,
	"order_number" text NOT NULL,
	"message" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variant" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"sku" text NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"storage" text DEFAULT '' NOT NULL,
	"ram" text DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"image_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variant_price_positive" CHECK ("product_variant"."price_cents" > 0),
	CONSTRAINT "product_variant_stock_non_negative" CHECK ("product_variant"."stock" >= 0),
	CONSTRAINT "product_variant_sku_format" CHECK ("product_variant"."sku" ~ '^[A-Z0-9_-]{3,40}$'),
	CONSTRAINT "product_variant_attr_length" CHECK (char_length("product_variant"."color") <= 40 and char_length("product_variant"."storage") <= 40 and char_length("product_variant"."ram") <= 40),
	CONSTRAINT "product_variant_has_attribute" CHECK ("product_variant"."color" <> '' or "product_variant"."storage" <> '' or "product_variant"."ram" <> '')
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_rating_range" CHECK ("review"."rating" between 1 and 5),
	CONSTRAINT "review_comment_length" CHECK ("review"."comment" is null or char_length("review"."comment") <= 1000)
);
--> statement-breakpoint
DROP INDEX "cart_item_user_product_uq";--> statement-breakpoint
ALTER TABLE "cart_item" ADD COLUMN "variant_id" text;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "variant_id" text;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "variant_label" text;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "has_variants" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "max_price_cents" integer;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD COLUMN "variant_id" text;--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_image_id_product_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."product_image"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "address_default_uq" ON "address" USING btree ("user_id") WHERE "address"."is_default";--> statement-breakpoint
CREATE INDEX "address_user_idx" ON "address" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_code_uq" ON "coupon" USING btree ("code");--> statement-breakpoint
CREATE INDEX "favorite_user_idx" ON "favorite" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notification" USING btree ("user_id","read_at","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "product_variant_sku_uq" ON "product_variant" USING btree ("sku");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variant_combo_uq" ON "product_variant" USING btree ("product_id","color","storage","ram");--> statement-breakpoint
CREATE INDEX "product_variant_product_idx" ON "product_variant" USING btree ("product_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "review_product_user_uq" ON "review" USING btree ("product_id","user_id");--> statement-breakpoint
CREATE INDEX "review_product_visible_idx" ON "review" USING btree ("product_id","created_at" DESC NULLS LAST) WHERE not "review"."hidden";--> statement-breakpoint
CREATE INDEX "review_created_idx" ON "review" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_coupon_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupon"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_item_line_uq" ON "cart_item" USING btree ("user_id","product_id",coalesce("variant_id", ''));--> statement-breakpoint
-- HU-48, FR-019: la dirección única de la feature 001 pasa a ser la primera dirección guardada (predeterminada).
INSERT INTO "address" ("id", "user_id", "label", "recipient_name", "phone", "line", "district", "reference", "is_default")
SELECT gen_random_uuid()::text, u."id", 'Principal', u."name", coalesce(u."phone", ''), u."address_line", coalesce(u."district", ''), u."address_reference", true
FROM "user" u
WHERE u."address_line" IS NOT NULL AND u."address_line" <> '';
