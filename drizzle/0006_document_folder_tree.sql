ALTER TABLE "document_folders" ADD COLUMN IF NOT EXISTS "parent_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "document_folders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "folder_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "document_folders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
