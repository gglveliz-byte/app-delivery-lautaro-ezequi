CREATE TYPE "public"."order_commerce_status_enum" AS ENUM('preparing', 'ready_for_pickup', 'picked_up');--> statement-breakpoint
CREATE TABLE "order_commerce_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"commerce_id" bigint NOT NULL,
	"status" "order_commerce_status_enum" DEFAULT 'preparing' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "picked_up_commerce_ids" integer[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_commerce_status" ADD CONSTRAINT "order_commerce_status_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_commerce_status" ADD CONSTRAINT "order_commerce_status_commerce_id_commerces_id_fk" FOREIGN KEY ("commerce_id") REFERENCES "public"."commerces"("id") ON DELETE cascade ON UPDATE no action;