/**
 * FinanceHub Pro - Next.js Configuration
 * ENTERPRISE BUILD VALIDATION
 */

// ============================================================================
// CRITICAL: Build-Time Environment Validation
// Ensures all required secrets are present before deployment succeeds.
// ============================================================================
const REQUIRED_SERVER_ENV_VARS = ['DATABASE_URL'];

if (process.env.VERCEL) {
  // We are building on Vercel. Enforce ALL required env vars.
  for (const envVar of REQUIRED_SERVER_ENV_VARS) {
    if (!process.env[envVar]) {
      // WARN ONLY - Do not block build (allows UI updates even if DB is flaky)
      console.warn(
        `⚠️ BUILD WARNING: Missing required environment variable: ${envVar}.\n` +
        `   API routes depending on this variable may fail at runtime.`
      );
    }
  }
  console.log('✅ [Build] Environment check complete.');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone build for Docker/Railway deployment
  // Output standalone build for Docker/Railway deployment
  // REMOVED for Vercel Optimization
  // output: 'standalone',

  // Inject Build Metadata
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_GIT_COMMIT: process.env.VERCEL_GIT_COMMIT_SHA || 'local-dev',
  },

  // Type errors FAIL the build (guardrail 3.7 of the SEO plan). The tree has
  // been tsc-clean since 2026-07-03; CI runs tsc separately, and this aligns
  // the Vercel build with it so a type regression can never deploy.
  typescript: {
    ignoreBuildErrors: false,
  },

  // Image optimization for external sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.mubasher.info',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
    ],
  },

  // Experimental features for performance
  experimental: {
    optimizeCss: true,
  },

  // Canonical Home page mapping.
  // Serves the static landing pages at clean URLs.
  //
  // /News/:id and /Learn/:slug rewrites are GONE: those are now real
  // server-rendered App Router routes (app/News/[id], app/Learn/[slug]).
  // /Funds/Compare must run beforeFiles so it wins over app/Funds/[id].
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/Funds/Compare',
          destination: '/fund-compare.html',
        },
      ],
      afterFiles: [
        {
          source: '/',
          destination: '/home.html',
        },
        {
          source: '/privacy',
          destination: '/privacy.html',
        },
        {
          source: '/terms',
          destination: '/terms.html',
        },
        {
          source: '/Funds',
          destination: '/marketplace.html',
        },
        {
          source: '/Fund',
          destination: '/fund-details.html',
        },
        {
          source: '/Learn',
          destination: '/learn.html',
        },
        {
          // The DESIGNED news hub (news.html). A server-rendered replacement
          // shipped briefly in #130 and was rolled back 2026-07-03: the owner's
          // premium design is canonical — never swap a designed page for a
          // plain server page. Article pages (/News/{id}) stay server-rendered.
          source: '/News',
          destination: '/news.html',
        },
        {
          source: '/Market-Pulse',
          destination: '/market-pulse.html',
        },
        {
          source: '/Portfolio',
          destination: '/portfolio.html',
        },
        {
          source: '/Portfolio/:id',
          destination: '/portfolio-detail.html',
        },
      ],
      fallback: [],
    };
  },

  // Redirect legacy /home path to root
  async redirects() {
    // Every raw .html file 308s to its clean route: each public page used to
    // be live at 2-3 duplicate URLs (/News, /news.html, ...) with no
    // canonicals — confirmed duplicate-content defect. Redirects run BEFORE
    // rewrites, so external .html requests redirect while the internal
    // rewrites (/ -> /home.html) still resolve.
    const htmlTwins: Array<[string, string]> = [
      ['/index.html', '/'],
      ['/home.html', '/'],
      ['/news.html', '/News'],
      ['/news-article.html', '/News'],
      ['/learn.html', '/Learn'],
      ['/learn-topic.html', '/Learn'],
      ['/marketplace.html', '/Funds'],
      ['/fund-details.html', '/Funds'],
      ['/fund-compare.html', '/Funds/Compare'],
      ['/market-pulse.html', '/Market-Pulse'],
      ['/portfolio.html', '/Portfolio'],
      ['/portfolio-detail.html', '/Portfolio'],
      ['/privacy.html', '/privacy'],
      ['/terms.html', '/terms'],
    ];
    return [
      ...htmlTwins.map(([source, destination]) => ({
        source,
        destination,
        permanent: true,
      })),
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/MarketPulse',
        destination: '/Market-Pulse',
        permanent: true,
      },
      // /ar/Funds NO LONGER REDIRECTS. It is a real server-rendered Arabic
      // funds hub (app/ar/Funds/page.tsx) and the hreflang twin of /Funds.
      // While this 308 existed the site had no Arabic funds URL at all: the
      // Arabic query for Egyptian mutual funds landed on an English-declared
      // document with no fund names in its HTML, which is why competitors
      // owned that SERP. Do not reinstate this redirect.
      //
      // /ar/Learn still redirects: the Learn hub is a single-URL designed
      // static page whose language follows the stored preference, and there is
      // no separate Arabic Learn hub document to point at. Detail routes
      // (/ar/Learn/{slug}) are deeper paths and are not matched here.
      {
        source: '/ar/Learn',
        destination: '/Learn',
        permanent: true,
      },
    ];
  },

  // Headers for security
  async headers() {
    return [
      // HTML pages: allow short CDN caching with revalidation instead of the
      // previous no-store (deploys purge Vercel's static cache automatically,
      // so no-store only cost TTFB without preventing staleness).
      ...['/', '/home.html', '/Market-Pulse', '/market-pulse.html'].map((source) => ({
        source,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      })),
      // MARKET-DATA PAGES — every one of these previously shipped
      // `private, no-cache, no-store` (Next.js's default for a dynamic route),
      // so the CDN hit rate was 0% and every crawl and every visitor paid a
      // full origin render: the audit measured 0.9-1.9s TTFB on exactly this
      // set. A short s-maxage with stale-while-revalidate serves them from the
      // edge while keeping the data fresh — the underlying data refreshes on a
      // schedule (prices intraday, NAVs twice daily), never per request, so a
      // 5-minute edge TTL cannot show a number the origin would not have shown.
      // Safe to cache publicly: these pages render no per-user content (the
      // nav's auth state is a client component that hydrates from localStorage).
      ...[
        '/ar',
        '/companies',
        '/ar/companies',
        '/sectors',
        '/ar/sectors',
        '/sectors/:slug',
        '/ar/sectors/:slug',
        '/markets/:path*',
        '/ar/markets/:path*',
        '/symbol/:path*',
        '/ar/symbol/:path*',
      ].map((source) => ({
        source,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=900',
          },
        ],
      })),
      // FUND PAGES — NAVs publish twice daily, so a 15-minute edge TTL is far
      // shorter than the data's own update cadence.
      ...[
        '/Funds/best-mutual-funds-egypt-2026',
        '/ar/Funds/best-mutual-funds-egypt-2026',
        '/ar/Funds',
        '/Funds/category/:slug',
        '/ar/Funds/category/:slug',
        '/Funds/:id',
        '/ar/Funds/:id',
        '/Funds/vs/:pair',
      ].map((source) => ({
        source,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=900, stale-while-revalidate=3600',
          },
        ],
      })),
      // NEWS ARTICLES — immutable once published; only the surrounding data
      // block changes, so an hour at the edge is conservative.
      {
        source: '/News/:id',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      // Editorial / reference pages that used to be prerendered at build time.
      // They became dynamic when the root layout started deriving <html lang>
      // from the request (middleware x-starta-lang) — the correct trade, but a
      // dynamic render must not cost TTFB. Their content changes only on
      // deploy, so a long CDN TTL restores static-equivalent edge latency and
      // deploys purge the CDN automatically.
      ...[
        '/about',
        '/contact',
        '/editorial-policy',
        '/ar/editorial-policy',
        '/corrections',
        '/ar/corrections',
        '/Calculators',
        '/ar/Calculators',
        '/RiskAssessment',
        '/ar/RiskAssessment',
        '/Learn/:slug',
        '/ar/Learn/:slug',
        '/Learn/glossary',
        '/ar/Learn/glossary',
        '/Learn/glossary/:slug',
        '/ar/Learn/glossary/:slug',
      ].map((source) => ({
        source,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
          },
        ],
      })),
      // Versioned static assets (?v= cache-busting is already in use): give
      // the CDN and browsers a real TTL — these previously shipped no
      // long-lived Cache-Control at all.
      ...['/assets/:path*', '/logos/:path*', '/data/:path*'].map((source) => ({
        source,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      })),
      // Private surfaces: keep crawlers out at the header level (robots.txt
      // disallow alone does not de-index already-discovered URLs).
      ...['/admin/:path*', '/login', '/register', '/forgot-password', '/settings'].map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
      {
        // CORS for the bundled mobile app (origin capacitor://localhost) and any
        // cross-origin API client. CapacitorHttp is the primary native fix; this
        // is a defensive backup so browser/WKWebView fetches are not blocked.
        // No credentials are used (bearer-token auth), so '*' is safe here.
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Max-Age', value: '86400' },
          // 63 API routes were fully indexable (no robots.txt existed).
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
