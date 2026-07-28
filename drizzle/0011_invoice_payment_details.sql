ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "invoice_entity_name" text NOT NULL DEFAULT 'DEAN ST CO';
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "invoice_contact_name" text NOT NULL DEFAULT 'John Skead';
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "invoice_contact_email" text NOT NULL DEFAULT 'john@deanst.co';
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "invoice_bank_name" text NOT NULL DEFAULT 'JP Morgan Chase';
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "invoice_bank_address" text NOT NULL DEFAULT E'31250 Palos Verdes Dr W\nRancho Palos Verdes, CA, 90275';
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "invoice_account_number" text NOT NULL DEFAULT '953162333';
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "invoice_routing_number" text NOT NULL DEFAULT '322271627';
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "invoice_payee_name" text NOT NULL DEFAULT 'Jacob Allen';
