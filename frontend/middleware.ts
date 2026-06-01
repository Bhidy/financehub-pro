import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Canonical public host. Any other host (e.g. the project's *.vercel.app
// preview/production URLs) is permanently redirected here so the app has
// exactly one public face and the admin area is never exposed on a bare
// Vercel URL.
const CANONICAL_HOST = 'startamarkets.com';

const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
    '/aichat': '/AiChat',
    '/ai-analyst': '/AiChat',
    '/ai-mobile': '/AiChat',
    '/mobile-ai-analyst': '/AiChat',
    '/mobile-ai-analyst/login': '/login',
    '/mobile-ai-analyst/register': '/register',
    '/mobile-ai-analyst/forgot-password': '/forgot-password',
};

export function middleware(request: NextRequest) {
    const host = request.headers.get('host') ?? '';

    // 1) Canonical-host enforcement.
    // Redirect any *.vercel.app host (preview or default project domain) to the
    // branded domain, preserving the full path + query string.
    if (host.endsWith('.vercel.app')) {
        const url = request.nextUrl.clone();
        url.protocol = 'https:';
        url.host = CANONICAL_HOST;
        url.port = '';
        return NextResponse.redirect(url, 308); // 308 Permanent Redirect
    }

    // 2) Canonical chatbot route is /AiChat. Redirect legacy aliases permanently.
    const redirectTarget = LEGACY_ROUTE_REDIRECTS[request.nextUrl.pathname];
    if (redirectTarget) {
        const url = request.nextUrl.clone();
        url.pathname = redirectTarget;
        return NextResponse.redirect(url, 308);
    }

    return NextResponse.next();
}

export const config = {
    // Run site-wide (except Next internals and common static files) so the
    // canonical-host redirect applies to every page, including /admin.
    matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
