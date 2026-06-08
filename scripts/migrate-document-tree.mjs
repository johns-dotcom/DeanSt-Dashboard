/**
 * One-time migration for the document folder tree (0006).
 *
 *   node scripts/migrate-document-tree.mjs
 *
 * 1. Adds parent_id (document_folders) and folder_id (documents) idempotently.
 * 2. Backfills folder_id on existing documents: each document is placed in a
 *    top-level folder named after its subcategory (or category if none),
 *    creating that folder per (workspace, client) if it doesn't exist.
 *
 * Idempotent — only touches documents whose folder_id is still null, and
 * find-or-creates folders so re-runs don't duplicate. Requires DATABASE_URL
 * (env or .env.local).
 */

import postgres from "postgres";
import { readFileSync, existsSync } from "fs";

function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (existsSync(".env.local")) {
    const m = readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.+)$/m);
    if (m) return m[1].trim();
  }
  throw new Error("DATABASE_URL not found");
}

const sql = postgres(dbUrl(), { max: 1 });

const DDL = [
  `ALTER TABLE "document_folders" ADD COLUMN IF NOT EXISTS "parent_id" uuid`,
  `DO $$ BEGIN
     ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_parent_id_fk"
       FOREIGN KEY ("parent_id") REFERENCES "document_folders"("id") ON DELETE cascade;
   EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "folder_id" uuid`,
  `DO $$ BEGIN
     ALTER TABLE "documents" ADD CONSTRAINT "documents_folder_id_fk"
       FOREIGN KEY ("folder_id") REFERENCES "document_folders"("id") ON DELETE set null;
   EXCEPTION WHEN duplicate_object THEN null; END $$`,
];

try {
  for (const stmt of DDL) await sql.unsafe(stmt);
  console.log("Schema columns + FKs ensured.");

  // Backfill in one transaction.
  let foldersCreated = 0;
  let docsPlaced = 0;
  await sql.begin(async (tx) => {
    const docs = await tx`
      select id, workspace_id, client, category, subcategory
      from documents where folder_id is null`;

    // find-or-create cache keyed by workspace|client|name (top-level folders)
    const cache = new Map();
    for (const d of docs) {
      const name = (d.subcategory && d.subcategory.trim()) || d.category;
      const key = `${d.workspace_id}|${d.client}|${name.toLowerCase()}`;
      let folderId = cache.get(key);
      if (!folderId) {
        const [existing] = await tx`
          select id from document_folders
          where workspace_id = ${d.workspace_id} and client = ${d.client}
            and parent_id is null and lower(name) = ${name.toLowerCase()}
          limit 1`;
        if (existing) {
          folderId = existing.id;
        } else {
          const [created] = await tx`
            insert into document_folders (workspace_id, client, name, parent_id, sort_order)
            values (${d.workspace_id}, ${d.client}, ${name}, null,
              coalesce((select max(sort_order) from document_folders
                        where workspace_id = ${d.workspace_id} and client = ${d.client} and parent_id is null), 0) + 1)
            returning id`;
          folderId = created.id;
          foldersCreated++;
        }
        cache.set(key, folderId);
      }
      await tx`update documents set folder_id = ${folderId} where id = ${d.id}`;
      docsPlaced++;
    }
  });

  console.log(`Folders created: ${foldersCreated}`);
  console.log(`Documents placed into folders: ${docsPlaced}`);

  const [{ remaining }] = await sql`select count(*)::int remaining from documents where folder_id is null`;
  console.log(`Documents still at a client root (folder_id null): ${remaining}`);
} finally {
  await sql.end();
}
