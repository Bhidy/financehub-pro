import { renderStaticHub, esc, escUrl, jsonLdScript } from '@/lib/static-hub';
import { getNewsPage } from '@/lib/public-data';
import { canonicalNewsPath, sanitizeNewsText } from '@/lib/news-display';
import { SITE_URL, absUrl } from '@/lib/seo';

/**
 * /News — the designed news hub, now served with its lead story and article
 * grid rendered server-side.
 *
 * Before: 152 words, ZERO structured data, and NOT ONE link to an article —
 * the entire 4,583-URL news archive had no crawlable path from its own hub.
 * Discovery depended on the sitemap alone.
 *
 * Markup mirrors news-public.js's own `storyCard` / featured templates (same
 * class names), so the client re-render that follows is visually identical.
 */
export const dynamic = 'force-dynamic';

const PER_PAGE = 24;

/** Matches the client's `relativeDate` closely enough for a pre-render that is
 *  replaced within milliseconds; the machine-readable date is in the JSON-LD
 *  and the <time> element, which is what a crawler reads. */
function isoDate(v: unknown): string {
    const t = v ? Date.parse(String(v)) : NaN;
    return Number.isFinite(t) ? new Date(t).toISOString() : '';
}
function humanDate(v: unknown): string {
    const t = v ? Date.parse(String(v)) : NaN;
    return Number.isFinite(t)
        ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
}

export async function GET() {
    let articles: Array<Record<string, unknown>> = [];
    try {
        const page = await getNewsPage(1, PER_PAGE);
        articles = page.articles as unknown as Array<Record<string, unknown>>;
    } catch (error) {
        // A DB blip must not break the hub — it degrades to today's shell.
        console.error('[hub:news] query failed:', (error as Error).message);
    }

    const clean = articles
        .map((a) => ({
            id: a.id as number,
            headline: sanitizeNewsText(a.headline as string) || 'Market update',
            symbol: (a.symbol as string) || '',
            published: a.published_at,
            href: canonicalNewsPath(a.id as number, a.headline as string),
        }))
        .filter((a) => a.id);

    const lead = clean[0];
    const rest = clean.slice(1);

    const featuredHtml = lead
        ? `<article class="feature">` +
          `<div class="feature-copy">` +
          `<span class="eyebrow">Featured</span>` +
          (lead.symbol ? `<span class="symbol" style="margin-top:1rem">${esc(lead.symbol)}</span>` : '') +
          `<h2 class="display"><a href="${escUrl(lead.href)}">${esc(lead.headline)}</a></h2>` +
          `<div class="story-foot"><span class="meta"><time datetime="${esc(isoDate(lead.published))}">${esc(humanDate(lead.published))}</time></span>` +
          `<a class="read-more" href="${escUrl(lead.href)}">Read article<span>&rarr;</span></a></div>` +
          `</div></article>`
        : '';

    const gridHtml = rest
        .map(
            (a) =>
                `<article class="story-card"><div class="story-content">` +
                (a.symbol ? `<span class="symbol">${esc(a.symbol)}</span>` : '') +
                `<h2 class="display"><a href="${escUrl(a.href)}">${esc(a.headline)}</a></h2>` +
                `<div class="story-foot"><span class="meta"><time datetime="${esc(isoDate(a.published))}">${esc(humanDate(a.published))}</time></span>` +
                `<a class="read-more" href="${escUrl(a.href)}">Read article<span>&rarr;</span></a></div>` +
                `</div></article>`
        )
        .join('');

    // CollectionPage + ItemList describes what this page IS (a list of
    // articles). Individual NewsArticle nodes belong on the article pages,
    // which already carry them — duplicating them here would assert the same
    // entity twice from two URLs.
    const collection = clean.length
        ? {
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              '@id': `${SITE_URL}/News`,
              name: 'Egyptian market news',
              description: 'Latest Egyptian Exchange (EGX) and Egyptian economy news, updated continuously.',
              isPartOf: { '@id': `${SITE_URL}/#website` },
              mainEntity: {
                  '@type': 'ItemList',
                  numberOfItems: clean.length,
                  itemListOrder: 'https://schema.org/ItemListOrderDescending',
                  itemListElement: clean.map((a, i) => ({
                      '@type': 'ListItem',
                      position: i + 1,
                      name: a.headline,
                      url: absUrl(a.href),
                  })),
              },
          }
        : null;

    const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'News' },
        ],
    };

    return renderStaticHub({
        file: 'news.html',
        lang: 'en',
        injections: [
            { id: 'featuredStory', html: featuredHtml },
            { id: 'newsGrid', html: gridHtml },
        ],
        head: (collection ? jsonLdScript(collection) : '') + jsonLdScript(breadcrumb),
        // News turns over continuously; 5 minutes at the edge is well inside
        // the ingestion cadence and still removes the per-crawl origin render.
        cacheSeconds: 300,
    });
}
