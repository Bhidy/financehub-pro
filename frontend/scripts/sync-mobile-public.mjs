// Regenerates mobile-native/public from the canonical /public assets.
//
// The Capacitor/Vite mobile build uses `mobile-native` as its root, so its
// publicDir is `mobile-native/public`. That folder is a CURATED COPY of a few
// /public subtrees (it intentionally omits desktop-only assets like hero,
// pricing, roadmap, etc.). It is gitignored to avoid duplicating ~22MB of
// already-tracked assets, so this script reproduces it from /public before a
// native build. Run via `npm run build:mobile` (or `npm run sync:mobile-public`).

import { cp, rm, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(frontendRoot, "public");
const DEST = resolve(frontendRoot, "mobile-native", "public");

// The curated subset of /public the mobile bundle actually needs.
const ITEMS = [
  "assets/learn",
  "assets/news-covers",
  "assets/starta-mobile",
  "data",
  "logos",
];

async function main() {
  if (!existsSync(SRC)) {
    console.error(`[sync-mobile-public] source not found: ${SRC}`);
    process.exit(1);
  }
  let copied = 0;
  for (const item of ITEMS) {
    const from = resolve(SRC, item);
    const to = resolve(DEST, item);
    if (!existsSync(from)) {
      console.warn(`[sync-mobile-public] skip (missing source): public/${item}`);
      continue;
    }
    await rm(to, { recursive: true, force: true });
    await mkdir(dirname(to), { recursive: true });
    await cp(from, to, { recursive: true });
    copied += 1;
    console.log(`[sync-mobile-public] public/${item} -> mobile-native/public/${item}`);
  }
  console.log(`[sync-mobile-public] done (${copied}/${ITEMS.length} items synced)`);
}

main().catch((error) => {
  console.error("[sync-mobile-public] failed:", error);
  process.exit(1);
});
