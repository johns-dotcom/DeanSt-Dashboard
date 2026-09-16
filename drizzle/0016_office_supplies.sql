DO $$ BEGIN
  CREATE TYPE "supply_request_status" AS ENUM ('requested', 'ordered', 'received');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "category" text,
  "vendor" text,
  "reorder_url" text,
  "unit_label" text DEFAULT 'ea' NOT NULL,
  "unit_cost" numeric(12, 2),
  "quantity_on_hand" integer DEFAULT 0 NOT NULL,
  "location" text,
  "needs_reorder" boolean DEFAULT false NOT NULL,
  "notes" text,
  "created_by" uuid REFERENCES "workspace_members"("id") ON DELETE set null,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supply_purchases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "supply_id" uuid NOT NULL REFERENCES "supplies"("id") ON DELETE cascade,
  "purchased_on" date DEFAULT now() NOT NULL,
  "vendor" text,
  "quantity" integer DEFAULT 1 NOT NULL,
  "total_cost" numeric(12, 2),
  "notes" text,
  "created_by" uuid REFERENCES "workspace_members"("id") ON DELETE set null,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supply_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "item" text NOT NULL,
  "supply_id" uuid REFERENCES "supplies"("id") ON DELETE set null,
  "quantity" integer,
  "status" "supply_request_status" DEFAULT 'requested' NOT NULL,
  "notes" text,
  "requested_by" uuid REFERENCES "workspace_members"("id") ON DELETE set null,
  "requested_by_name" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplies_workspace_idx" ON "supplies" ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supply_purchases_workspace_supply_idx" ON "supply_purchases" ("workspace_id", "supply_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supply_requests_workspace_idx" ON "supply_requests" ("workspace_id");
