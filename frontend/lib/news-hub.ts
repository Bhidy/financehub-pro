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

export type NewsPaging = {
    /** 1-based. */
    page: number;
    totalPages: number;
    /** Builds the URL for a page number; page 1 must be the clean path. */
    hrefFor: (page: number) => string;
};

export type NewsHubSpec = {
    lang: 'en' | 'ar';
    canonical: string;
    /** Omit for an unpaginated hub. */
    paging?: NewsPaging;
    /** hreflang twin. */
    altPath: string;
    title: string;
    description: string;
    /** Rendered as the lead story's eyebrow — the hub's own name. */
    heading: string;
    /**
     * The shell's `<h1 data-key="news_title">`.
     *
     * news.html bakes in the English "Market stories, clearly told." and relies
     * on its client i18n pass to translate it, so every Arabic news URL served
     * an English H1 to any crawler that does not execute JS — including the
     * answer engines robots.txt explicitly invites.
     *
     * `pageSpecific` distinguishes the two cases: a topic archive gets its own
     * topic name (so the seven archives stop sharing one H1) and must drop the
     * data-key or the i18n pass would overwrite it, exactly as the fund
     * category hubs already do. A front hub keeps the dictionary line and its
     * key, so the language toggle still works in place.
     */
    h1: { text: string; pageSpecific: boolean };
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

/**
 * Numbered pager. Shows first/last plus a window around the current page so a
 * crawler can walk the whole archive in a bounded number of hops rather than
 * following a single "next" chain 77 links deep.
 */
function buildPager(p: NewsPaging, lang: 'en' | 'ar'): string {
    const isAr = lang === 'ar';
    const pages = new Set<number>([1, p.totalPages]);
    for (let i = p.page - 2; i <= p.page + 2; i++) if (i >= 1 && i <= p.totalPages) pages.add(i);
    const ordered = [...pages].sort((a, b) => a - b);

    const link = (n: number, label?: string) =>
        n === p.page
            ? `<span aria-current="page">${esc(String(n))}</span>`
            : `<a href="${escUrl(p.hrefFor(n))}"${n === p.page - 1 ? ' rel="prev"' : n === p.page + 1 ? ' rel="next"' : ''}>${esc(label ?? String(n))}</a>`;

    const parts: string[] = [];
    if (p.page > 1) parts.push(link(p.page - 1, isAr ? 'السابق' : 'Previous'));
    let last = 0;
    for (const n of ordered) {
        if (last && n - last > 1) parts.push('<span aria-hidden="true">…</span>');
        parts.push(link(n));
        last = n;
    }
    if (p.page < p.totalPages) parts.push(link(p.page + 1, isAr ? 'التالي' : 'Next'));

    return (
        `<nav aria-label="${esc(isAr ? 'صفحات الأخبار' : 'News pages')}"${isAr ? ' dir="rtl"' : ''} ` +
        `style="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-top:1.5rem">` +
        parts.join('') +
        `</nav>`
    );
}

export function renderNewsHub(spec: NewsHubSpec): Promise<Response> {
    const isAr = spec.lang === 'ar';
    const clean = spec.articles
        .map((a) => ({
            id: a.id,
            headline: sanitizeNewsText(a.headline) || (isAr ? 'تحديث من السوق' : 'Market update'),
            symbol: a.symbol || '',
            published: a.published_at,
            // Each card targets the article's OWN tree — an Arabic article on the
            // English hub still links to /ar/News/..., because that is its one URL.
            href: canonicalNewsPath(a.id, a.headline, (a as { source_section?: string | null }).source_section),
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

    // CRAWLABLE PAGER. Without it the archive is capped at one page: 4,543 of
    // 4,583 articles were reachable only from the sitemap, which discovers
    // URLs but passes no internal link equity to them.
    const pager = spec.paging && spec.paging.totalPages > 1 ? buildPager(spec.paging, spec.lang) : '';

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
            .join('') +
        pager;

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
        heroText: [{ dataKey: 'news_title', text: spec.h1.text, keepKey: !spec.h1.pageSpecific }],
        replacements: [
            { find: '<title>News | Starta Markets</title>', replace: `<title>${esc(spec.title)}</title>` },
            {
                find: '<link rel="canonical" href="https://startamarkets.com/News">',
                replace:
                    // SELF-canonical on every page. Pointing page 2 at page 1
                    // would tell Google page 2 should not rank, which on an
                    // archive means the deeper pages never get crawled — the
                    // opposite of why pagination exists.
                    `<link rel="canonical" href="https://startamarkets.com${encodeURI(spec.canonical)}">` +
                    (spec.paging && spec.paging.page > 1
                        ? `<link rel="prev" href="https://startamarkets.com${encodeURI(spec.paging.hrefFor(spec.paging.page - 1))}">`
                        : '') +
                    (spec.paging && spec.paging.page < spec.paging.totalPages
                        ? `<link rel="next" href="https://startamarkets.com${encodeURI(spec.paging.hrefFor(spec.paging.page + 1))}">`
                        : '') +
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
