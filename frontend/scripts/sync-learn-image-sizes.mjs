#!/usr/bin/env node
/**
 * LEARN IMAGE DIMENSION MANIFEST.
 *
 * WHY THIS EXISTS
 * The article markup hardcoded width={1200} height={675} for every image. The
 * covers are actually 920×690, so the browser upscaled them 1.21× (that is the
 * "low resolution" the covers appeared to have — the files never changed) and
 * the declared 16:9 box against a 4:3 file invited object-fit: cover to crop.
 *
 * Guessing dimensions in markup is the bug. This reads the REAL pixel size of
 * every image the Learn content references and emits a manifest the component
 * uses for:
 *   · correct width/height attributes  → no layout shift, no distortion
 *   · a max-width cap at intrinsic width → the image is never upscaled
 *
 *     node scripts/sync-learn-image-sizes.mjs
 *
 * verify-route-aliases.mjs fails the build when an image referenced by the
 * content has no entry (a new asset added without running this).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.join(root, "content/learn-topics.generated.ts");
const OUT = path.join(root, "lib/learn-image-sizes.json");

/** Minimal intrinsic-size readers — avoids pulling an image library into the build. */
function webpSize(buf) {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const fourcc = buf.toString("ascii", 12, 16);
  if (fourcc === "VP8X") return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
  if (fourcc === "VP8 ") return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  if (fourcc === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function pngSize(buf) {
  if (buf.length < 24 || buf.toString("hex", 0, 8) !== "89504e470d0a1a0a") return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    // SOF0..SOF15 except DHT/JPG/DAC carry the frame dimensions.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

export async function imageSize(absPath) {
  const buf = await readFile(absPath);
  return webpSize(buf) || pngSize(buf) || jpegSize(buf);
}

/** Every /assets/... image path referenced by the Learn content. */
export async function referencedImages() {
  const text = await readFile(CONTENT, "utf8");
  const paths = new Set();
  for (const m of text.matchAll(/"(?:coverImageEn|coverImageAr|src)"\s*:\s*"(\/assets\/[^"]+)"/g)) {
    paths.add(m[1]);
  }
  return [...paths].sort();
}

export async function buildManifest() {
  const out = {};
  for (const rel of await referencedImages()) {
    try {
      const size = await imageSize(path.join(root, "public", rel));
      if (size) out[rel] = size;
    } catch {
      // missing file — reported by the gate, not silently defaulted
    }
  }
  return out;
}

async function run() {
  const manifest = await buildManifest();
  const refs = await referencedImages();
  await writeFile(OUT, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const missing = refs.filter((r) => !manifest[r]);
  console.log(`learn image sizes: ${Object.keys(manifest).length}/${refs.length} measured`);
  const widths = Object.values(manifest).map((s) => s.w);
  if (widths.length) {
    console.log(`  width range: ${Math.min(...widths)}–${Math.max(...widths)}px`);
  }
  if (missing.length) {
    console.log(`  UNREADABLE (${missing.length}): ${missing.join(", ")}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await run();
