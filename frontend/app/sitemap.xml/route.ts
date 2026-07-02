import { NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/**
 * Sitemap INDEX. Segmented child sitemaps live under /sitemaps/{name}.xml so
 * Search Console reports indexation per content type (companies vs funds vs
 * news vs learn) instead of one opaque number.
 */
const SEGMENTS = ['core', 'companies', 'sectors', 'funds', 'learn', 'news'];

export async function GET() {
    const now = new Date().toISOString();
    const items = SEGMENTS.map(
        (s) => `  <sitemap>\n    <loc>${SITE_URL}/sitemaps/${s}.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`
    ).join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
