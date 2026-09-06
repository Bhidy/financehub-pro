/**
 * THE HOME-SCREEN ICON — same brand contract as app/icon.tsx and
 * components/brand/StartaLogo.tsx. Apple renders this on a home screen without
 * any surrounding chrome, so it carries its own tile rather than relying on the
 * OS to add one, and it uses the full canvas at Apple's 180px size.
 */
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#14B8A6",
                    color: "#FFFFFF",
                    fontSize: 118,
                    fontWeight: 700,
                    lineHeight: 1,
                    paddingBottom: 8,
                }}
            >
                S
            </div>
        ),
        { ...size }
    );
}
