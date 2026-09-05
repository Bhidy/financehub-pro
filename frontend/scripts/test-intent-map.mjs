#!/usr/bin/env node
/**
 * SEARCH-INTENT MAP GATE.
 *
 * content/search-intent-map.json is the one place that says which URL answers
 * which query cluster, in each language. Two things go wrong with such a map
 * when nothing checks it: a target points at a route that no longer exists
 * (the tracker then measures a 404), or two clusters quietly share one URL
 * (our own pages compete for the same query). Both are asserted here against
 * the FILESYSTEM — app/** is the truth about which routes exist — so the map
 * cannot drift from the site it describes.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP = path.join(root, "content/search-intent-map.json");

/** Routes that exist outside app/ (next.config rewrites) or are not language twins. */
const EXTRA_EN = ["/", "/privacy", "/terms", "/Portfolio"];
const PRIVATE = new Set(["admin", "login", "register", "settings", "forgot-password", "shared", "mobile", "AiChat", "api"]);

function routePatterns(dir, prefix) {
  const out = new Set();
  const walk = (d, rel) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (rel === "" && PRIVATE.has(e.name)) continue;
        if (rel === "" && prefix === "" && e.name === "ar") continue; // the Arabic tree is walked separately
        walk(path.join(d, e.name), `${rel}/${e.name}`);
      } else if (e.name === "page.tsx" || e.name === "route.ts") {
        const body = `${prefix}${rel}`
          .split("/").filter(Boolean)
          .map((seg) => (/^\[.+\]$/.test(seg) ? "[^/]+" : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
          .join("/");
        out.add(`^/${body}$`);
      }
    }
  };
  walk(dir, "");
  return [...out].map((s) => new RegExp(s));
}

const en = routePatterns(path.join(root, "app"), "");
const ar = routePatterns(path.join(root, "app/ar"), "/ar");
const matches = (patterns, target) => patterns.some((re) => re.test(target));

let failed = 0;
const fail = (msg) => { failed++; console.error(`FAIL: ${msg}`); };

const map = JSON.parse(readFileSync(MAP, "utf8"));
const clusters = Array.isArray(map.clusters) ? map.clusters : [];
if (clusters.length < 10) fail(`intent map has only ${clusters.length} clusters — expected the full contested set`);

const ids = new Set();
const targets = new Map();
for (const c of clusters) {
  for (const k of ["id", "ar", "en", "intent", "pageType", "targetEn", "targetAr", "priority"]) {
    if (!c[k]) fail(`cluster ${c.id || "(no id)"} is missing "${k}"`);
  }
  if (ids.has(c.id)) fail(`duplicate cluster id "${c.id}"`);
  ids.add(c.id);
  if (!/^P[0-3]$/.test(c.priority || "")) fail(`cluster ${c.id}: priority "${c.priority}" must be P0–P3`);
  if (!/[؀-ۿ]/.test(c.ar || "")) fail(`cluster ${c.id}: "ar" query is not Arabic`);
  if (/^\/ar(\/|$)/.test(c.targetEn || "")) fail(`cluster ${c.id}: targetEn must not live in /ar`);
  if (!/^\/ar(\/|$)/.test(c.targetAr || "")) fail(`cluster ${c.id}: targetAr must live in /ar`);
  for (const [lang, target] of [["en", c.targetEn], ["ar", c.targetAr]]) {
    if (!target) continue;
    const decoded = decodeURIComponent(target);
    if (targets.has(decoded)) fail(`cluster ${c.id} and ${targets.get(decoded)} both target ${decoded} — two clusters on one URL cannibalise each other`);
    targets.set(decoded, c.id);
    const ok = lang === "en" ? EXTRA_EN.includes(decoded) || matches(en, decoded) : matches(ar, decoded);
    if (!ok) fail(`cluster ${c.id}: ${lang} target ${decoded} matches no route under app/${lang === "ar" ? "ar/" : ""}**`);
  }
}

// serp.mjs must read THIS map, not carry its own list.
const serp = readFileSync(path.join(root, "scripts/seo/serp.mjs"), "utf8");
if (!serp.includes("search-intent-map.json")) fail("scripts/seo/serp.mjs does not read content/search-intent-map.json — the tracked queries would drift from the map");

if (failed) {
  console.error(`\nFAIL: search-intent map — ${failed} problem(s).`);
  process.exit(1);
}
console.log(`OK: search-intent map — ${clusters.length} clusters, ${targets.size} distinct targets, every target resolves to a route.`);
