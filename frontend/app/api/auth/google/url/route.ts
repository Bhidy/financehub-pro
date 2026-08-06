
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic'; // Prevent static caching

/** Cookie holding the per-flow OAuth CSRF nonce (see the callback for the check). */
export const OAUTH_STATE_COOKIE = "starta_oauth_state";

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

        // ── OAuth CSRF (login-CSRF) protection ───────────────────────────────
        // `state` is authored by the client, so on its own it proves nothing.
        // Without a binding, an attacker can obtain a `code` for THEIR Google
        // account and walk a victim's browser through the callback, planting the
        // ATTACKER's session in the victim's localStorage — everything the victim
        // then does lands in the attacker's account. Mint a random nonce, embed
        // it in the state we forward to Google, and store it in an HttpOnly
        // cookie; the callback rejects any state whose nonce doesn't match.
        const nonce = crypto.randomUUID();
        let statePayload: Record<string, unknown>;
        try {
            statePayload = JSON.parse(decodeURIComponent(state));
            if (typeof statePayload !== "object" || statePayload === null) statePayload = {};
        } catch {
            // Legacy/opaque state (e.g. the bare "mobile" string) — preserve it.
            statePayload = { legacy: state };
        }
        statePayload.nonce = nonce;
        const signedState = encodeURIComponent(JSON.stringify(statePayload));

        // Hardcoded Hetzner Backend URL (Verified Production)
        const BACKEND_URL = "https://starta.46-224-223-172.sslip.io/api/v1";

        // Construct target URL
        const targetUrl = `${BACKEND_URL}/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(signedState)}`;

        console.log(`[Proxy] Fetching Google Auth URL from: ${targetUrl}`);

        // Server-side fetch to Python Backend
        const response = await fetch(targetUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(15000), // don't hang on a slow/sleeping backend (L-4)
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

        // 3. Parse and Return JSON, binding the nonce to this browser.
        const data = await response.json();
        const json = NextResponse.json(data);
        json.cookies.set(OAUTH_STATE_COOKIE, nonce, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax", // must survive the top-level redirect back from Google
            path: "/",
            maxAge: 600, // one login attempt; 10 minutes is ample
        });
        return json;

    } catch (error: any) {
        console.error("[Proxy] Internal Server Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error: Failed to connect to authentication service." },
            { status: 500 }
        );
    }
}
