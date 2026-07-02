import { NextRequest, NextResponse } from "next/server";

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://starta.46-224-223-172.sslip.io";

// ── OAuth redirect hardening ──────────────────────────────────────────────
// The OAuth success redirect carries the access/refresh tokens. `returnOrigin`
// comes from the client-supplied `state`, so it MUST be allowlisted before it
// is used as a redirect target — otherwise an attacker who crafts the initial
// OAuth link (state.returnTo = https://evil.com) could bounce a victim's tokens
// to a domain they control (account takeover). We only ever redirect tokens to:
//   • the exact origin that served this callback (always trusted), or
//   • *.startamarkets.com / startamarkets.com (production), or
//   • localhost (local dev).
// Mobile deep-links are restricted to the one known Capacitor app scheme.
const APP_SCHEME = "com.mubasher.startamarkets://";

function isAllowedWebOrigin(candidate: string, requestOrigin: string): boolean {
    try {
        const u = new URL(candidate);
        if (u.origin === requestOrigin) return true;              // same origin as the callback
        if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return true; // dev
        if (u.protocol !== "https:") return false;                // no downgrade / non-web schemes
        return (
            u.hostname === "startamarkets.com" ||
            u.hostname === "www.startamarkets.com" ||
            u.hostname.endsWith(".startamarkets.com")
        );
    } catch {
        return false;
    }
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state"); // Contains mobile/desktop flag

    // Parse state to determine if mobile and return origin
    let isMobile = false;
    let returnOrigin: string | null = null;

    if (state) {
        try {
            const stateData = JSON.parse(decodeURIComponent(state));
            isMobile = stateData.mobile === true;
            returnOrigin = stateData.returnTo;
        } catch (e) {
            // Legacy: check if state simply equals "mobile"
            isMobile = state === "mobile";
        }
    }

    // Unified Routing: Redirect always to root paths
    const successRedirect = "/AiChat";
    const loginRedirect = "/login";

    // Handle errors from Google
    if (error) {
        console.error("Google OAuth error:", error);
        return NextResponse.redirect(
            new URL(`${loginRedirect}?error=${encodeURIComponent(error)}`, request.url)
        );
    }

    if (!code) {
        return NextResponse.redirect(
            new URL(`${loginRedirect}?error=no_code`, request.url)
        );
    }

    try {
        // Exchange code with our backend
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/google/callback`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "FinanceHub-Pro-Vercel-Proxy", // Identifying header
            },
            body: JSON.stringify({
                code,
                redirect_uri: `${request.nextUrl.origin}/api/auth/google/callback`,
            }),
        });

        // Robust Parsing: Handle HTML (Sleeping Backend) or JSON
        const responseText = await response.text();
        let data;

        try {
            if (!responseText || responseText.trim().startsWith("<")) {
                console.warn("Backend Callback HTML/Empty:", responseText.substring(0, 50));
                // Return to login with specific "waking up" error
                return NextResponse.redirect(
                    new URL(`${loginRedirect}?error=${encodeURIComponent("System is initializing. Please try again.")}`, request.url)
                );
            }
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("Backend Callback JSON Parse Error:", e);
            return NextResponse.redirect(
                new URL(`${loginRedirect}?error=backend_invalid_response`, request.url)
            );
        }

        if (!response.ok) {
            console.error("Backend OAuth error:", data);
            return NextResponse.redirect(
                new URL(`${loginRedirect}?error=${encodeURIComponent(data.detail || "auth_failed")}`, request.url)
            );
        }

        // MOBILE (Capacitor app): bounce the tokens back into the native app via a
        // custom URL scheme deep link. Safari reliably opens the app from an HTML
        // location redirect (a plain Location header to a custom scheme is flaky).
        if (isMobile) {
            // Only honour a returnOrigin that is the known app scheme; otherwise
            // fall back to the default. Blocks scheme-injection (e.g. https://evil).
            const schemeBase = returnOrigin && returnOrigin.startsWith(APP_SCHEME) ? returnOrigin : "com.mubasher.startamarkets://oauth";
            const sep = schemeBase.includes("?") ? "&" : "?";
            const deepLink =
                `${schemeBase}${sep}token=${encodeURIComponent(data.access_token)}` +
                `&refresh_token=${encodeURIComponent(data.refresh_token || "")}` +
                `&user=${encodeURIComponent(JSON.stringify(data.user))}&google_auth=success`;
            return new NextResponse(
                `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">` +
                `<meta http-equiv="refresh" content="0;url=${deepLink}"></head>` +
                `<body style="font-family:system-ui;text-align:center;padding:48px 24px;color:#0b1220">Signing you in…` +
                `<script>location.href=${JSON.stringify(deepLink)}</script></body></html>`,
                { headers: { "content-type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
            );
        }

        // Redirect back to the original domain if provided (e.g. startamarkets.com),
        // but ONLY if it passes the allowlist — the redirect carries tokens, so an
        // untrusted returnOrigin would be a token-exfiltration vector. Untrusted or
        // malformed values fall back to the callback's own origin.
        const baseUrl =
            returnOrigin && isAllowedWebOrigin(returnOrigin, request.nextUrl.origin)
                ? returnOrigin
                : request.nextUrl.origin;
        const redirectUrl = new URL(successRedirect, baseUrl);

        redirectUrl.searchParams.set("token", data.access_token);
        if (data.refresh_token) {
            redirectUrl.searchParams.set("refresh_token", data.refresh_token);
        }
        redirectUrl.searchParams.set("user", encodeURIComponent(JSON.stringify(data.user)));
        redirectUrl.searchParams.set("google_auth", "success");

        return NextResponse.redirect(redirectUrl);
    } catch (error) {
        console.error("Google callback error:", error);
        return NextResponse.redirect(
            new URL(`${loginRedirect}?error=server_connection_error`, request.url)
        );
    }
}
