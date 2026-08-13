ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "invoice_wire_routing_number" text NOT NULL DEFAULT '021000021';
