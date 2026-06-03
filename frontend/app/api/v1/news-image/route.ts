import { NextRequest, NextResponse } from "next/server";

// Known publisher image CDNs that supply EGX news cover photos. Kept as a tight
// host allowlist (plus the image content-type check below) to avoid SSRF/abuse.
const ALLOWED_HOSTS = new Set([
    "static.mubasher.info",
    "static.zawya.com",
    "www.arabfinance.com",
    "arabfinance.com",
    "i0.wp.com",
]);
const REVALIDATE_SECONDS = 60 * 60 * 6; // 6 hours

export const runtime = "nodejs";

function parseAndValidateTarget(urlParam: string | null): URL | null {
    if (!urlParam) return null;

    try {
        const target = new URL(urlParam);
        if (!["http:", "https:"].includes(target.protocol)) return null;
        if (!ALLOWED_HOSTS.has(target.hostname.toLowerCase())) return null;
        return target;
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const target = parseAndValidateTarget(request.nextUrl.searchParams.get("url"));
    if (!target) {
        return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
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
