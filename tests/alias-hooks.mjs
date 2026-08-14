/**
 * Resolves the project's "@/…" path alias for `node --test`.
 *
 * App and lib code imports as "@/lib/utils" (the tsconfig `paths` alias), which
 * bundlers understand but Node's ESM resolver does not. Without this, any module
 * under test that imports another project module fails with ERR_MODULE_NOT_FOUND
 * — and the alternative (extensionless relative imports) can't work either,
 * since Node needs the extension while the app tsconfig forbids writing it.
 *
 * Registered by tests/aliases.mjs, which `npm test` loads via --import.
 */
import { statSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const CANDIDATES = ["", ".ts", ".tsx", ".mjs", ".js", "/index.ts"];

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = new URL(specifier.slice(2), ROOT);
    for (const ext of CANDIDATES) {
      const candidate = new URL(base.href + ext);
      try {
        if (statSync(candidate).isFile()) return nextResolve(candidate.href, context);
      } catch {
        // Not this extension — keep probing.
      }
    }
  }
  return nextResolve(specifier, context);
}
