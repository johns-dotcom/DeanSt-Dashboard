ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "drive_folder_id" text;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "drive_file_id" text;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "drive_link" text;
