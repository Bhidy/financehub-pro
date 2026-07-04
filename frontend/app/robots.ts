import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * /robots.txt — explicit crawl policy (previously this URL 404'd, so crawlers
 * had no policy and no sitemap pointer at all).
 *
 * Policy: everything public is crawlable, including by AI/answer-engine bots
 * (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc. — the wildcard rule
 * covers them deliberately; AI citations are a distribution channel for us).
 * Private/app surfaces and the API are excluded.
 */

const DISALLOW = [
    '/admin',
    '/settings',
    '/login',
    '/register',
    '/forgot-password',
    '/api/',
    '/shared/msg/',
];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: DISALLOW,
            },
            // Explicit opt-in for AI / answer-engine crawlers (audit: they
            // previously only rode the wildcard). AI citations are a
            // distribution channel we deliberately want — make it auditable.
            {
                userAgent: [
                    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web',
                    'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended',
                    'Applebot-Extended', 'CCBot',
                ],
                allow: '/',
                disallow: DISALLOW,
            },
        ],
        // Both sitemaps listed: the Google News sitemap is not in the index
        // (news-specific format), so robots.txt is its discovery path until
        // Search Console submission happens.
        sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
    };
}
