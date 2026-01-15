
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic'; // Prevent static caching

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const redirectUri = searchParams.get('redirect_uri');
        const state = searchParams.get('state');

        if (!redirectUri || !state) {
            return NextResponse.json(
                { error: "Missing required parameters" },
                { status: 400 }
            );
        }

        // Hardcoded Hetzner Backend URL (Verified Production)
        const BACKEND_URL = "https://starta.46-224-223-172.sslip.io/api/v1";

        // Construct target URL
        const targetUrl = `${BACKEND_URL}/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;

        console.log(`[Proxy] Fetching Google Auth URL from: ${targetUrl}`);

        // Server-side fetch to Python Backend
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Starta-NextJS-Proxy/1.0'
            },
            cache: 'no-store'
        });

        // 1. Check for Protocol Errors (HTML instead of JSON)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            const textBody = await response.text();
            console.error("[Proxy] Backend returned HTML instead of JSON:", textBody.substring(0, 200));
            return NextResponse.json(
                { error: "Backend System is waking up or in maintenance mode. Please try again in 30 seconds." },
                { status: 503 }
            );
        }

        // 2. Check for HTTP Errors
        if (!response.ok) {
            console.error(`[Proxy] Backend returned error status: ${response.status}`);
            return NextResponse.json(
                { error: `Backend request failed with status ${response.status}` },
                { status: response.status }
            );
        }

        // 3. Parse and Return JSON
        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("[Proxy] Internal Server Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error: Failed to connect to authentication service." },
            { status: 500 }
        );
    }
}
