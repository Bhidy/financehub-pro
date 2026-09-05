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

    // 0) Malformed percent-encoding (a truncated UTF-8 sequence such as %E0%A4)
    // makes the router's own param decoding throw, which surfaced as a 500 on
    // every dynamic route family — funds, categories, providers, sectors, news,
    // symbols (verified live 2026-09-05). It is a bad request, not a server
    // fault, so it is answered as one before routing.
    try {
        decodeURIComponent(url.pathname);
    } catch {
        return new NextResponse('Bad Request', { status: 400 });
    }
    // 0b) Double-encoded Arabic URLs (`%25D8%25A8…`): no slug of ours contains a
    // literal "%", so an encoded percent sign is always a second encoding layer.
    // The route handlers cannot see it — they receive the once-decoded path —
    // and served the hub as a duplicate 200 at that address (audit 2026-09-05,
    // seeded by a sitemap that encoded twice). Peel one layer and 308.
    if (url.pathname.includes('%25')) {
        const once = url.pathname.replace(/%25/g, '%');
        return NextResponse.redirect(`${url.origin}${once}${url.search}`, 308);
    }

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
        // ONLY the ticker is upper-cased. Arabic company URLs carry a slug
        // (/ar/symbol/COMI-البنك-التجاري-الدولي) and upper-casing the whole
        // segment would fight the page's own lower-case canonical forever —
        // an infinite redirect. Arabic script has no case, so the split is at
        // the first dash immediately followed by an Arabic letter, matching
        // symbolFromArParam() exactly.
        if (canonicalFirst === 'symbol' && segments[base + 1]) {
            const seg = segments[base + 1];
            const arCut = /-(?=[\u0600-\u06FF])/.exec(seg);
            const ticker = arCut ? seg.slice(0, arCut.index) : seg;
            const rest = arCut ? seg.slice(arCut.index) : '';
            const upper = ticker.toUpperCase() + rest;
            if (seg !== upper) {
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
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    const ttl = edgeTtlFor(url.pathname);
    if (ttl !== null) {
        response.headers.set('Cache-Control', `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${ttl * 4}`);
    }
    return response;
}

/**
 * The Arabic tree is the `/ar` path prefix and nothing else — segment-exact so
 * `/article`, `/archive` etc. can never be mistaken for it.
 */
export function isArabicPath(pathname: string): boolean {
    return pathname === '/ar' || pathname.startsWith('/ar/');
}

/**
 * Edge TTL (seconds) for a public page, or null to leave the route's own
 * caching alone.
 *
 * SCOPE — READ THIS BEFORE TRUSTING IT (measured on production 2026-09-03):
 * this header IS applied to static-file rewrites (`/`, `/Market-Pulse`) and to
 * any route that is not a dynamic server render. It is NOT applied to
 * `force-dynamic` App Router pages on Vercel: the platform stamps those with
 * `private, no-cache, no-store` at render time and that wins over both this
 * header and a next.config `headers()` entry. (`next start` locally DOES
 * honour it, which is exactly why this needed verifying against production
 * rather than a dev box.)
 *
 * So: keep this — it is correct, it works today for the static surfaces, and
 * it applies automatically to any route that later stops being force-dynamic —
 * but do NOT treat it as "the dynamic pages are edge-cached". The lever that
 * actually removes per-request latency on those pages is the cross-request
 * DATA cache (`unstable_cache` in lib/public-data.ts).
 *
 * TTLs are shorter than each dataset's own refresh cadence, so the edge can
 * never serve a number the origin would not have served:
 *   market data  — refreshed intraday, 5 min
 *   fund NAVs    — published twice daily, 15 min
 *   news article — immutable once published, 1 h
 *   reference    — changes only on deploy, 1 day (deploys purge the CDN)
 *
 * Safe to cache PUBLICLY: none of these render per-user content. The nav's
 * auth state is a client component that hydrates from localStorage, so the
 * server-rendered HTML is identical for every visitor.
 *
 * Anything not listed keeps no-store — private surfaces (/admin, /settings,
 * /login, /register, /AiChat, /Portfolio), the API, and anything unrecognised.
 * The default is deliberately "do not cache".
 */
export function edgeTtlFor(pathname: string): number | null {
    const p = pathname.startsWith('/ar/') ? pathname.slice(3) : pathname === '/ar' ? '/' : pathname;

    // ONE OWNER PER ROUTE. The four designed hubs are served by Route Handlers
    // (app/{Funds,News,Learn,Market-Pulse}/route.ts) that build their own
    // Response and set their own Cache-Control. Unlike a page, a Route
    // Handler's header is honoured by Vercel — so the handler is the right
    // owner, and middleware must not overwrite it here. Setting it in both
    // places is not "belt and braces": it is two sources of truth that will
    // disagree the first time one is edited.
    if (/^\/(Funds|News|Learn|Market-Pulse)$/.test(p)) return null;

    // Never cache authenticated or interactive surfaces.
    if (/^\/(api|admin|settings|login|register|forgot-password|AiChat|Portfolio|shared)(\/|$)/.test(p)) return null;

    if (p === '/News' || /^\/News\//.test(p)) return 3600;
    if (/^\/Funds(\/|$)/.test(p)) return 900;
    if (p === '/' || p === '/companies' || /^\/(sectors|markets|symbol)(\/|$)/.test(p)) return 300;
    if (/^\/(about|contact|editorial-policy|corrections|privacy|terms|Calculators|RiskAssessment|Learn|Market-Pulse)(\/|$)/.test(p)) {
        return 86400;
    }
    return null;
}

export const config = {
    // Run site-wide (except Next internals and common static files) so the
    // canonical-host redirect applies to every page, including /admin.
    matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
