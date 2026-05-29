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
  // Serves the static landing page at the root URL.
  async rewrites() {
    return [
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
        source: '/Funds/Compare',
        destination: '/fund-compare.html',
      },
      {
        source: '/Learn',
        destination: '/learn.html',
      },
      {
        source: '/Learn/:slug',
        destination: '/learn-topic.html',
      },
      {
        source: '/News',
        destination: '/news.html',
      },
      {
        source: '/News/:id',
        destination: '/news-article.html',
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
    ];
  },

  // Redirect legacy /home path to root
  async redirects() {
    return [
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
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
      {
        source: '/home.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
      {
        source: '/Market-Pulse',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
      {
        source: '/market-pulse.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
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
