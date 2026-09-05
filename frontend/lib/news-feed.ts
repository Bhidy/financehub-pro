import { getLatestNews } from '@/lib/public-data';
import { SITE_URL, absUrl, xmlEscape, type SiteLang } from '@/lib/seo';
import { canonicalNewsPath, newsLang, sanitizeNewsText } from '@/lib/news-display';

/**
 * RSS 2.0 for the news archive, ONE FEED PER LANGUAGE.
 *
 * The archive is genuinely bilingual — 2,033 Arabic and 2,552 English articles,
 * different stories, not translations. The single /feed.xml used to take the
 * newest 50 regardless of language and declare `<language>en</language>` over
 * a mixed list, while the Arabic tree had no feed at all (/ar/feed.xml 404'd).
 * A feed that lies about its language is a feed aggregators and Publisher
 * Center cannot classify; an Arabic tree with no feed has no syndication path.
 *
 * Language is decided by newsLang() — the SAME chokepoint the article page,
 * the sitemaps and the hubs use — so an article's feed and its canonical URL
 * can never disagree about which tree it lives in.
 */
export const FEED_PATH: Record<SiteLang, string> = { en: '/feed.xml', ar: '/ar/feed.xml' };

/** Pull a wide-enough window that 50 items of either language survive the split. */
const WINDOW = 200;
const ITEMS = 50;

export async function renderNewsFeed(lang: SiteLang): Promise<Response> {
    const isAr = lang === 'ar';
    let items = '';
    try {
        const articles = (await getLatestNews(WINDOW)).filter((a) => newsLang(a) === lang).slice(0, ITEMS);
        items = articles
            .map((a) => {
                const link = absUrl(canonicalNewsPath(a.id, a.headline, a.source_section));
                const title = xmlEscape((sanitizeNewsText(a.headline) || (isAr ? 'تحديث السوق المصري' : 'Egypt market update')).trim());
                const body = (a.article_body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
                const pub = a.published_at ? new Date(a.published_at).toUTCString() : new Date().toUTCString();
                return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pub}</pubDate>
      <description>${xmlEscape(sanitizeNewsText(body))}</description>
    </item>`;
            })
            .join('\n');
    } catch {
        items = '';
    }

    const channelTitle = isAr ? 'ستارتا ماركتس — أخبار البورصة المصرية' : 'Starta Markets — Egypt Market News (EGX)';
    const channelDesc = isAr
        ? 'أحدث أخبار البورصة المصرية والشركات المقيدة وصناديق الاستثمار من ستارتا ماركتس.'
        : 'Latest Egyptian Exchange (EGX) stock and mutual-fund news from Starta Markets.';
    const hub = isAr ? '/ar/News' : '/News';

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(channelTitle)}</title>
    <link>${SITE_URL}${hub}</link>
    <atom:link href="${SITE_URL}${FEED_PATH[lang]}" rel="self" type="application/rss+xml" />
    <description>${xmlEscape(channelDesc)}</description>
    <language>${lang}</language>
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

/** `<link rel="alternate" type="application/rss+xml">` for a page in `lang`. */
export function rssAutodiscoveryLink(lang: SiteLang): string {
    const title = lang === 'ar' ? 'أخبار البورصة المصرية — RSS' : 'Egypt market news — RSS';
    return `<link rel="alternate" type="application/rss+xml" title="${xmlEscape(title)}" href="${SITE_URL}${FEED_PATH[lang]}">`;
}
