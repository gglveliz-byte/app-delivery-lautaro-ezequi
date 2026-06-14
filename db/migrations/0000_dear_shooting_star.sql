CREATE TYPE "public"."available_status" AS ENUM('yes', 'no');--> statement-breakpoint
CREATE TYPE "public"."commerce_status" AS ENUM('active', 'inactive', 'suspended', 'pending');--> statement-breakpoint
CREATE TYPE "public"."driver_status" AS ENUM('online', 'busy', 'offline');--> statement-breakpoint
CREATE TYPE "public"."earnings_type" AS ENUM('delivery_fee', 'tip', 'bonus');--> statement-breakpoint
CREATE TYPE "public"."featured_status" AS ENUM('yes', 'no');--> statement-breakpoint
CREATE TYPE "public"."open_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('received', 'accepted', 'preparing', 'driver_assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."read_status" AS ENUM('yes', 'no');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."sender_type" AS ENUM('customer', 'commerce', 'driver');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"icon" varchar(100),
	"color" varchar(7),
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"sender_type" "sender_type" NOT NULL,
	"sender_id" bigint NOT NULL,
	"sender_name" varchar(200),
	"message" text NOT NULL,
	"is_read" "read_status" DEFAULT 'no' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"logo" text,
	"cover_image" text,
	"category_id" bigint NOT NULL,
	"address" text NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(200),
	"min_order" numeric(10, 2) DEFAULT '0.00',
	"delivery_time" varchar(50),
	"rating" numeric(2, 1) DEFAULT '4.0',
	"status" "commerce_status" DEFAULT 'pending' NOT NULL,
	"is_open" "open_status" DEFAULT 'open' NOT NULL,
	"open_hours" text,
	"commission_rate" numeric(5, 2) DEFAULT '10.00',
	"lat" numeric(10, 8),
	"lng" numeric(11, 8),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "driver_earnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"driver_id" bigint NOT NULL,
	"order_id" bigint NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"type" "earnings_type" DEFAULT 'delivery_fee' NOT NULL,
	"date" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"vehicle" varchar(100),
	"license_plate" varchar(20),
	"status" "driver_status" DEFAULT 'offline' NOT NULL,
	"current_lat" numeric(10, 8),
	"current_lng" numeric(11, 8),
	"rating" numeric(2, 1) DEFAULT '4.5',
	"total_earnings" numeric(10, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"commerce_id" bigint NOT NULL,
	"product_name" varchar(200) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"status" varchar(50) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" bigint NOT NULL,
	"driver_id" bigint,
	"status" "order_status" DEFAULT 'received' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"delivery_fee" numeric(10, 2) DEFAULT '2.50',
	"commission" numeric(10, 2) DEFAULT '0.00',
	"total" numeric(10, 2) NOT NULL,
	"payment_method" "payment_method" DEFAULT 'cash' NOT NULL,
	"delivery_address" text NOT NULL,
	"customer_phone" varchar(20),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"commerce_id" bigint NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"image" text,
	"category" varchar(100),
	"is_featured" "featured_status" DEFAULT 'no' NOT NULL,
	"is_available" "available_status" DEFAULT 'yes' NOT NULL,
	"preparation_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"unionId" varchar(255) NOT NULL,
	"name" varchar(255),
	"email" varchar(320),
	"avatar" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignInAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_unionId_unique" UNIQUE("unionId")
);
