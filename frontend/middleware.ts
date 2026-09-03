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
    'calculators': 'Calculators',
    'riskassessment': 'RiskAssessment',
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

    // 3) Legacy query-param fund URL -> path URL (query stripped; the page
    // then 308s on to the slugged canonical /Funds/{id}-{slug}).
    if (url.pathname === '/Fund') {
        const fid = url.searchParams.get('id');
        if (fid && /^\d+$/.test(fid)) {
            url.pathname = `/Funds/${fid}`;
            url.search = '';
            return NextResponse.redirect(url, 308);
        }
    }

    // 4) Case canonicalization. Only for known public segments; never touches
    // /api, /_next (excluded by matcher), file paths, or unknown routes.
    // Arabic tree: /ar/<same segments> — normalize the same way, shifted by one.
    const segments = url.pathname.split('/');
    let base = 1;
    if ((segments[1] || '').toLowerCase() === 'ar') {
        if (segments[1] !== 'ar') {
            segments[1] = 'ar';
        }
        base = 2;
    }
    const first = segments[base] || '';
    const canonicalFirst = CANONICAL_SEGMENTS[first.toLowerCase()];
    if (canonicalFirst && !url.pathname.includes('.')) {
        let changed = base === 2 && url.pathname.split('/')[1] !== 'ar';
        if (first !== canonicalFirst) {
            segments[base] = canonicalFirst;
            changed = true;
        }
        // Symbols are uppercase by contract: /symbol/comi -> /symbol/COMI.
        if (canonicalFirst === 'symbol' && segments[base + 1]) {
            const upper = segments[base + 1].toUpperCase();
            if (segments[base + 1] !== upper) {
                segments[base + 1] = upper;
                changed = true;
            }
            // Tab/metric segments are lowercase by contract:
            // /symbol/COMI/FINANCIALS -> /symbol/COMI/financials.
            if (segments[base + 2]) {
                const tab = segments[base + 2].toLowerCase();
                if (['financials', 'dividends', 'technicals', 'history', 'market-cap', 'revenue', 'net-income', 'eps', 'dividend-yield', 'pe-ratio'].includes(tab) && segments[base + 2] !== tab) {
                    segments[base + 2] = tab;
                    changed = true;
                }
            }
        }
        // /Funds/compare -> /Funds/Compare (the compare tool's canonical case).
        if (canonicalFirst === 'Funds' && segments[base + 1] && segments[base + 1].toLowerCase() === 'compare' && segments[base + 1] !== 'Compare') {
            segments[base + 1] = 'Compare';
            changed = true;
        }
        if (changed) {
            url.pathname = segments.join('/');
            return NextResponse.redirect(url, 308);
        }
    }

    // 5) LANGUAGE HEADER — the root layout renders exactly one <html> tag for
    // both language trees, so it cannot know the request's language from a
    // route param. Middleware is the only place that sees the path before the
    // layout renders, so it stamps the URL-derived language here and the root
    // layout reads it back with headers().
    //
    // Why this matters: every /ar/* URL (funds, symbols, markets, learn,
    // glossary, the Arabic money pages) previously shipped <html lang="en">
    // with no dir="rtl" to crawlers — Arabic documents declaring themselves
    // English, contradicting their own hreflang="ar". Correcting it in
    // client JS (the previous approach) is invisible to the crawl-time
    // language signal.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-starta-lang', isArabicPath(url.pathname) ? 'ar' : 'en');
    return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * The Arabic tree is the `/ar` path prefix and nothing else — segment-exact so
 * `/article`, `/archive` etc. can never be mistaken for it.
 */
export function isArabicPath(pathname: string): boolean {
    return pathname === '/ar' || pathname.startsWith('/ar/');
}

export const config = {
    // Run site-wide (except Next internals and common static files) so the
    // canonical-host redirect applies to every page, including /admin.
    matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
