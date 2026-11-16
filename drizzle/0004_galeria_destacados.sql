ALTER TABLE "product" ADD COLUMN "tagline" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "highlights" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "product_image" ADD COLUMN "origin" text DEFAULT 'subida' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_image" ADD COLUMN "credit_author" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_image" ADD COLUMN "credit_license" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_image" ADD COLUMN "credit_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_tagline_max" CHECK (char_length("product"."tagline") <= 90);--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_highlights_valid" CHECK (jsonb_typeof("product"."highlights") = 'array' and jsonb_array_length("product"."highlights") <= 5);--> statement-breakpoint
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_origin_valid" CHECK ("product_image"."origin" in ('subida','proyecto','externa','tarjeta'));--> statement-breakpoint
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_credit_required" CHECK ("product_image"."origin" <> 'externa' or ("product_image"."credit_author" <> '' and "product_image"."credit_license" <> '' and "product_image"."credit_url" <> ''));
--> statement-breakpoint
-- Las fotos estáticas que ya existen son las aportadas por el proyecto; las de R2 conservan el valor por defecto «subida» (FR-031).
UPDATE "product_image" SET "origin" = 'proyecto' WHERE "r2_key" IS NULL;
