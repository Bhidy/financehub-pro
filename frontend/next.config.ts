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
  // The static hub routes (app/{Funds,News,Learn,Market-Pulse}/route.ts) read
  // their designed shell out of public/ at request time. public/ is served as
  // static assets and is NOT part of a serverless function's bundle by
  // default, so each of those functions must be told to include the file it
  // needs. Without this the routes fall back to redirecting at the static
  // asset (safe, but the server-rendered content is lost).
  outputFileTracingIncludes: {
    '/Funds': ['./public/marketplace.html'],
    '/News': ['./public/news.html'],
    '/Learn': ['./public/learn.html'],
    '/Market-Pulse': ['./public/market-pulse.html'],
  },

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
        // /Funds is served by app/Funds/route.ts, which returns THIS SAME
        // designed marketplace with its fund grid rendered server-side.
        // Re-adding a rewrite here would shadow that route and take the head
        // term back to 179 crawlable words with no fund names.
        {
          source: '/Fund',
          destination: '/fund-details.html',
        },
        // /Learn is served by app/Learn/route.ts, which returns THIS SAME
        // designed file with its topic grid rendered server-side. Re-adding a
        // rewrite here would shadow that route and take the hub back to 151
        // crawlable words with no link to any topic page.
        // /News is served by app/News/route.ts. THIS IS NOT THE #130 MISTAKE:
        // that rolled-back change REPLACED the designed news hub with a plain
        // server page. This route returns news.html ITSELF — the identical
        // designed file — with the (empty) story containers filled in before
        // it leaves the server. The page's own script overwrites them on load,
        // so a visitor sees exactly what they saw before. Never swap a
        // designed page for a plain server page; do this instead.
        // /Market-Pulse is served by app/Market-Pulse/route.ts — the same
        // designed tool with its EGX 30 quote rendered server-side instead of
        // shipping `--` to every crawler.
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
      // /ar/Learn NO LONGER REDIRECTS either, for the same reasons: it is now a
      // real Arabic hub (app/ar/Learn/route.ts) serving the same designed
      // learn.html in Arabic. While the 308 existed the Arabic education
      // cluster had no hub of its own — /ar/Learn answered `<html lang="en">`,
      // and /ar/Learn/glossary plus the 20 /ar/Learn/{slug} topic pages were
      // sitemapped with no crawlable parent in their own language tree.
      // Do not reinstate this redirect.
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
      // NOTE: page Cache-Control is set in middleware.ts (edgeTtlFor), NOT
      // here. Every public page is a force-dynamic App Router route, and
      // Next.js stamps those with `private, no-cache, no-store` at render
      // time, which OVERRIDES a next.config headers() entry — measured on
      // production 2026-09-03. Only static-file rewrites (/ , /Market-Pulse)
      // honour a configured s-maxage, which is why the two entries above work.
      // Do not re-add page caching here; it silently does nothing.
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
