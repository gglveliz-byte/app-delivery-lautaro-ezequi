ALTER TYPE "public"."role" ADD VALUE 'merchant';--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "password_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" varchar(255);