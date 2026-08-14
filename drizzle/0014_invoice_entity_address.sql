ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "invoice_entity_address" text NOT NULL DEFAULT E'825 S Le Doux Rd\nLos Angeles, CA, 90035';
--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "invoice_entity_name" SET DEFAULT 'Dean Street Media Inc.';
--> statement-breakpoint
-- The entity name was seeded as the old wordmark and never printed on invoices.
-- Now that it is, move existing workspaces to the legal entity name. Scoped to
-- the seeded value so a workspace that edited its own name is left alone, which
-- also makes this a no-op on re-run.
UPDATE "workspaces" SET "invoice_entity_name" = 'Dean Street Media Inc.' WHERE "invoice_entity_name" = 'DEAN ST CO';
