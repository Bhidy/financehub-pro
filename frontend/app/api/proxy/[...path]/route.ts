import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "https://starta.46-224-223-172.sslip.io/api/v1";

async function resolveUpstreamUrl(
    req: NextRequest,
    params: Promise<{ path: string[] }>
): Promise<string> {
    const { path } = await params;
    const pathString = path.join("/");
    return `${BACKEND_URL}/${pathString}${req.nextUrl.search}`;
}

function getAuthorizationHeader(req: NextRequest): string | null {
    return req.headers.get("authorization") ?? req.headers.get("Authorization");
}

async function readUpstreamPayload(res: Response): Promise<unknown> {
    const text = await res.text();

    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return { detail: text };
    }
}

async function proxyWithBody(
    req: NextRequest,
    params: Promise<{ path: string[] }>,
    method: "POST" | "PUT"
) {
    const url = await resolveUpstreamUrl(req, params);
    const authHeader = getAuthorizationHeader(req);
    const body = await req.text();

    try {
        const res = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...(authHeader ? { Authorization: authHeader } : {}),
            },
            body,
        });

        const data = await readUpstreamPayload(res);

        return NextResponse.json(data, {
            status: res.status,
            headers: {
                "Cache-Control": "no-store, must-revalidate",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (error) {
        console.error(`Proxy ${method} Error:`, error);
        return NextResponse.json({ error: "Proxy Failed" }, { status: 500 });
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const authHeader = getAuthorizationHeader(req);
        const url = await resolveUpstreamUrl(req, params);

        // SECURITY: Do not cache authenticated requests (user data). Cache public data (tickers, news).
        // If Authorization header is present, revalidate = 0 (no cache).
        const revalidateTime = authHeader ? 0 : 60;

        const res = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                ...(authHeader ? { Authorization: authHeader } : {}),
            },
            next: { revalidate: revalidateTime }
        });

        if (!res.ok) {
            // If 429, we might still want to pass it through, but we can catch it here.
            // For now, pass through.
        }

        const data = await readUpstreamPayload(res);

        return NextResponse.json(data, {
            status: res.status,
            headers: {
                // Vercel Edge Cache headers
                "Cache-Control": authHeader
                    ? "no-store, must-revalidate"
                    : "s-maxage=60, stale-while-revalidate=300",
                "Access-Control-Allow-Origin": "*"
            },
        });
    } catch (error) {
        console.error("Proxy Error:", error);
        return NextResponse.json({ error: "Proxy Failed" }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return proxyWithBody(req, params, "POST");
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return proxyWithBody(req, params, "PUT");
}
