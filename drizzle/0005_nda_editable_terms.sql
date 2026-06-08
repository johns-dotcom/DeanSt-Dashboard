ALTER TABLE "ndas" ADD COLUMN IF NOT EXISTS "purpose" text;--> statement-breakpoint
ALTER TABLE "ndas" ADD COLUMN IF NOT EXISTS "term_years" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "ndas" ADD COLUMN IF NOT EXISTS "survival_years" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "ndas" ADD COLUMN IF NOT EXISTS "governing_law" text DEFAULT 'California' NOT NULL;--> statement-breakpoint
ALTER TABLE "ndas" ADD COLUMN IF NOT EXISTS "additional_clauses" text;
