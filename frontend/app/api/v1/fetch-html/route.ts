import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set(["www.zawya.com", "zawya.com"]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
        return NextResponse.json({ error: "Invalid target URL" }, { status: 400 });
    }

    try {
        const upstream = await fetch(target.toString(), {
            method: "GET",
            redirect: "follow",
            cache: "no-store",
            headers: {
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    + "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                ),
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
            },
        });

        const html = await upstream.text();
        return NextResponse.json(
            {
                status: upstream.status,
                final_url: upstream.url || target.toString(),
                html,
            },
            { status: 200 }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown proxy error";
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
