import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db-server";

/**
 * NEWS COVER IMAGE PROXY — addressed by OUR article id, never by an upstream URL.
 *
 * It used to take the publisher's URL as a query parameter, which meant the
 * supplier's CDN hostname appeared verbatim inside every `<img src>` on the
 * page (`?url=https%3A%2F%2Fstatic.<supplier>...`). Taking the article id
 * instead removes that disclosure AND the SSRF surface in one move: the target
 * is looked up from our own `market_news` row and re-validated against the host
 * allowlist below, so no caller can steer this fetch anywhere.
 *
 * Callers never construct this URL by hand — lib/vendor-privacy.ts
 * (publicImageUrl) emits it at the API boundary, and clients use it verbatim.
 * A failure here is not fatal: every caller falls back to a branded cover.
 */

// Publisher image CDNs that supply EGX news cover photos. The allowlist plus the
// content-type check below is what keeps this from being an open proxy.
const ALLOWED_HOSTS = new Set([
    "static.mubasher.info",
    "static.zawya.com",
    "www.arabfinance.com",
    "arabfinance.com",
    "i0.wp.com",
]);
const REVALIDATE_SECONDS = 60 * 60 * 6; // 6 hours

export const runtime = "nodejs";

function validateTarget(raw: unknown): URL | null {
    if (typeof raw !== "string" || !raw.trim()) return null;
    try {
        const target = new URL(raw);
        if (!["http:", "https:"].includes(target.protocol)) return null;
        if (!ALLOWED_HOSTS.has(target.hostname.toLowerCase())) return null;
        return target;
    } catch {
        return null;
    }
}

async function imageUrlForArticle(id: number): Promise<string | null> {
    const result = await db.query(
        `SELECT image_url FROM market_news WHERE id = $1 LIMIT 1`,
        [id]
    );
    const value = result.rows[0]?.image_url;
    return typeof value === "string" && value.trim() ? value : null;
}

export async function GET(request: NextRequest) {
    const idParam = request.nextUrl.searchParams.get("id");
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ error: "Invalid image reference" }, { status: 400 });
    }

    let target: URL | null = null;
    try {
        target = validateTarget(await imageUrlForArticle(id));
    } catch {
        return NextResponse.json({ error: "Image lookup failed" }, { status: 502 });
    }
    if (!target) {
        return NextResponse.json({ error: "Image not available" }, { status: 404 });
    }

    try {
        const upstream = await fetch(target.toString(), {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; FinHubNewsImageProxy/1.0)",
                // Use the target's own origin as referer so per-host hotlink
                // protection accepts the request.
                Referer: `${target.protocol}//${target.hostname}/`,
                Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            },
            next: { revalidate: REVALIDATE_SECONDS },
        });

        if (!upstream.ok) {
            return NextResponse.json(
                { error: `Upstream image fetch failed (${upstream.status})` },
                { status: upstream.status }
            );
        }

        const contentType = upstream.headers.get("content-type") || "image/jpeg";
        // Only proxy real images; anything else (HTML error page, etc.) is rejected
        // so the client falls back to a branded cover.
        if (!contentType.toLowerCase().startsWith("image/")) {
            return NextResponse.json({ error: "Upstream is not an image" }, { status: 415 });
        }
        const buffer = await upstream.arrayBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": `public, max-age=${REVALIDATE_SECONDS}, s-maxage=${REVALIDATE_SECONDS}`,
            },
        });
    } catch {
        return NextResponse.json({ error: "Image proxy failed" }, { status: 502 });
    }
}
