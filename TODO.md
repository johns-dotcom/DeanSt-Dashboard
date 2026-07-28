# TODO

## Improvement backlog (prioritized 2026-07-27) — ✅ shipped 2026-07-28

All 12 items below were implemented and deployed to production. Notes on
partial scope and follow-ups are called out where relevant.

### 🔴 Correctness & security

1. ✅ **Enforce editor role on mutations.** `requireEditor()` added and applied to every mutating server action. (`2592e8f`)
2. ✅ **Invoice payee/bank details → workspace config.** Moved to the `workspaces` row (migration `0011`), rendered from one source in preview + PDF, editable in settings. (`035124e`)
3. ✅ **Removed unscoped `listClients` / `listClientPages`** (dead cross-tenant IDOR surface). (`5f87824`)
4. ✅ **Hardened uploads** — size cap, content-type allowlist, dangerous-extension block, safe `Content-Disposition` + `nosniff`. (`e2cdf6e`)

### 🟡 Reliability & UX

5. ✅ **Mobile navigation** — hamburger + slide-in drawer sharing the sidebar body. (`5eb62e4`)
6. ✅ **Delete handlers + server-action try/catch** — failures surface as error toasts. (`90e430b`)
7. ✅ **Orphaned-R2 logging** — `deleteObjectBestEffort` logs leaks instead of swallowing. (`c862c11`)

### 🟢 Foundational

8. ✅ **Tests + CI** — 33 tests via Node's built-in runner; GitHub Actions on push/PR. (Switched off vitest — its esbuild dep drifted the lockfile and broke Railway `npm ci`.) (`f378f4b`)
9. ✅ **`editorMutation` wrapper + `byId`/`inWorkspace` scope helpers**, adopted in deals/contacts as the reference pattern; other domains can adopt incrementally. (`75757c5`)
10. ✅ **Decomposed `logo-client.tsx`** (903 → 418 lines) into `logo-art.ts` + `logo-download.ts`. **Follow-up:** `ndas-client.tsx` (791) and `invoices-client.tsx` (734) still to do. (`2f94ae1`)
11. ✅ **Workspace indexes** (migration `0012`) on the list tables. **Deferred:** full server-side pagination/search — the rich client-side filtering would regress, and it isn't warranted at current scale. (`f15a155`)
12. ✅ **Deduped `fmtSize` → `formatFileSize`** in `lib/utils` (+ test). (`0e2efb1`)

### Remaining manual op (from item 12)

- **Rotate the over-shared R2 token to a bucket-scoped one.** `lib/r2.ts` documents that the current R2 API token is shared with another app (over-privileged beyond the `deanst` bucket). Create a Cloudflare R2 API token scoped to **only** the `deanst` bucket and replace `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` in Railway's production variables. Requires Cloudflare dashboard access — can't be done in code.

---

## Inline document editing (Documents page)

**Goal:** Let users edit documents inline in the app (the ask was "like a Google Doc").

**Status:** Deferred — scoping not finished (2026-06-09).

**Context / what's been figured out so far:**
- Documents are uploaded files stored in R2 (mostly **PDFs**, sometimes other types) with metadata in Postgres. Current per-document actions are only Move / View / Download / Delete — no edit or rename.
- True "Google-Docs-style" editing isn't possible on PDFs: they're fixed-layout, so rewriting the body text reliably would need a lossy convert-out/convert-back step that breaks formatting (signatures, tables, legal layout).
- **Decided:** single-editor at a time (only one user edits a given doc in practice) — skip real-time collaboration / CRDT+websocket infra unless that changes.

**Open decisions to resolve before building:**
1. What "edit" actually means for PDFs — pick one to start:
   - Markup & annotate (highlight, comments, text boxes, draw) — feasible
   - Form-fill / template completion (name, date, amounts, signature) — robust for contracts
   - Rewrite body text like a doc — NOT recommended for PDFs (unreliable)
2. Tooling/budget:
   - Open-source/free (PDF.js render + pdf-lib write-back) — no license cost, more dev effort
   - Commercial PDF SDK (Nutrient/PSPDFKit, Apryse) — polished, paid annual license
3. Save behavior: replace original in place vs. save edited version as a new version alongside it.
4. Non-PDF files: leave as view/download, or add a separate native rich-text doc type for in-app authoring.
