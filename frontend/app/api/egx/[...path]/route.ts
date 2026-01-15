import { NextRequest, NextResponse } from "next/server";

// Backend API URL - use environment variable or fall back to production
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://starta.46-224-223-172.sslip.io";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const pathString = path.join("/");
    const url = `${BACKEND_URL}/api/egx/${pathString}${req.nextUrl.search}`;

    try {
        const res = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
            },
            next: { revalidate: 60 } // Cache for 60 seconds
        });

        if (!res.ok) {
            console.error(`EGX API Error: ${res.status} ${res.statusText}`);
            return NextResponse.json(
                { error: `Failed to fetch EGX data: ${res.statusText}` },
                { status: res.status }
            );
        }

        const data = await res.json();

        return NextResponse.json(data, {
            status: res.status,
            headers: {
                "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
                "Access-Control-Allow-Origin": "*"
            },
        });
    } catch (error) {
        console.error("EGX Proxy Error:", error);
        return NextResponse.json({ error: "Failed to fetch EGX data" }, { status: 500 });
    }
}
