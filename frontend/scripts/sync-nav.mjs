#!/usr/bin/env node
/**
 * Regenerates public/assets/starta-nav.js from lib/nav.json.
 *
 * lib/nav.json is the ONE definition of the primary nav. React imports it
 * directly; the static HTML pages cannot import JSON, so this mirrors it into a
 * plain script. Run after editing lib/nav.json:
 *
 *     node scripts/sync-nav.mjs
 *
 * verify-route-aliases.mjs fails the build if the mirror is stale, so a
 * forgotten sync cannot ship.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "public/assets/starta-nav.js");

const nav = JSON.parse(await readFile(path.join(root, "lib/nav.json"), "utf8"));
const current = await readFile(target, "utf8");

const items = JSON.stringify(nav.items, null, 8).replace(/\n/g, "\n    ");
const cta = JSON.stringify(nav.cta);

const next = current
  .replace(/var ITEMS = [\s\S]*?\];/, `var ITEMS = ${items};`)
  .replace(/var CTA = .*?;/, `var CTA = ${cta};`);

if (next === current) {
  console.log("nav mirror already in sync.");
} else {
  await writeFile(target, next, "utf8");
  console.log("nav mirror regenerated from lib/nav.json.");
}
