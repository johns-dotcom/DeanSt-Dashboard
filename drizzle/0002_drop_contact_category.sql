ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "industry" text;--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "category";--> statement-breakpoint
DROP TYPE IF EXISTS "contact_category";
