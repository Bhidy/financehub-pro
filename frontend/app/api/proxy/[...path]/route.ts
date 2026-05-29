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
    method: "POST" | "PUT" | "PATCH" | "DELETE"
) {
    const url = await resolveUpstreamUrl(req, params);
    const authHeader = getAuthorizationHeader(req);
    const contentType = req.headers.get("content-type");
    const deviceFingerprint = req.headers.get("x-device-fingerprint");
    const marketContext = req.headers.get("x-market-context");
    const language = req.headers.get("x-language");
    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    
    // Explicitly read body as string or buffer
    const body = await req.text();

    try {
        const headers: Record<string, string> = {};
        if (contentType) headers["Content-Type"] = contentType;
        if (authHeader) headers["Authorization"] = authHeader;
        if (deviceFingerprint) headers["X-Device-Fingerprint"] = deviceFingerprint;
        if (marketContext) headers["X-Market-Context"] = marketContext;
        if (language) headers["X-Language"] = language;
        if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;

        const res = await fetch(url, {
            method,
            headers,
            ...(body.length > 0 ? { body } : {}),
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
        const deviceFingerprint = req.headers.get("x-device-fingerprint");
        const marketContext = req.headers.get("x-market-context");
        const language = req.headers.get("x-language");
        const forwardedFor = req.headers.get("x-forwarded-for") || "";
        
        const { path } = await params;
        const pathString = path.join("/");
        const firstSegment = path[0];

        const localSegments = [
            "financials",
            "ohlc",
            "shareholders",
            "ratios",
            "tickers",
            "analyst-ratings",
            "insider-trading",
            "corporate-actions",
            "market-breadth",
            "market-summary",
            "intraday"
        ];

        if (localSegments.includes(firstSegment)) {
            const origin = req.nextUrl.origin;
            const localUrl = `${origin}/api/v1/${pathString}${req.nextUrl.search}`;
            console.log(`[Proxy Router] Routing locally: ${pathString} -> ${localUrl}`);
            
            const localRes = await fetch(localUrl, {
                headers: {
                    "Content-Type": "application/json"
                },
                next: { revalidate: 0 }
            });

            const localData = await readUpstreamPayload(localRes);
            return NextResponse.json(localData, {
                status: localRes.status,
                headers: {
                    "Cache-Control": "no-store, must-revalidate",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }

        const url = await resolveUpstreamUrl(req, params);

        // SECURITY: Do not cache authenticated requests (user data). Cache public data (tickers, news).
        // If Authorization header is present, revalidate = 0 (no cache).
        const revalidateTime = authHeader ? 0 : 60;

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (authHeader) headers["Authorization"] = authHeader;
        if (deviceFingerprint) headers["X-Device-Fingerprint"] = deviceFingerprint;
        if (marketContext) headers["X-Market-Context"] = marketContext;
        if (language) headers["X-Language"] = language;
        if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;

        const res = await fetch(url, {
            headers,
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

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return proxyWithBody(req, params, "PATCH");
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return proxyWithBody(req, params, "DELETE");
}
