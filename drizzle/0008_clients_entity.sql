-- First-class clients entity + link document folders/files to it.

CREATE TABLE IF NOT EXISTS "clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_workspace_slug_unique" UNIQUE("workspace_id","slug");
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_workspace_name_unique" UNIQUE("workspace_id","name");
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Backfill one client per distinct (workspace, client name) from existing
-- folders + documents. Slug = kebab-cased name, with -2/-3 suffix on collision.
INSERT INTO "clients" ("workspace_id", "name", "slug")
SELECT workspace_id, name,
  CASE WHEN rn = 1 THEN base_slug ELSE base_slug || '-' || rn::text END
FROM (
  SELECT workspace_id, name, base_slug,
    row_number() OVER (PARTITION BY workspace_id, base_slug ORDER BY name) AS rn
  FROM (
    SELECT DISTINCT workspace_id, name,
      COALESCE(NULLIF(regexp_replace(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''), 'client') AS base_slug
    FROM (
      SELECT workspace_id, client AS name FROM "document_folders"
      UNION
      SELECT workspace_id, client AS name FROM "documents"
    ) names
  ) slugged
) ranked
ON CONFLICT ("workspace_id","name") DO NOTHING;--> statement-breakpoint

ALTER TABLE "document_folders" ADD COLUMN IF NOT EXISTS "client_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "client_id" uuid;--> statement-breakpoint

UPDATE "document_folders" f
SET "client_id" = c.id
FROM "clients" c
WHERE c.workspace_id = f.workspace_id AND c.name = f.client AND f.client_id IS NULL;--> statement-breakpoint

UPDATE "documents" d
SET "client_id" = c.id
FROM "clients" c
WHERE c.workspace_id = d.workspace_id AND c.name = d.client AND d.client_id IS NULL;--> statement-breakpoint

ALTER TABLE "document_folders" ALTER COLUMN "client_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "client_id" SET NOT NULL;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
