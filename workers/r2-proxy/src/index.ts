/**
 * R2 proxy Worker.
 *
 * A tiny Cloudflare Worker bound to the R2 bucket via wrangler config.
 * The Next.js app proxies object PUT / GET / DELETE through here using
 * a shared secret. The Worker uses its R2 binding directly — no tokens,
 * no SigV4. The binding *is* the authorization, configured at deploy
 * time in wrangler.toml.
 *
 * Routes:
 *   PUT    /:key   →  upload object (raw body, Content-Type from header)
 *   GET    /:key   →  download object
 *   DELETE /:key   →  delete object
 *
 * Auth: every request must include `X-Internal-Secret` matching the
 * SHARED_SECRET secret set via `wrangler secret put SHARED_SECRET`.
 */

export interface Env {
  BUCKET: R2Bucket;
  SHARED_SECRET: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    // Verify shared secret on every request
    const supplied = req.headers.get("x-internal-secret");
    if (!env.SHARED_SECRET || supplied !== env.SHARED_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    // Strip the leading slash; the rest is the object key (slashes preserved)
    const key = decodeURIComponent(url.pathname.slice(1));
    if (!key) return new Response("Missing key", { status: 400 });

    try {
      if (req.method === "PUT") {
        const contentType = req.headers.get("content-type") ?? "application/octet-stream";
        await env.BUCKET.put(key, req.body, {
          httpMetadata: { contentType },
        });
        return Response.json({ ok: true });
      }

      if (req.method === "GET") {
        const obj = await env.BUCKET.get(key);
        if (!obj) return new Response("Not found", { status: 404 });
        return new Response(obj.body, {
          headers: {
            "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
            "content-length": obj.size.toString(),
          },
        });
      }

      if (req.method === "DELETE") {
        await env.BUCKET.delete(key);
        return new Response(null, { status: 204 });
      }

      return new Response("Method not allowed", { status: 405 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return new Response(`R2 binding error: ${message}`, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
