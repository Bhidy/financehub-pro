#!/usr/bin/env node
/**
 * ARABIC TWIN ROUTES — derived from the filesystem, never hand-written.
 *
 * WHY THIS EXISTS
 * Server routes carry the language IN the url (`/Learn/x` ↔ `/ar/Learn/x`).
 * A link built without the `/ar` prefix silently drops an Arabic reader onto
 * the English page. The list of twinned routes was hand-maintained in THREE
 * places (starta-lang-boot.js, PublicPageShell's const, and an inline script in
 * the same file) and every copy listed exactly two routes — while twenty
 * `app/ar/**` routes actually existed. So /Learn/{slug}, /Funds/{id},
 * /companies, /sectors, /markets/* and /symbol/{id} all flipped to English.
 *
 * `app/ar/**\/page.tsx` IS the truth about which routes have an Arabic twin, so
 * the list is generated from it. A hand-written list can drift; a derived one
 * cannot.
 *
 *     node scripts/sync-ar-routes.mjs
 *
 * verify-route-aliases.mjs re-derives and fails the build if the checked-in
 * list is stale.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_JSON = path.join(root, "lib/ar-twin-routes.json");
const MIRROR = path.join(root, "public/assets/starta-lang-boot.js");

/**
 * Collect every `app/ar/**\/{page.tsx,route.ts}` and turn it into its base route.
 *
 * `route.ts` COUNTS. The designed hubs (/ar/Funds, /ar/News, /ar/Learn,
 * /ar/Market-Pulse) are Route Handlers, not pages, and scanning only page.tsx
 * missed them: /News had an Arabic twin for months that this list never knew
 * about, so `startaLocalizedHref` left every news link un-prefixed and dropped
 * Arabic readers onto the English hub — the exact failure this file exists to
 * prevent. /Funds and /Learn were in the list only by accident, because their
 * `[id]`/`[slug]` children happen to be page.tsx.
 */
export async function deriveArRoutes() {
  const base = path.join(root, "app/ar");
  const found = new Set();

  async function walk(dir, rel) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        await walk(path.join(dir, e.name), `${rel}/${e.name}`);
      } else if ((e.name === "page.tsx" || e.name === "route.ts") && rel) {
        found.add(rel);
      }
    }
  }

  await walk(base, "");

  // ── ROUTE PATHS, dynamic segments INTACT ────────────────────────────────
  // Previously these were flattened (`/News/[id]` -> `/News`) and then
  // prefix-matched, which asserted that an Arabic twin of a PARENT covers
  // every child. It does not. `app/ar/News/route.ts` exists but
  // `app/ar/News/[id]` does not, so the helper rewrote every article link to
  // /ar/News/{id} and produced a 404 on all 4,584 articles; the same held for
  // /ar/symbol/{id}/{metric}. Keeping the segments lets us emit an exact
  // pattern per route, so a path is prefixed only when its OWN Arabic twin
  // exists, and adding one re-enables prefixing automatically.
  const paths = [...found].sort();

  // Legacy flattened list — still consumed by the build gate and kept so a
  // route's presence is easy to assert. It is NOT what the click-time helper
  // matches against any more.
  const flattened = [...new Set(paths.map((r) => r.replace(/\/\[[^\]]+\]/g, "")).filter(Boolean))].sort();
  const routes = flattened.filter((r) => !flattened.some((o) => o !== r && r.startsWith(`${o}/`)));

  // Anchored regex sources: "[slug]" -> one path segment, everything else literal.
  const patterns = paths.map((r) => {
    const body = r
      .split("/")
      .filter(Boolean)
      .map((seg) => (/^\[.+\]$/.test(seg) ? "[^/]+" : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
      .join("/");
    return `^/${body}$`;
  });

  return { routes, patterns: [...new Set(patterns)].sort() };
}

async function run() {
  const { routes, patterns } = await deriveArRoutes();
  await writeFile(OUT_JSON, `${JSON.stringify({ routes, patterns }, null, 2)}\n`, "utf8");

  // Mirror into the browser boot script, which cannot import JSON.
  const js = await readFile(MIRROR, "utf8");
  let next = js.replace(
    /var AR_TWIN_ROUTES = \[[^\]]*\];/,
    `var AR_TWIN_ROUTES = ${JSON.stringify(routes)};`
  );
  next = next.replace(
    /var AR_TWIN_PATTERNS = \[[^\]]*\];/,
    `var AR_TWIN_PATTERNS = ${JSON.stringify(patterns)};`
  );
  if (next !== js) await writeFile(MIRROR, next, "utf8");

  console.log(`ar twin routes synced (${routes.length} routes, ${patterns.length} patterns)`);
  patterns.forEach((r) => console.log(`  ${r}`));
}

if (import.meta.url === `file://${process.argv[1]}`) await run();
