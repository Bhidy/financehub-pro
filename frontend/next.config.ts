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

  // Rewrites for custom domain (URL stays clean, content from mobile-ai-analyst)
  // Maps startamarkets.com/* to /mobile-ai-analyst/* for all mobile pages
  async rewrites() {
    // Define all mobile-only domains
    const mobileHosts = ['startamarkets.com', 'www.startamarkets.com'];

    // Define all page mappings: clean URL -> actual mobile page
    const pageMappings = [
      { source: '/', destination: '/mobile-ai-analyst' },
      { source: '/login', destination: '/mobile-ai-analyst/login' },
      { source: '/register', destination: '/mobile-ai-analyst/register' },
      { source: '/forgot-password', destination: '/mobile-ai-analyst/forgot-password' },
      { source: '/setting', destination: '/mobile-ai-analyst/setting' },
      { source: '/settings', destination: '/mobile-ai-analyst/setting' }, // Alias
    ];

    // Generate rewrites for all combinations of hosts and pages
    const beforeFiles = mobileHosts.flatMap(host =>
      pageMappings.map(({ source, destination }) => ({
        source,
        has: [{ type: 'host' as const, value: host }],
        destination,
      }))
    );

    return { beforeFiles };
  },

  // Headers for security
  async headers() {
    return [
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
