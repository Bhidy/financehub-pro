#!/usr/bin/env node
/**
 * i18n COVERAGE GATE — the forever-fix for "English text on an Arabic page".
 *
 * WHY THIS EXISTS
 * The static pages (public/*.html) are ONE document per route. Language is not
 * a separate render: an inline dictionary swaps text at runtime via
 * `applyTranslations(lang)`, which only touches elements carrying `data-key`.
 *
 * That design has exactly three failure modes, and all three are invisible in
 * review because the page looks perfect in English:
 *
 *   1. UNKEYED TEXT   — a visible string with no `data-key` anywhere above it.
 *                       It can never translate. It is English forever.
 *   2. MISSING KEY    — `data-key="x"` exists but `translations.ar.x` does not.
 *                       applyTranslations does `if (dict[key])` and silently
 *                       skips, leaving the English markup default on screen.
 *   3. KEY DRIFT      — a key in one dictionary and not the other.
 *
 * Hand-auditing cannot hold this line: every new element is a new chance to
 * leak. So the invariant is machine-checked here and enforced in the build.
 *
 * Run: node scripts/verify-i18n-coverage.mjs [--report]
 *   --report prints every finding instead of the first few (used for audits).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT = process.argv.includes("--report");

/** Static pages that ship their own inline dictionary. */
const PAGES = [
  "home.html",
  "marketplace.html",
  "learn.html",
  "learn-topic.html",
  "news.html",
  "news-article.html",
  "fund-compare.html",
  "fund-details.html",
  "market-pulse.html",
  "privacy.html",
  "terms.html",
];

/**
 * Strings that are legitimately identical in both languages and therefore need
 * no key. Kept deliberately tight — every entry is a hole in the gate.
 */
const LANGUAGE_NEUTRAL = [
  /^[\s\d.,:;%+\-–—/\\()[\]{}|·•→←↑↓°$€£¥]*$/u,      // punctuation / numbers only
  /^(starta|starta markets|egx|egx30|nav|ytd|3m|1y|3y|5y|dcf|peg|roe|roa|rsi|api|ai|ios|android|s\.a\.e|sae)$/i,
  /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,          // email
  /^https?:\/\//i,                                      // url
  /^[A-Z]{2,6}$/,                                       // ticker-like token
  /^©\s*\d{4}/,
  /^EGX\s?\d{2,3}$/i,                                  // index proper name
];

const isNeutral = (s) => LANGUAGE_NEUTRAL.some((re) => re.test(s.trim()));

/** Latin letters present => the string is English-authored copy. */
const hasLatinWord = (s) => /[A-Za-z]{2,}/.test(s);

/**
 * Extract a dictionary object literal's top-level keys.
 * Strips string literals first so colons inside values never read as keys.
 */
function dictKeys(text, label) {
  const start = text.indexOf(`${label}: {`);
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = text.indexOf("{", start); i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return null;
  const body = text
    .slice(start, end)
    .replace(/`(?:[^`\\]|\\.)*`/g, '""')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, '""');
  const keys = new Set([...body.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map((m) => m[1]));
  keys.delete(label);
  return keys;
}

/**
 * Walk the markup and collect visible text that is NOT inside a data-key
 * subtree. Non-content regions (script/style/svg/template/comments) and
 * elements hidden from users are skipped.
 */
function findUnkeyedText(html) {
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<title>[\s\S]*?<\/title>/gi, "")   // page title: separate mechanism
    .replace(/<(script|style|svg|template|noscript)\b[\s\S]*?<\/\1>/gi, "");

  const findings = [];
  const tag = /<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g;
  const stack = [];      // depth markers for open elements
  let keyedDepth = 0;    // >0 => inside a translated subtree
  let hiddenDepth = 0;   // >0 => inside hidden/aria-hidden content
  let cursor = 0;
  let match;

  const pushText = (raw) => {
    if (keyedDepth > 0 || hiddenDepth > 0) return;
    const text = raw.replace(/&[a-z]+;|&#\d+;/gi, " ").replace(/\s+/g, " ").trim();
    if (!text || isNeutral(text) || !hasLatinWord(text)) return;
    findings.push(text.slice(0, 90));
  };

  while ((match = tag.exec(cleaned))) {
    pushText(cleaned.slice(cursor, match.index));
    cursor = tag.lastIndex;

    const [, closing, name, attrs] = match;
    const selfClosing = /\/$/.test(attrs) || /^(br|hr|img|input|meta|link|source|path|circle|use)$/i.test(name);
    if (selfClosing) {
      // Alt text on a visible image is user-facing copy too.
      if (keyedDepth === 0 && hiddenDepth === 0) {
        const alt = /\balt\s*=\s*"([^"]+)"/i.exec(attrs);
        if (alt && !/data-key/.test(attrs)) pushText(alt[1]);
      }
      continue;
    }

    if (!closing) {
      const keyed = /\bdata-key\s*=/.test(attrs);
      const hidden = /\baria-hidden\s*=\s*"true"|\bhidden\b|display:\s*none/.test(attrs);
      stack.push({ keyed, hidden });
      if (keyed) keyedDepth += 1;
      if (hidden) hiddenDepth += 1;
    } else {
      const frame = stack.pop();
      if (frame?.keyed) keyedDepth -= 1;
      if (frame?.hidden) hiddenDepth -= 1;
    }
  }
  pushText(cleaned.slice(cursor));
  return findings;
}

/** Shared chrome dictionary — resolves keys no page defines locally. */
async function sharedKeys() {
  const text = await readFile(path.join(root, "public/assets/starta-i18n.js"), "utf8");
  return { en: dictKeys(text, "en"), ar: dictKeys(text, "ar") };
}

async function auditPage(file, shared) {
  const full = path.join(root, "public", file);
  let text;
  try {
    text = await readFile(full, "utf8");
  } catch {
    return null; // page not present in this checkout
  }

  // A page may define a key locally OR inherit it from the shared chrome
  // module; either resolves at runtime.
  const en = new Set([...(dictKeys(text, "en") || []), ...(shared.en || [])]);
  const ar = new Set([...(dictKeys(text, "ar") || []), ...(shared.ar || [])]);
  const usedKeys = new Set([...text.matchAll(/data-key\s*=\s*"([^"]+)"/g)].map((m) => m[1]));

  const result = { file, hasDict: en.size > 0 && ar.size > 0, unkeyed: [], missingAr: [], missingEn: [], drift: [] };

  if (result.hasDict) {
    for (const key of usedKeys) {
      if (!ar.has(key)) result.missingAr.push(key);
      if (!en.has(key)) result.missingEn.push(key);
    }
    // Drift is only meaningful for keys the page actually renders.
    result.drift = [...usedKeys]
      .filter((k) => en.has(k) !== ar.has(k))
      .map((k) => `${en.has(k) ? "missing-ar" : "missing-en"}:${k}`);
  }

  result.unkeyed = findUnkeyedText(text);
  return result;
}

async function run() {
  const shared = await sharedKeys();
  const results = [];
  for (const page of PAGES) {
    const r = await auditPage(page, shared);
    if (r) results.push(r);
  }

  let failed = false;
  for (const r of results) {
    const issues = r.unkeyed.length + r.missingAr.length + r.missingEn.length + r.drift.length;
    if (!issues) {
      if (REPORT) console.log(`✓ ${r.file}`);
      continue;
    }
    failed = true;
    console.error(`\n✗ ${r.file}${r.hasDict ? "" : "  (no inline dictionary found)"}`);
    const show = (label, list) => {
      if (!list.length) return;
      const shown = REPORT ? list : list.slice(0, 8);
      console.error(`   ${label} (${list.length}):`);
      shown.forEach((v) => console.error(`     · ${v}`));
      if (!REPORT && list.length > shown.length) {
        console.error(`     … ${list.length - shown.length} more (run with --report)`);
      }
    };
    show("untranslatable text (no data-key)", r.unkeyed);
    show("data-key with no Arabic entry", r.missingAr);
    show("data-key with no English entry", r.missingEn);
    show("dictionary key drift", r.drift);
  }

  if (failed) {
    console.error(
      "\nFAIL: i18n coverage. Every user-visible string must carry a data-key " +
      "present in BOTH dictionaries. See DESIGN_SYSTEM.md -> 'Bilingual Parity'."
    );
    process.exit(1);
  }
  console.log("PASS: i18n coverage — no untranslatable text, no key drift.");
}

run().catch((error) => {
  console.error("FAIL: i18n coverage gate crashed.", error);
  process.exit(1);
});
