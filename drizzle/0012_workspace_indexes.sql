CREATE INDEX IF NOT EXISTS "invoices_workspace_idx" ON "invoices" ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deals_workspace_idx" ON "deals" ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_workspace_name_idx" ON "contacts" ("workspace_id", "name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_workspace_idx" ON "tasks" ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ndas_workspace_idx" ON "ndas" ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nda_files_workspace_nda_idx" ON "nda_files" ("workspace_id", "nda_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoice_receipts_workspace_invoice_idx" ON "invoice_receipts" ("workspace_id", "invoice_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_events_workspace_created_idx" ON "activity_events" ("workspace_id", "created_at");
