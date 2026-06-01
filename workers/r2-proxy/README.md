# R2 proxy Worker

A small Cloudflare Worker bound directly to the `deanst` R2 bucket via
the native R2 binding. The Next.js dashboard talks to this Worker over
HTTPS with a shared secret; the Worker performs the actual R2
operations using the binding (no tokens, no SigV4).

Cloudflare's new unified API tokens (`cfat_…`) can't authenticate
against R2's S3 endpoint, so this Worker is the canonical path for
object operations.

## One-time setup

From `workers/r2-proxy/` in this repo:

```bash
# 1. Install wrangler + types (one time)
npm install

# 2. Log in to Cloudflare (opens a browser)
npx wrangler login

# 3. Set the shared secret. Pick any long random string; the same
#    value goes into Railway as R2_WORKER_SECRET.
openssl rand -hex 32 | npx wrangler secret put SHARED_SECRET

# 4. Deploy
npx wrangler deploy
```

The deploy output prints the Worker URL — something like
`https://deanst-r2-proxy.<your-subdomain>.workers.dev`. Set this in
Railway as `R2_WORKER_URL`.

## Required Railway env vars

```
R2_WORKER_URL=https://deanst-r2-proxy.<your-subdomain>.workers.dev
R2_WORKER_SECRET=<the same string used in step 3 above>
```

`R2_BEARER_TOKEN`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and
`R2_ENDPOINT` are no longer used by the app once the Worker is in
place. Safe to delete.

## Routes

- `PUT  /<key>` — upload (raw body, Content-Type honored)
- `GET  /<key>` — download
- `DELETE /<key>` — remove

All require an `X-Internal-Secret: <SHARED_SECRET>` header. Anything
else returns 401.
