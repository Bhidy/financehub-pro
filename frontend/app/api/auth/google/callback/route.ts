import { NextRequest, NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE } from "../url/route";

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
        // localhost is only trustworthy while developing — in production a
        // state.returnTo of http://127.0.0.1:PORT must NOT receive tokens.
        if (process.env.NODE_ENV !== "production" &&
            (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return true;
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
    let stateNonce: string | null = null;

    if (state) {
        try {
            const stateData = JSON.parse(decodeURIComponent(state));
            isMobile = stateData.mobile === true;
            returnOrigin = stateData.returnTo;
            stateNonce = typeof stateData.nonce === "string" ? stateData.nonce : null;
            // Legacy opaque state was wrapped as { legacy: "mobile" } by the url route.
            if (stateData.legacy === "mobile") isMobile = true;
        } catch (e) {
            // Legacy: check if state simply equals "mobile"
            isMobile = state === "mobile";
        }
    }

    // Unified Routing: finish the login on /login (it consumes the token params
    // and stores them) and then send the user onward. /login itself resolves the
    // final destination (validated ?redirect= → remembered origin page →
    // default /Funds); the param below is only the server-side default.
    const successRedirect = "/login";
    const successDestination = "/Funds"; // /login's fallback when nothing better is known
    const loginRedirect = "/login";

    // ── OAuth CSRF check ─────────────────────────────────────────────────────
    // The nonce minted in /api/auth/google/url is bound to this browser via an
    // HttpOnly cookie. A mismatch means the flow was not started here — i.e. a
    // login-CSRF attempt to plant someone else's session — so refuse it.
    // Native-app flows start outside this proxy and legitimately carry no nonce,
    // and a browser with no cookie (cleared mid-flow) falls back to the previous
    // behaviour rather than locking a legitimate user out.
    const expectedNonce = request.cookies.get(OAUTH_STATE_COOKIE)?.value ?? null;
    const isNativeState = isMobile && (!returnOrigin || returnOrigin.startsWith(APP_SCHEME));
    if (!isNativeState && expectedNonce && stateNonce !== expectedNonce) {
        console.error("Google OAuth state nonce mismatch — refusing callback");
        return NextResponse.redirect(
            new URL(`${loginRedirect}?error=${encodeURIComponent("Login session expired. Please try again.")}`, request.url)
        );
    }

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
        //
        // Guard: a genuine native request always carries returnTo = the app scheme
        // (StartaMobileApp) or the legacy bare "mobile" state (no returnTo at all).
        // A web returnTo with mobile:true is a misdetected desktop/mobile-web login —
        // deep-linking there strands the user on a dead page, so fall through to the
        // normal web redirect instead.
        const isNativeAppFlow =
            isMobile && (!returnOrigin || returnOrigin.startsWith(APP_SCHEME));
        if (isNativeAppFlow) {
            // SECURITY: the deep-link base is a FIXED constant. state.returnTo is
            // attacker-influencable (the OAuth URL is public), and this HTML page
            // carries fresh tokens — interpolating any attacker-controlled string
            // into it (even startsWith-checked) is an XSS/token-theft vector. The
            // native app always uses exactly this scheme+host, so nothing is lost.
            const schemeBase = "com.mubasher.startamarkets://oauth";
            // Deep-link query: the NATIVE contract — `user` single-encoded.
            const deepLink =
                `${schemeBase}?token=${encodeURIComponent(data.access_token)}` +
                `&refresh_token=${encodeURIComponent(data.refresh_token || "")}` +
                `&user=${encodeURIComponent(JSON.stringify(data.user))}&google_auth=success`;
            // Web fallback: the /login contract — `user` DOUBLE-encoded exactly like
            // the 302 web path below (login does JSON.parse(decodeURIComponent(v))
            // on the already-URL-decoded param; single encoding breaks on names
            // containing '%').
            const webFallback =
                `${request.nextUrl.origin}${successRedirect}` +
                `?token=${encodeURIComponent(data.access_token)}` +
                `&refresh_token=${encodeURIComponent(data.refresh_token || "")}` +
                `&user=${encodeURIComponent(encodeURIComponent(JSON.stringify(data.user)))}` +
                `&google_auth=success&redirect=${encodeURIComponent(successDestination)}`;
            // Both URLs are built exclusively from the fixed constant, this
            // request's own origin, and encodeURIComponent output — safe to place
            // in attribute/script contexts. Keep it that way.
            return new NextResponse(
                `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">` +
                `<meta http-equiv="refresh" content="0;url=${deepLink}"></head>` +
                `<body style="font-family:system-ui;text-align:center;padding:48px 24px;color:#0b1220">Signing you in…` +
                `<p style="margin-top:16px;font-size:14px;color:#64748b">Not redirected? ` +
                `<a href=${JSON.stringify(deepLink)}>Open the app</a> or ` +
                `<a href=${JSON.stringify(webFallback)}>continue in the browser</a>.</p>` +
                `<script>location.href=${JSON.stringify(deepLink)};` +
                `var fallbackTimer=setTimeout(function(){location.href=${JSON.stringify(webFallback)}},2500);` +
                // If the deep link opened the app, this tab is hidden — cancel the
                // fallback so we don't also mint a web session behind the user's back.
                `document.addEventListener("visibilitychange",function(){if(document.hidden)clearTimeout(fallbackTimer)});` +
                `</script>` +
                `</body></html>`,
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
        redirectUrl.searchParams.set("redirect", successDestination);

        // This Location header carries the access + refresh tokens, so it must
        // never be stored by a shared cache, and the browser must not forward the
        // token-bearing URL as a Referer to anything (the site default is
        // origin-when-cross-origin, which still sends the FULL url same-origin).
        const successResponse = NextResponse.redirect(redirectUrl, {
            headers: {
                "Cache-Control": "no-store, private",
                "Referrer-Policy": "no-referrer",
            },
        });
        // The nonce is single-use — burn it so a captured callback URL can't be replayed.
        successResponse.cookies.delete(OAUTH_STATE_COOKIE);
        return successResponse;
    } catch (error) {
        console.error("Google callback error:", error);
        return NextResponse.redirect(
            new URL(`${loginRedirect}?error=server_connection_error`, request.url)
        );
    }
}
