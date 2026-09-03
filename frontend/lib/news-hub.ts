import { renderStaticHub, esc, escUrl, jsonLdScript, langSeedScript } from '@/lib/static-hub';
import { canonicalNewsPath, sanitizeNewsText } from '@/lib/news-display';
import { SITE_URL, absUrl } from '@/lib/seo';

/**
 * THE ONE NEWS-HUB RENDERER.
 *
 * Every news collection page — the front hub in either language and every
 * topic archive — is the SAME designed news page (public/news.html) with a
 * different slice of articles pre-rendered into its empty containers. One
 * implementation, so a topic hub cannot introduce a second, plainer design.
 *
 * The page's own script overwrites those containers on load, so a visitor sees
 * exactly what they saw before; a crawler gets the same articles rendered
 * ahead of time.
 */

export type NewsArticleRow = {
    id: number;
    headline: string;
    published_at: unknown;
    symbol?: string | null;
};

export type NewsHubSpec = {
    lang: 'en' | 'ar';
    canonical: string;
    /** hreflang twin. */
    altPath: string;
    title: string;
    description: string;
    /** Rendered as the lead story's eyebrow — the hub's own name. */
    heading: string;
    intro: string;
    articles: NewsArticleRow[];
    crumbs: Array<{ name: string; url?: string }>;
    siblings?: Array<{ href: string; label: string }>;
    cacheSeconds?: number;
};

const isoDate = (v: unknown): string => {
    const t = v ? Date.parse(String(v)) : NaN;
    return Number.isFinite(t) ? new Date(t).toISOString() : '';
};
const humanDate = (v: unknown, lang: 'en' | 'ar'): string => {
    const t = v ? Date.parse(String(v)) : NaN;
    return Number.isFinite(t)
        ? new Date(t).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
          })
        : '';
};

export function renderNewsHub(spec: NewsHubSpec): Promise<Response> {
    const isAr = spec.lang === 'ar';
    const clean = spec.articles
        .map((a) => ({
            id: a.id,
            headline: sanitizeNewsText(a.headline) || (isAr ? 'تحديث من السوق' : 'Market update'),
            symbol: a.symbol || '',
            published: a.published_at,
            href: canonicalNewsPath(a.id, a.headline),
        }))
        .filter((a) => a.id);

    const lead = clean[0];
    const rest = clean.slice(1);
    const readMore = isAr ? 'اقرأ المقال' : 'Read article';
    const arrow = isAr ? '←' : '→';

    const featuredHtml = lead
        ? `<article class="feature"${isAr ? ' dir="rtl" lang="ar"' : ''}><div class="feature-copy">` +
          `<span class="eyebrow">${esc(spec.heading)}</span>` +
          (lead.symbol ? `<span class="symbol" style="margin-top:1rem">${esc(lead.symbol)}</span>` : '') +
          `<h2 class="display"><a href="${escUrl(lead.href)}">${esc(lead.headline)}</a></h2>` +
          `<p>${esc(spec.intro)}</p>` +
          `<div class="story-foot"><span class="meta"><time datetime="${esc(isoDate(lead.published))}">${esc(humanDate(lead.published, spec.lang))}</time></span>` +
          `<a class="read-more" href="${escUrl(lead.href)}">${esc(readMore)}<span>${arrow}</span></a></div>` +
          `</div></article>`
        : '';

    const siblingNav = spec.siblings?.length
        ? `<nav aria-label="${esc(isAr ? 'أقسام الأخبار' : 'News topics')}"${isAr ? ' dir="rtl"' : ''} style="display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem">` +
          spec.siblings.map((s) => `<a href="${escUrl(s.href)}">${esc(s.label)}</a>`).join('') +
          `</nav>`
        : '';

    const gridHtml =
        siblingNav +
        rest
            .map(
                (a) =>
                    `<article class="story-card"${isAr ? ' dir="rtl" lang="ar"' : ''}><div class="story-content">` +
                    (a.symbol ? `<span class="symbol">${esc(a.symbol)}</span>` : '') +
                    `<h2 class="display"><a href="${escUrl(a.href)}">${esc(a.headline)}</a></h2>` +
                    `<div class="story-foot"><span class="meta"><time datetime="${esc(isoDate(a.published))}">${esc(humanDate(a.published, spec.lang))}</time></span>` +
                    `<a class="read-more" href="${escUrl(a.href)}">${esc(readMore)}<span>${arrow}</span></a></div>` +
                    `</div></article>`
            )
            .join('');

    // CollectionPage + ItemList describes what the page IS. Individual
    // NewsArticle nodes belong on the article pages, which already carry them;
    // repeating them here would assert one entity from two URLs.
    const collection = clean.length
        ? {
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              '@id': `${SITE_URL}${spec.canonical}`,
              name: spec.heading,
              description: spec.description,
              inLanguage: isAr ? 'ar-EG' : 'en',
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
        itemListElement: spec.crumbs.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.name,
            ...(c.url ? { item: SITE_URL + c.url } : {}),
        })),
    };

    return renderStaticHub({
        file: 'news.html',
        lang: spec.lang,
        replacements: [
            { find: '<title>News | Starta Markets</title>', replace: `<title>${esc(spec.title)}</title>` },
            {
                find: '<link rel="canonical" href="https://startamarkets.com/News">',
                replace:
                    `<link rel="canonical" href="https://startamarkets.com${encodeURI(spec.canonical)}">` +
                    `<link rel="alternate" hreflang="${isAr ? 'ar' : 'en'}" href="https://startamarkets.com${encodeURI(spec.canonical)}">` +
                    `<link rel="alternate" hreflang="${isAr ? 'en' : 'ar'}" href="https://startamarkets.com${encodeURI(spec.altPath)}">` +
                    `<link rel="alternate" hreflang="x-default" href="https://startamarkets.com${encodeURI(isAr ? spec.canonical : spec.altPath)}">`,
            },
            {
                find: '<meta property="og:url" content="https://startamarkets.com/News">',
                replace: `<meta property="og:url" content="https://startamarkets.com${encodeURI(spec.canonical)}">`,
            },
            ...(isAr
                ? [{ find: '<meta property="og:locale" content="en_US">', replace: '<meta property="og:locale" content="ar_EG">' }]
                : []),
        ],
        injections: [
            { id: 'featuredStory', html: featuredHtml },
            { id: 'newsGrid', html: gridHtml },
        ],
        head:
            langSeedScript(spec.lang) +
            (collection ? jsonLdScript(collection) : '') +
            jsonLdScript(breadcrumb),
        cacheSeconds: spec.cacheSeconds ?? 300,
    });
}
