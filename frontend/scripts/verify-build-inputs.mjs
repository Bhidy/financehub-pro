#!/usr/bin/env node
/**
 * BUILD-INPUT TRACKING GATE.
 *
 * WHY THIS EXISTS
 * .gitignore carries a blanket `*.json`. A new config the build reads
 * (lib/nav.json) was therefore never committed. Everything passed locally —
 * the file was on disk — and three consecutive production builds failed with
 * ENOENT while `ship.sh --verify` reported the site healthy, because Vercel
 * keeps serving the last good deploy when a build fails. The fix looked live
 * and was not.
 *
 * This asserts that every file the build actually reads is tracked by git, so
 * the failure is caught on the machine that made it, not in CI 90 seconds later.
 *
 * Detects:
 *   · `@/lib/*.json` (and relative .json) imports in app/ and components/
 *   · local files opened by scripts/*.mjs via readFile(... "lib/x", "public/y")
 *   · an explicit list of assets the static pages load
 */
import { readFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.resolve(root, "..");

/** Assets the static HTML loads by URL; a missing one breaks the site silently. */
const REQUIRED_ASSETS = [
  "frontend/public/assets/starta-nav.js",
  "frontend/public/assets/starta-i18n.js",
  "frontend/public/assets/starta-lang-boot.js",
  "frontend/public/assets/starta-theme.js",
];

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (/\.(tsx?|mjs)$/.test(e.name)) out.push(full);
  }
  return out;
}

async function discoverInputs() {
  const needed = new Set(REQUIRED_ASSETS);

  const files = await walk(path.join(root, "app")).then((a) =>
    walk(path.join(root, "components"), a).then((b) => walk(path.join(root, "scripts"), b))
  );

  for (const file of files) {
    // Skip this file: its own documentation names example paths.
    if (file.endsWith("verify-build-inputs.mjs")) continue;
    const raw = await readFile(file, "utf8");
    // Strip comments so documented example paths are not treated as inputs.
    const text = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    // import x from '@/lib/thing.json'
    for (const m of text.matchAll(/from\s+['"]@\/([\w./-]+\.json)['"]/g)) {
      needed.add(`frontend/${m[1]}`);
    }
    // readFile(path.join(root, "lib/thing.json"))  /  "public/assets/x.js"
    for (const m of text.matchAll(/["'](lib\/[\w./-]+\.json|public\/assets\/[\w./-]+\.js)["']/g)) {
      needed.add(`frontend/${m[1]}`);
    }
  }
  return [...needed].sort();
}

async function tracked(files) {
  const { stdout } = await run("git", ["ls-files", "--", ...files], { cwd: repo, maxBuffer: 8e6 });
  return new Set(stdout.split("\n").filter(Boolean));
}

async function main() {
  const needed = await discoverInputs();
  const inGit = await tracked(needed);
  const missing = needed.filter((f) => !inGit.has(f));

  if (missing.length) {
    console.error("FAIL: build inputs are not tracked by git — the deploy WILL fail:\n");
    for (const f of missing) console.error(`  · ${f}`);
    console.error(
      "\nThe repo's blanket `*.json` ignore is the usual cause. Fix with:\n" +
        missing.map((f) => `  git add -f ${f}`).join("\n") +
        "\nand add a `!` exception in .gitignore so it stays tracked.\n"
    );
    process.exit(1);
  }
  console.log(`PASS: build inputs tracked (${needed.length} checked).`);
}

main().catch((error) => {
  console.error("FAIL: build-input gate crashed.", error);
  process.exit(1);
});
