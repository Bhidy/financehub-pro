import { renderStaticHub, esc, escUrl, jsonLdScript, langSeedScript } from '@/lib/static-hub';
import { getAllFundsRanked } from '@/lib/public-data';
import { categoryOfFund, categoryPath, findCategory, MIN_FUNDS_TO_PUBLISH, FUND_CATEGORIES } from '@/content/fund-categories';
import { fundsHubRows, fundsHubItemList, breadcrumbJson } from '@/lib/funds-hub-render';
import { notFound } from 'next/navigation';

/**
 * FUND CATEGORY HUBS — /Funds/category/{key} and /ar/Funds/category/{arabic}.
 *
 * These serve the SAME premium marketplace design as /Funds, pre-filtered to
 * one category. They are additional URLs, not a replacement for anything, and
 * they deliberately do NOT introduce a second look: a visitor who lands on
 * "money market funds" gets the marketplace they already know, showing that
 * category.
 *
 * They exist because the category IS the query — "صناديق السيولة النقدية في
 * مصر", "صناديق الذهب في مصر" — and no competitor serves those queries with a
 * working page (the nearest one publishes eleven such slugs and every one of
 * them 404s).
 *
 * Data-gated: a category with fewer than MIN_FUNDS_TO_PUBLISH funds 404s
 * rather than shipping a thin page, so the sitemap and the 404 gate agree.
 */

const AR_TITLE_SUFFIX = ' | Starta Markets';

export async function renderCategoryHub(slug: string, lang: 'en' | 'ar'): Promise<Response> {
    const cat = findCategory(slug);
    if (!cat) notFound();
    const isAr = lang === 'ar';

    let all: Array<Record<string, unknown>> = [];
    try {
        all = await getAllFundsRanked();
    } catch (error) {
        console.error('[hub:fund-category] query failed:', (error as Error).message);
    }
    const funds = all.filter((f) => categoryOfFund(f)?.key === cat.key);
    if (funds.length < MIN_FUNDS_TO_PUBLISH) notFound();

    const canonical = categoryPath(cat, lang);
    const title = (isAr ? cat.titleAr : cat.titleEn) + AR_TITLE_SUFFIX;
    const description = isAr ? cat.descriptionAr : cat.descriptionEn;
    const heading = (isAr ? cat.nameAr : cat.nameEn) + (isAr ? ' في مصر' : ' in Egypt');
    const intro = isAr ? cat.introAr : cat.introEn;

    const siblings = FUND_CATEGORIES.filter((c) => c.key !== cat.key)
        .map((c) => `<a href="${escUrl(categoryPath(c, lang))}">${esc(isAr ? c.nameAr : c.nameEn)}</a>`)
        .join('');

    return renderStaticHub({
        file: 'marketplace.html',
        replacements: [
            { find: '<title>Funds Marketplace | Starta Markets</title>', replace: `<title>${esc(title)}</title>` },
            {
                find: '<link rel="canonical" href="https://startamarkets.com/Funds">',
                replace:
                    `<link rel="canonical" href="https://startamarkets.com${encodeURI(canonical)}">` +
                    `<link rel="alternate" hreflang="en" href="https://startamarkets.com${encodeURI(categoryPath(cat, 'en'))}">` +
                    `<link rel="alternate" hreflang="ar" href="https://startamarkets.com${encodeURI(categoryPath(cat, 'ar'))}">` +
                    `<link rel="alternate" hreflang="x-default" href="https://startamarkets.com${encodeURI(categoryPath(cat, 'ar'))}">`,
            },
            {
                find: '<meta property="og:url" content="https://startamarkets.com/Funds">',
                replace: `<meta property="og:url" content="https://startamarkets.com${encodeURI(canonical)}">`,
            },
            {
                find: '<meta property="og:title" content="Funds Marketplace | Starta Markets">',
                replace: `<meta property="og:title" content="${esc(title)}">`,
            },
            ...(isAr
                ? [{ find: '<meta property="og:locale" content="en_US">', replace: '<meta property="og:locale" content="ar_EG">' }]
                : []),
            {
                find: '<meta name="description"\n        content="Explore the full Egypt mutual funds universe with Starta. Filter by manager, performance, risk, and Shariah status with a premium research-grade interface.">',
                replace: `<meta name="description" content="${esc(description)}">`,
            },
            // The hero heading. `data-key` is REMOVED with it, otherwise the
            // page's own i18n pass would overwrite the category name with the
            // generic "Mutual Funds" the moment the client boots — leaving the
            // crawler and the visitor looking at different headings.
            {
                find: 'data-key="marketplace_title"> Mutual Funds ',
                replace: `>${esc(heading)}`,
            },
            {
                find: 'data-key="marketplace_subline"> Accurate, up-to-date data to help you compare funds and make better decisions. ',
                replace: `>${esc(intro)}`,
            },
        ],
        injections: [
            {
                id: 'fundsGrid',
                html:
                    fundsHubRows(funds, lang) +
                    `<nav aria-label="${esc(isAr ? 'فئات أخرى' : 'Other categories')}" style="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:.5rem">${siblings}</nav>`,
            },
        ],
        head:
            langSeedScript(lang) +
            // Seed the marketplace's own type filter so the interactive view a
            // visitor sees matches the category the URL promised.
            `<script>window.__STARTA_FUND_TYPE__=${JSON.stringify(cat.marketplaceType)};</script>` +
            jsonLdScript(fundsHubItemList(funds, lang, canonical, heading)) +
            jsonLdScript(
                breadcrumbJson([
                    { name: isAr ? 'الرئيسية' : 'Home', url: isAr ? '/ar' : '/' },
                    { name: isAr ? 'صناديق الاستثمار' : 'Mutual Funds', url: isAr ? '/ar/Funds' : '/Funds' },
                    { name: isAr ? cat.nameAr : cat.nameEn },
                ])
            ),
        cacheSeconds: 900,
    });
}
