# Dean St — Operations Dashboard

Internal operations dashboard for a music-industry management company. Tracks invoices & reimbursements, recording / brand deals, contacts, tasks, and client documents — with invite-only auth, role-based access, and PDF invoice generation.

## Stack

- **Next.js 14** (App Router) + TypeScript (strict)
- **Railway** for Postgres + Next.js hosting
- **Drizzle ORM** + plain SQL migrations
- **Auth.js v5** — Google OAuth + email/password credentials, JWT sessions
- **Cloudflare R2** — document storage (S3-compatible, presigned URLs for upload + download)
- **Resend** — invite emails
- **@react-pdf/renderer** — invoice PDF generation
- Tailwind CSS, shadcn-style primitives (Radix), lucide icons, sonner toasts

## Setup

### 1. Install

```bash
npm install
```

### 2. Railway: Postgres + app

1. Create a Railway project at https://railway.app.
2. Click **+ New → Database → Add PostgreSQL**.
3. Click **+ New → GitHub Repo** and connect this repository (after pushing it to GitHub).
4. On the Next.js service, click **Variables → Reference Variables** and add `DATABASE_URL` referencing the Postgres service.
5. Set all other env vars (see below) on the Next.js service.
6. Railway deploys automatically. The `start` script (`next start`) serves the app on the auto-assigned port.

For local dev, copy the Postgres `DATABASE_URL` from Railway's connection panel (or run Postgres locally with `brew install postgresql && createdb deanst`) and put it in `.env.local`.

### 3. Run the migration

After setting `DATABASE_URL`:

```bash
npm run db:push
```

This applies `drizzle/0000_init.sql` to the database. For subsequent schema changes, edit `lib/db/schema.ts` then run:

```bash
npm run db:generate   # creates a new SQL file in drizzle/
npm run db:migrate    # applies it
```

### 4. Google OAuth

1. Go to https://console.cloud.google.com → APIs & Services → Credentials.
2. **Create Credentials → OAuth client ID → Web application**.
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://deanst-dashboard-production.up.railway.app/api/auth/callback/google` (prod)
4. Copy the Client ID and Client Secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

Google sign-in is restricted to `@deanst.co` accounts. Toggle this in **Settings → Authentication**.

### 5. Cloudflare R2 (documents)

1. https://dash.cloudflare.com → R2 → **Create bucket** → name it `deanst-documents` (or whatever you set as `R2_BUCKET`).
2. R2 → **Manage R2 API Tokens → Create API Token**. Permission: **Object Read & Write**, scope to the bucket. Save the Access Key ID and Secret Access Key.
3. Note your **Account ID** from the R2 sidebar.
4. Add to env vars:
   ```
   R2_ACCOUNT_ID=<your-account-id>
   R2_ACCESS_KEY_ID=<from token>
   R2_SECRET_ACCESS_KEY=<from token>
   R2_BUCKET=deanst-documents
   ```

The endpoint is derived from the account ID. CORS for the bucket should allow your app's origin:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://deanst-dashboard-production.up.railway.app"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

Set this under your bucket → **Settings → CORS Policy**.

### 6. Resend (invite emails)

1. https://resend.com → API Keys → create one.
2. Verify a sending domain (or use Resend's test domain for dev).
3. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.

If Resend isn't configured, invite links are surfaced in the UI as toasts so admins can paste them directly.

### 7. Generate `AUTH_SECRET`

```bash
openssl rand -base64 32
```

Put the result in `AUTH_SECRET`.

### 8. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
DATABASE_URL=postgres://...
AUTH_SECRET=<generated>
AUTH_URL=http://localhost:3000
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=deanst-documents
RESEND_API_KEY=...
RESEND_FROM_EMAIL=Dean St <invites@deanst.co>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 9. Run

```bash
npm run dev
```

Visit http://localhost:3000.

## First-time use

1. Sign up by signing in once (any method) — the first user is sent to `/onboarding` to name the workspace.
2. From **Settings → Team members**, invite teammates. The invite link is emailed via Resend.
3. Invited teammates click the link, create or sign in with their account, and are added with the role you specified.

## Deploy to Railway

1. Push the repo to GitHub.
2. In Railway, connect the repo (Step 2.3 above).
3. Set all env vars in the Railway dashboard.
4. Push to `main` — Railway redeploys automatically.

Railway sets a public domain like `<service>.up.railway.app`. Update `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to that domain, and add the corresponding Google OAuth redirect URI.

## Project layout

```
app/
  login/                Sign-in page
  invite/[token]/       Invite acceptance UI
  onboarding/           First user creates their workspace
  api/
    auth/[...nextauth]/ Auth.js handler
    invite/[token]/...  POST signup + accept invite
    invoices/[id]/pdf   Stream invoice PDF
    onboarding          POST bootstrap workspace
  dashboard/            All authenticated pages
    layout.tsx          Sidebar + topbar shell
    page.tsx            Overview
    invoices/           List + slide-over editor + preview + PDF download
    deals/              Pipeline
    contacts/           Card grid rolodex
    tasks/              My / others split, priority bars
    documents/          Per-client folders + R2 uploads
    settings/           Appearance, profile, team, workspace, auth
components/
  ui/                   Primitive components (Button, Dialog, etc.)
  dashboard/            Composed dashboard components
lib/
  db/                   Drizzle schema + connection
  auth/workspace.ts     requireSession() helper
  pdf/invoice-pdf.tsx   @react-pdf/renderer document
  email/invite-template.tsx
  r2.ts                 Cloudflare R2 client + presigned URL helpers
auth.config.ts          Edge-safe auth config (used by middleware)
auth.ts                 Full auth config (with Drizzle adapter + credentials)
drizzle.config.ts       Drizzle Kit config
drizzle/                Generated SQL migrations
middleware.ts           Session refresh + /dashboard guard (Edge Runtime)
```

## Conventions

- Workspace scoping is enforced at the **application layer**: every query in a server action or page filters by `workspaceId`, derived from `requireSession()`. There is no RLS.
- Mutations live in `app/dashboard/<page>/actions.ts` server actions, validated with Zod, then `revalidatePath()` refreshes the page's server components.
- Theme switching uses Tailwind's `class` strategy. A pre-hydration `<ThemeScript>` reads `localStorage` to avoid a flash.
- Auth.js v5 uses a split config (`auth.config.ts` edge-safe, `auth.ts` full) so the middleware doesn't import the database driver.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run typecheck` — strict TypeScript check
- `npm run lint` — ESLint
- `npm run db:generate` — generate a new migration from `schema.ts`
- `npm run db:migrate` — apply pending migrations
- `npm run db:push` — push schema directly (skips migration files; useful for first setup)
