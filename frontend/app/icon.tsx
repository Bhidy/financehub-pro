/**
 * THE APP ICON — generated from the same brand contract as components/brand/StartaLogo.tsx.
 *
 * It was a PNG of a white BAR CHART on a teal tile, while public/icon.svg was a
 * teal bar chart on a NAVY tile and the site logo was a white "S" on a teal
 * tile. Three marks for one company, and the two that shipped as binaries could
 * not be diffed, so nobody noticed they had drifted apart.
 *
 * Generating it from code means the browser-tab mark and the in-page lockup
 * cannot disagree again: both are the teal tile with the letter S, and a change
 * to one is a visible change to the other in the same review.
 */
import { ImageResponse } from "next/og";

export const size = { width: 128, height: 128 };
export const contentType = "image/png";

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    // --color-starta-teal. The tile is the brand; the letter is white.
                    background: "#14B8A6",
                    borderRadius: 28,
                    color: "#FFFFFF",
                    fontSize: 84,
                    fontWeight: 700,
                    // Optical centring: the cap-height of an S sits high in the em
                    // box, so a mathematically centred glyph reads as too low.
                    lineHeight: 1,
                    paddingBottom: 6,
                }}
            >
                S
            </div>
        ),
        { ...size }
    );
}
