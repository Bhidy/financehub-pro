import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Canonical public host. Any other host (www, the project's *.vercel.app
// preview/production URLs, etc.) is permanently redirected here so the app has
// exactly one public face, search engines see exactly one origin, and the
// admin area is never exposed on a bare Vercel URL.
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

// Vercel serves routes case-insensitively, so every public path exists at
// unbounded case variants (e.g. /news, /NEWS, /News) — duplicate-content
// poison. 308 every known first segment to its canonical casing.
const CANONICAL_SEGMENTS: Record<string, string> = {
    'news': 'News',
    'funds': 'Funds',
    'fund': 'Fund',
    'learn': 'Learn',
    'market-pulse': 'Market-Pulse',
    'portfolio': 'Portfolio',
    'companies': 'companies',
    'about': 'about',
    'contact': 'contact',
    'privacy': 'privacy',
    'terms': 'terms',
    'symbol': 'symbol',
    'login': 'login',
    'register': 'register',
    'settings': 'settings',
};

export function middleware(request: NextRequest) {
    const host = (request.headers.get('host') ?? '').toLowerCase();
    const url = request.nextUrl.clone();

    // 1) Canonical-host enforcement: *.vercel.app AND www.startamarkets.com
    // (www previously served the full site as a 200 duplicate).
    if (host.endsWith('.vercel.app') || (host !== CANONICAL_HOST && host.endsWith(`.${CANONICAL_HOST}`))) {
        url.protocol = 'https:';
        url.host = CANONICAL_HOST;
        url.port = '';
        return NextResponse.redirect(url, 308); // 308 Permanent Redirect
    }

    // 2) Canonical chatbot route is /AiChat. Redirect legacy aliases permanently.
    const redirectTarget = LEGACY_ROUTE_REDIRECTS[url.pathname.toLowerCase()];
    if (redirectTarget && url.pathname !== redirectTarget) {
        url.pathname = redirectTarget;
        return NextResponse.redirect(url, 308);
    }

    // 3) Case canonicalization. Only for known public segments; never touches
    // /api, /_next (excluded by matcher), file paths, or unknown routes.
    const segments = url.pathname.split('/');
    const first = segments[1] || '';
    const canonicalFirst = CANONICAL_SEGMENTS[first.toLowerCase()];
    if (canonicalFirst && !url.pathname.includes('.')) {
        let changed = false;
        if (first !== canonicalFirst) {
            segments[1] = canonicalFirst;
            changed = true;
        }
        // Symbols are uppercase by contract: /symbol/comi -> /symbol/COMI.
        if (canonicalFirst === 'symbol' && segments[2]) {
            const upper = segments[2].toUpperCase();
            if (segments[2] !== upper) {
                segments[2] = upper;
                changed = true;
            }
        }
        if (changed) {
            url.pathname = segments.join('/');
            return NextResponse.redirect(url, 308);
        }
    }

    return NextResponse.next();
}

export const config = {
    // Run site-wide (except Next internals and common static files) so the
    // canonical-host redirect applies to every page, including /admin.
    matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
