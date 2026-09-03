import { getLatestNews } from '@/lib/public-data';
import { SITE_URL, absUrl, xmlEscape } from '@/lib/seo';
import { canonicalNewsPath, sanitizeNewsText } from '@/lib/news-display';

/**
 * /feed.xml — RSS 2.0 feed of the latest EGX market news. Prerequisite for
 * Google Publisher Center / Bing PubHub enrolment and for syndication
 * (2026-07-03 audit: no RSS existed anywhere, blocking Top Stories/Discover).
 */

export const dynamic = 'force-dynamic';

export async function GET() {
    let items = '';
    try {
        const articles = await getLatestNews(50);
        items = articles
            .map((a) => {
                const link = absUrl(canonicalNewsPath(a.id, a.headline));
                const title = xmlEscape((sanitizeNewsText(a.headline) || 'Egypt market update').trim());
                const body = (a.article_body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
                const pub = a.published_at ? new Date(a.published_at).toUTCString() : new Date().toUTCString();
                return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pub}</pubDate>
      <description>${xmlEscape(body)}</description>
    </item>`;
            })
            .join('\n');
    } catch {
        items = '';
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Starta Markets — Egypt Market News (EGX)</title>
    <link>${SITE_URL}/News</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Latest Egyptian Exchange (EGX) stock and mutual-fund news from Starta Markets.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        },
    });
}
