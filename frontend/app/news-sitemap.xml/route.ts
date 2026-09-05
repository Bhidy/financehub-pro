import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';
import { absUrl, xmlEscape } from '@/lib/seo';
import { canonicalNewsPath, sanitizeNewsText, primaryNewsRows } from '@/lib/news-display';

export const dynamic = 'force-dynamic';

/**
 * Google News sitemap: articles from the last 48 hours only (per Google News
 * sitemap spec). Language derived from source_section ('.../ar' => ar).
 */
export async function GET() {
    try {
        const result = await db.query(
            `SELECT id, headline, published_at, source_section, symbol,
                    left(article_body, 400) AS body_head
             FROM market_news
             WHERE published_at >= NOW() - INTERVAL '48 hours'
             ORDER BY published_at DESC
             LIMIT 1000`
        );
        // Same publishable subset as the archive sitemap: no off-market
        // stories, one URL per story (see primaryNewsRows).
        const items = primaryNewsRows(result.rows as Array<{ id: number; headline: string; symbol: string | null; body_head: string | null; published_at: string; source_section: string | null }>)
            .map((r: any) => {
                const lang = (r.source_section || '').endsWith('/ar') ? 'ar' : 'en';
                return `  <url>
    <loc>${absUrl(canonicalNewsPath(r.id, r.headline, r.source_section))}</loc>
    <news:news>
      <news:publication>
        <news:name>Starta Markets</news:name>
        <news:language>${lang}</news:language>
      </news:publication>
      <news:publication_date>${new Date(r.published_at).toISOString()}</news:publication_date>
      <news:title>${xmlEscape(sanitizeNewsText(r.headline) || 'Egypt Market Update')}</news:title>
    </news:news>
  </url>`;
            })
            .join('\n');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${items}\n</urlset>\n`;
        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
            },
        });
    } catch (error: any) {
        console.error('[news-sitemap]', error.message);
        return new NextResponse('Sitemap temporarily unavailable', { status: 503 });
    }
}
