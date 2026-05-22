ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "submitted" boolean DEFAULT false NOT NULL;
