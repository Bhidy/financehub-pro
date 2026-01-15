import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "https://starta.46-224-223-172.sslip.io/api/v1";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const pathString = path.join("/");
    const url = `${BACKEND_URL}/${pathString}${req.nextUrl.search}`;

    try {
        const authHeader = req.headers.get("Authorization");

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

        const data = await res.json();

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
    const { path } = await params;
    const pathString = path.join("/");
    const url = `${BACKEND_URL}/${pathString}${req.nextUrl.search}`;

    try {
        const body = await req.json();
        const authHeader = req.headers.get("Authorization");

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(authHeader ? { Authorization: authHeader } : {}),
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        return NextResponse.json(data, {
            status: res.status,
        });
    } catch (error) {
        console.error("Proxy POST Error:", error);
        return NextResponse.json({ error: "Proxy Failed" }, { status: 500 });
    }
}
