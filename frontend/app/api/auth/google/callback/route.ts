import { NextRequest, NextResponse } from "next/server";

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://starta.46-224-223-172.sslip.io";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state"); // Contains mobile/desktop flag

    // Parse state to determine if mobile
    let isMobile = false;
    if (state) {
        try {
            const stateData = JSON.parse(decodeURIComponent(state));
            isMobile = stateData.mobile === true;
        } catch (e) {
            // Legacy: check if state simply equals "mobile"
            isMobile = state === "mobile";
        }
    }

    const successRedirect = isMobile ? "/mobile-ai-analyst" : "/ai-analyst";
    const loginRedirect = isMobile ? "/mobile-ai-analyst/login" : "/login";

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

        // Create a response that will set cookies/localStorage on client side
        // We'll use a redirect with token in query params (temporary, handled by client)
        const redirectUrl = new URL(successRedirect, request.url);
        redirectUrl.searchParams.set("token", data.access_token);
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
