DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspace_number_unique" UNIQUE("workspace_id","invoice_number");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
