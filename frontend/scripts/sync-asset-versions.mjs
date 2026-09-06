#!/usr/bin/env node
/**
 * CONTENT-HASHED ASSET VERSIONS.
 *
 * The static pages load shared scripts with a hand-written cache buster
 * (`/assets/starta-nav.js?v=1`). Hand-written versions get forgotten: the file
 * changes, the query string does not, and every returning visitor keeps running
 * the OLD script. That is exactly how a fixed nav kept rendering broken - the
 * server had the new code, the browser did not.
 *
 * This rewrites every `?v=` for the managed assets to the first 8 hex chars of
 * the file's SHA-1, so the URL changes if and only if the bytes change.
 *
 *     node scripts/sync-asset-versions.mjs
 *
 * verify-route-aliases.mjs fails the build when any page carries a stale hash.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Shared assets whose cache key must track their content. */
export const MANAGED_ASSETS = [
  "manager-logos.js",
  "starta-nav.css",
  "starta-nav.js",
  // The ONE typography contract, loaded by every static page AND by the React
  // root layout. Hashed like the rest so a font-policy change actually reaches
  // returning visitors — an unversioned stylesheet is how a stale nav CSS beat
  // a fresh deploy for weeks.
  "starta-typography.css",
  // The registration gate's appearance, shared by the React tree and the static
  // hubs so a gate cannot look like two different products.
  "starta-gate.css",
  "starta-gate.js",
  // Keeps the watchlist gate's promise: the account, not just this browser.
  "starta-watchlist.js",
  "starta-auth-nav.js",
  "starta-i18n.js",
  "starta-lang-boot.js",
  "starta-theme.js",
  "starta-mobile-nav.js",
];

export async function assetHashes() {
  const out = {};
  for (const name of MANAGED_ASSETS) {
    try {
      const buf = await readFile(path.join(root, "public/assets", name));
      out[name] = createHash("sha1").update(buf).digest("hex").slice(0, 8);
    } catch {
      // asset not present in this checkout
    }
  }
  return out;
}

async function run() {
  const hashes = await assetHashes();
  const files = (await readdir(path.join(root, "public"))).filter((f) => f.endsWith(".html"));
  let changed = 0;

  for (const file of files) {
    const full = path.join(root, "public", file);
    const original = await readFile(full, "utf8");
    let text = original;

    for (const [name, hash] of Object.entries(hashes)) {
      const escaped = name.replace(/\./g, "\\.");
      // ONLY inside a quoted src/href attribute. An earlier version matched any
      // occurrence, including an unquoted mention inside a JS comment, where the
      // greedy [^"']* ran on to the next quote and ate a page's dictionary on
      // the second run. The quote is captured and required, so the match can
      // never cross out of the attribute.
      text = text.replace(
        new RegExp(`((?:src|href)=")(/assets/${escaped})(?:\\?v=[^"]*)?(")`, "g"),
        `$1$2?v=${hash}$3`
      );
    }

    if (text !== original) {
      await writeFile(full, text, "utf8");
      changed += 1;
    }
  }

  // React cannot read the HTML, so publish the hashes it needs as a module.
  await writeFile(
    path.join(root, "lib/asset-versions.json"),
    JSON.stringify(hashes, null, 2) + "\n",
    "utf8"
  );

  console.log(
    changed
      ? `asset versions synced in ${changed} page(s).`
      : "asset versions already current."
  );
  for (const [name, hash] of Object.entries(hashes)) console.log(`  ${name} -> ${hash}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await run();
