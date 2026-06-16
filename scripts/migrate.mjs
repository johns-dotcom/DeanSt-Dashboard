/**
 * Deploy-time migration runner.
 *
 * Applies every migration listed in drizzle/meta/_journal.json (in order) that
 * hasn't been recorded in the `_migrations` table yet, then records it. Every
 * migration in drizzle/*.sql is written to be idempotent (IF NOT EXISTS /
 * duplicate_object guards / ON CONFLICT), so re-running is always safe — the
 * tracking table is just an optimization, not a correctness requirement. This
 * means there is no fragile "baseline" step: on a database that already has the
 * schema, the first run simply no-ops through the existing migrations.
 *
 * Run via `npm run db:deploy` (wired into the Railway pre-deploy command).
 * Pass --dry to list what would run without connecting to the database.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRIZZLE = path.join(ROOT, "drizzle");
const DRY = process.argv.includes("--dry");

function loadEnvLocal() {
  // Convenience for local runs; in deploy DATABASE_URL comes from the env.
  if (process.env.DATABASE_URL) return;
  const f = path.join(ROOT, ".env.local");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
  }
}

function statementsFor(tag) {
  const sql = fs.readFileSync(path.join(DRIZZLE, `${tag}.sql`), "utf8");
  return sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
}

const journal = JSON.parse(fs.readFileSync(path.join(DRIZZLE, "meta", "_journal.json"), "utf8"));
const tags = journal.entries.sort((a, b) => a.idx - b.idx).map((e) => e.tag);

if (DRY) {
  console.log("[migrate] dry run — migrations in journal:");
  for (const tag of tags) console.log(`  ${tag}  (${statementsFor(tag).length} statements)`);
  process.exit(0);
}

loadEnvLocal();
if (!process.env.DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const { default: postgres } = await import("postgres");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  await sql`CREATE TABLE IF NOT EXISTS "_migrations" (
    "tag" text PRIMARY KEY,
    "applied_at" timestamptz NOT NULL DEFAULT now()
  )`;
  const done = new Set((await sql`SELECT tag FROM "_migrations"`).map((r) => r.tag));

  let applied = 0;
  for (const tag of tags) {
    if (done.has(tag)) continue;
    const statements = statementsFor(tag);
    console.log(`[migrate] applying ${tag} (${statements.length} statements)…`);
    await sql.begin(async (tx) => {
      for (const stmt of statements) await tx.unsafe(stmt);
      await tx`INSERT INTO "_migrations" ("tag") VALUES (${tag}) ON CONFLICT DO NOTHING`;
    });
    applied += 1;
  }
  console.log(applied ? `[migrate] done — applied ${applied} migration(s).` : "[migrate] up to date — nothing to apply.");
} catch (err) {
  console.error("[migrate] failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
