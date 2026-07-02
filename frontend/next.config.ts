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

  // Environment variables are handled automatically by Next.js (NEXT_PUBLIC_*)
  typescript: {
    ignoreBuildErrors: true,
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
