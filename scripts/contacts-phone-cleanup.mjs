/**
 * contacts-phone-cleanup.mjs
 *
 * Some contacts have non-phone data sitting in the `phone` column (e.g. a
 * state like "TN", or a note like "Last Agency: R…"). This script proposes
 * moving those values into the proper `city` / `notes` columns.
 *
 * It NEVER touches the database in plan mode. Two phases:
 *
 *   1. node scripts/contacts-phone-cleanup.mjs --plan
 *        Reads phone values, classifies the non-phone ones, and writes a
 *        reviewable plan to  contacts_phone_cleanup.plan.json  (gitignored,
 *        contains PII). Prints only aggregate counts to the console.
 *
 *   2. <review / edit the plan JSON by hand — delete or retarget any row>
 *
 *   3. node scripts/contacts-phone-cleanup.mjs --apply
 *        Applies exactly what's in the plan file, inside one transaction,
 *        with optimistic concurrency (only updates rows whose phone still
 *        matches what was planned). Clears phone on moved rows.
 *
 * Requires DATABASE_URL in the environment or in .env.local.
 */

import postgres from "postgres";
import { readFileSync, writeFileSync, existsSync } from "fs";

const PLAN_FILE = "contacts_phone_cleanup.plan.json";

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (existsSync(".env.local")) {
    const m = readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.+)$/m);
    if (m) return m[1].trim();
  }
  throw new Error("DATABASE_URL not found (env or .env.local)");
}

/** Does this value look like an actual phone number? */
function isPhoneLike(raw) {
  const s = String(raw).trim();
  const digits = (s.match(/\d/g) || []).length;
  if (digits < 7) return false;
  // whole string must be phone-shaped: digits, separators, +, and an optional extension
  return /^[+(]?[\d\s().\-/]+(?:\s*(?:ext\.?|x)\s*\d+)?$/i.test(s);
}

/** Where should a non-phone value go? */
function classify(raw) {
  const t = String(raw).trim();
  // Short, letter-led, no colon, <=3 words → looks like a place (incl. state abbrevs like "TN")
  const looksLikePlace =
    /^[A-Za-z][A-Za-z .,'\-]{0,28}$/.test(t) && !t.includes(":") && t.split(/\s+/).length <= 3;
  return looksLikePlace ? "city" : "notes";
}

function appendNote(existing, addition) {
  const a = (existing ?? "").trim();
  if (!a) return addition;
  if (a.includes(addition)) return a; // avoid dupes on re-runs
  return `${a} · ${addition}`;
}

async function plan(sql) {
  const rows = await sql`
    select id, name, phone, city, notes
    from contacts
    where phone is not null and btrim(phone) <> ''`;

  const proposals = [];
  let leave = 0;
  const counts = { city: 0, notes: 0 };

  for (const r of rows) {
    if (isPhoneLike(r.phone)) {
      leave++;
      continue;
    }
    const value = r.phone.trim();
    let target = classify(value);
    // If the chosen target already has content, divert a place value to notes
    // rather than clobbering an existing city.
    if (target === "city" && r.city && r.city.trim()) target = "notes";

    const newValue =
      target === "city" ? value : appendNote(r.notes, value);

    proposals.push({
      id: r.id,
      name: r.name,
      fromPhone: r.phone,
      target,
      currentTargetValue: target === "city" ? (r.city ?? null) : (r.notes ?? null),
      newTargetValue: newValue,
    });
    counts[target]++;
  }

  writeFileSync(PLAN_FILE, JSON.stringify({ generatedFrom: rows.length, proposals }, null, 2));

  console.log(`Scanned ${rows.length} contacts with a phone value.`);
  console.log(`  phone-like (left untouched): ${leave}`);
  console.log(`  → propose move to city:      ${counts.city}`);
  console.log(`  → propose move to notes:     ${counts.notes}`);
  console.log(`\nWrote ${proposals.length} proposals to ${PLAN_FILE}`);
  console.log("Review/edit that file, then run with --apply.");
}

async function apply(sql) {
  if (!existsSync(PLAN_FILE)) throw new Error(`No ${PLAN_FILE} — run --plan first.`);
  const { proposals } = JSON.parse(readFileSync(PLAN_FILE, "utf8"));
  if (!Array.isArray(proposals) || proposals.length === 0) {
    console.log("No proposals to apply.");
    return;
  }

  let applied = 0;
  let skipped = 0;
  await sql.begin(async (tx) => {
    for (const p of proposals) {
      const col = p.target === "city" ? "city" : "notes";
      // Optimistic concurrency: only touch the row if phone is unchanged.
      const res = await tx.unsafe(
        `update contacts set "${col}" = $1, phone = null, updated_at = now()
         where id = $2 and phone = $3`,
        [p.newTargetValue, p.id, p.fromPhone],
      );
      if (res.count === 1) applied++;
      else skipped++;
    }
  });

  console.log(`Applied ${applied} moves. Skipped ${skipped} (phone changed since plan).`);
}

async function main() {
  const mode = process.argv.includes("--apply") ? "apply" : process.argv.includes("--plan") ? "plan" : null;
  if (!mode) {
    console.error("Usage: node scripts/contacts-phone-cleanup.mjs --plan | --apply");
    process.exit(1);
  }
  const sql = postgres(getDatabaseUrl(), { max: 1 });
  try {
    if (mode === "plan") await plan(sql);
    else await apply(sql);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
