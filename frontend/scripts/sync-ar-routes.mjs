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

/** Collect every `app/ar/**\/page.tsx` and turn it into its base route. */
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
      } else if (e.name === "page.tsx" && rel) {
        // Dynamic segments ([slug]) become prefix matches: the helper already
        // treats "/Learn" as covering "/Learn/anything".
        const route = rel.replace(/\/\[[^\]]+\]/g, "");
        if (route) found.add(route);
      }
    }
  }

  await walk(base, "");

  // Keep only the shortest distinct prefixes — "/Learn" already covers
  // "/Learn/glossary", and a shorter list is cheaper to match at click time.
  const all = [...found].sort();
  return all.filter((r) => !all.some((other) => other !== r && r.startsWith(`${other}/`)));
}

async function run() {
  const routes = await deriveArRoutes();
  await writeFile(OUT_JSON, `${JSON.stringify({ routes }, null, 2)}\n`, "utf8");

  // Mirror into the browser boot script, which cannot import JSON.
  const js = await readFile(MIRROR, "utf8");
  const next = js.replace(
    /var AR_TWIN_ROUTES = \[[^\]]*\];/,
    `var AR_TWIN_ROUTES = ${JSON.stringify(routes)};`
  );
  if (next !== js) await writeFile(MIRROR, next, "utf8");

  console.log(`ar twin routes synced (${routes.length}):`);
  routes.forEach((r) => console.log(`  ${r}`));
}

if (import.meta.url === `file://${process.argv[1]}`) await run();
