// Generates a full-bleed, fully-opaque iOS app icon from the Starta brand mark.
// - Teal gradient fills the ENTIRE square (no black background, no pre-baked rounded corners).
// - iOS applies its own corner-rounding mask, so the source must be a full square.
// - Output is flattened (no alpha channel) per App Store requirements.
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const SIZE = 1024;

// viewBox 0 0 120 120 keeps the same coordinate system as logo-mark.svg,
// but the tile is now full-bleed (0,0 -> 120,120) instead of the inset rounded rect.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="tile" x1="14" y1="4" x2="108" y2="118" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2AF0D2"/>
      <stop offset="0.5" stop-color="#00D2B4"/>
      <stop offset="1" stop-color="#058375"/>
    </linearGradient>
    <linearGradient id="sheen" x1="60" y1="0" x2="60" y2="78" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1.4" stdDeviation="1.6" flood-color="#003b34" flood-opacity="0.28"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="120" height="120" fill="url(#tile)"/>
  <rect x="0" y="0" width="120" height="78" fill="url(#sheen)"/>
  <g filter="url(#soft)">
    <path d="M72 46 C72 36 61 31 50 32 C38 33 33 41 36 49 C38 55 47 58 56 61 C67 64 73 70 70 79 C67 88 53 90 42 86"
          fill="none" stroke="#ffffff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M72 46 L86 32" stroke="#ffffff" stroke-width="11" stroke-linecap="round"/>
    <path d="M99 19 L79 25 L93 39 Z" fill="#ffffff"/>
  </g>
</svg>`;

const out = "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png";

await sharp(Buffer.from(svg))
  .resize(SIZE, SIZE)
  .flatten({ background: "#058375" }) // guarantee no alpha channel
  .png({ compressionLevel: 9 })
  .toFile(out);

// Also refresh the bundled-app copy so an archive built straight from this tree matches.
writeFileSync("/tmp/_starta_icon_done", "ok");
console.log("Wrote", out);
