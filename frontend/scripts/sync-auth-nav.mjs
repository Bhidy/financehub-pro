#!/usr/bin/env node
/**
 * Regenerates the mirrored constants in public/assets/starta-auth-nav.js from
 * lib/auth-nav.json.
 *
 * lib/auth-nav.json is the ONE definition of the session storage keys, the
 * account routes and the four nav labels. React imports it directly
 * (lib/auth-session.ts, components/seo/NavAuth.tsx, lib/auth-i18n.ts); the
 * static HTML pages cannot import JSON, so this mirrors it into the plain
 * script they load. Run after editing lib/auth-nav.json:
 *
 *     node scripts/sync-auth-nav.mjs
 *
 * verify-route-aliases.mjs fails the build if the mirror is stale, so the three
 * nav renderers cannot drift apart — which is exactly how the site ended up
 * with an auth-aware SiteNav nobody could reach and two hardcoded ones.
 *
 * Same contract as scripts/sync-nav.mjs; keep the two in step.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "public/assets/starta-auth-nav.js");
const source = path.join(root, "lib/auth-nav.json");

/** Indent a JSON block to sit inside the IIFE's `var X = …;` declarations. */
function block(value) {
  return JSON.stringify(value, null, 8).replace(/\n/g, "\n    ");
}

/** The exact text the mirror region should contain for a given contract. */
export function renderMirror(authNav) {
  return [
    `    var STORAGE = ${block(authNav.storage)};`,
    `    var ROUTES = ${block(authNav.routes)};`,
    `    var LABELS = ${block(authNav.labels)};`,
  ].join("\n");
}

const BEGIN = "    /* ── mirrored from lib/auth-nav.json ─────────────────────────────── */\n";
const END = "\n    /* ── end mirror ──────────────────────────────────────────────────── */";

/** Current mirror text inside starta-auth-nav.js, or null if the markers moved. */
export function extractMirror(script) {
  const start = script.indexOf(BEGIN);
  const end = script.indexOf(END, start);
  if (start === -1 || end === -1) return null;
  return script.slice(start + BEGIN.length, end);
}

export async function readContract() {
  return JSON.parse(await readFile(source, "utf8"));
}

async function run() {
  const authNav = await readContract();
  const script = await readFile(target, "utf8");
  const current = extractMirror(script);

  if (current === null) {
    console.error(
      "auth-nav mirror markers not found in public/assets/starta-auth-nav.js — " +
        "restore the '── mirrored from lib/auth-nav.json ──' / '── end mirror ──' comments."
    );
    process.exit(1);
  }

  const next = renderMirror(authNav);
  if (current === next) {
    console.log("auth-nav mirror already in sync.");
    return;
  }

  const start = script.indexOf(BEGIN) + BEGIN.length;
  const end = script.indexOf(END, start);
  await writeFile(target, script.slice(0, start) + next + script.slice(end), "utf8");
  console.log("auth-nav mirror regenerated from lib/auth-nav.json.");
}

// Only run when invoked directly — verify-route-aliases.mjs imports the helpers.
if (import.meta.url === `file://${process.argv[1]}`) {
  await run();
}
