import { renderStaticHub, esc, escUrl, jsonLdScript, langSeedScript } from '@/lib/static-hub';
import { fundsHubRows, fundsHubItemList, breadcrumbJson } from '@/lib/funds-hub-render';

/**
 * THE ONE FUND-HUB RENDERER.
 *
 * Every fund collection page — the whole market, a category, a bank or asset
 * manager — is the SAME premium marketplace (public/marketplace.html) with a
 * different slice of funds pre-rendered into it and a different heading. One
 * implementation, so a new hub type cannot accidentally introduce a second,
 * plainer design the way the category pages first did.
 *
 * What varies per hub is only: the title/description/canonical, the heading
 * and intro, which funds are listed, which marketplace filter is pre-seeded,
 * and the sibling links. Nothing about the design varies at all.
 */

export type FundHubSpec = {
    lang: 'en' | 'ar';
    canonical: string;
    /** hreflang twin. */
    altPath: string;
    title: string;
    description: string;
    /** The <h1>. Should be the query a searcher actually types. */
    heading: string;
    /** One factual paragraph under the heading. */
    intro: string;
    funds: Array<Record<string, unknown>>;
    /** Raw fund_type the marketplace filter understands, or '' for none. */
    marketplaceType?: string;
    /** Breadcrumb trail, innermost last. */
    crumbs: Array<{ name: string; url?: string }>;
    /** Related hubs rendered as chips under the list. */
    siblings?: Array<{ href: string; label: string }>;
    /** Seconds of edge cache. */
    cacheSeconds?: number;
};

export function renderFundHub(spec: FundHubSpec): Promise<Response> {
    const isAr = spec.lang === 'ar';
    const siblingNav = spec.siblings?.length
        ? `<nav aria-label="${esc(isAr ? 'روابط ذات صلة' : 'Related')}" style="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:.5rem">` +
          spec.siblings.map((s) => `<a href="${escUrl(s.href)}">${esc(s.label)}</a>`).join('') +
          `</nav>`
        : '';

    return renderStaticHub({
        file: 'marketplace.html',
        lang: spec.lang,
        replacements: [
            { find: '<title>Funds Marketplace | Starta Markets</title>', replace: `<title>${esc(spec.title)}</title>` },
            {
                find: '<link rel="canonical" href="https://startamarkets.com/Funds">',
                replace:
                    `<link rel="canonical" href="https://startamarkets.com${encodeURI(spec.canonical)}">` +
                    `<link rel="alternate" hreflang="${isAr ? 'ar' : 'en'}" href="https://startamarkets.com${encodeURI(spec.canonical)}">` +
                    `<link rel="alternate" hreflang="${isAr ? 'en' : 'ar'}" href="https://startamarkets.com${encodeURI(spec.altPath)}">` +
                    `<link rel="alternate" hreflang="x-default" href="https://startamarkets.com${encodeURI(isAr ? spec.canonical : spec.altPath)}">`,
            },
            {
                find: '<meta property="og:url" content="https://startamarkets.com/Funds">',
                replace: `<meta property="og:url" content="https://startamarkets.com${encodeURI(spec.canonical)}">`,
            },
            {
                find: '<meta property="og:title" content="Funds Marketplace | Starta Markets">',
                replace: `<meta property="og:title" content="${esc(spec.title)}">`,
            },
            ...(isAr
                ? [{ find: '<meta property="og:locale" content="en_US">', replace: '<meta property="og:locale" content="ar_EG">' }]
                : []),
            {
                find: '<meta name="description"\n        content="Explore the full Egypt mutual funds universe with Starta. Filter by manager, performance, risk, and Shariah status with a premium research-grade interface.">',
                replace: `<meta name="description" content="${esc(spec.description)}">`,
            },
        ],
        // data-key is stripped with the text, or the page's own i18n pass would
        // overwrite the heading with the generic one on boot.
        heroText: [
            { dataKey: 'marketplace_title', text: spec.heading },
            { dataKey: 'marketplace_subline', text: spec.intro },
        ],
        injections: [{ id: 'fundsGrid', html: fundsHubRows(spec.funds, spec.lang) + siblingNav }],
        head:
            langSeedScript(spec.lang) +
            (spec.marketplaceType
                ? `<script>window.__STARTA_FUND_TYPE__=${JSON.stringify(spec.marketplaceType)};</script>`
                : '') +
            jsonLdScript(fundsHubItemList(spec.funds, spec.lang, spec.canonical, spec.heading)) +
            jsonLdScript(breadcrumbJson(spec.crumbs)),
        cacheSeconds: spec.cacheSeconds ?? 900,
    });
}
