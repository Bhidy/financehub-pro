import { renderStaticHub, esc, escUrl, jsonLdScript, langSeedScript } from '@/lib/static-hub';
import { getAllFundsRanked } from '@/lib/public-data';
import { fundPath, absUrl, SITE_URL } from '@/lib/seo';
import { FUND_CATEGORIES, MIN_FUNDS_TO_PUBLISH, categoryOfFund, categoryPath } from '@/content/fund-categories';
import { buildProviders, providerPath } from '@/content/fund-providers';
import { fundsHubRows, fundsHubItemList, breadcrumbJson, AR_MARKETPLACE_CLOSING } from '@/lib/funds-hub-render';

/**
 * /ar/Funds — THE ARABIC FUNDS HUB, served by the PREMIUM MARKETPLACE DESIGN.
 *
 * HISTORY, so this is never regressed again:
 *   1. /ar/Funds used to 308 to /Funds. Arabic users reached the premium
 *      marketplace, but the site had no Arabic funds URL for search engines.
 *   2. That was "fixed" by adding a plain PublicPageShell page here. It gave
 *      search engines an Arabic URL and gave Arabic USERS a bare table instead
 *      of the designed marketplace — a design regression the owner rejected.
 *   3. This is the correct answer: serve the SAME designed marketplace file,
 *      in Arabic, at the Arabic URL. Users get the premium product, crawlers
 *      get an Arabic document with 214 fund rows in the HTML.
 *
 * NOTHING about the marketplace's design is modified. The shell is byte-
 * identical except for: the localized <title>/description/canonical/og tags,
 * a language seed so it boots Arabic, and server-rendered rows inside the
 * (empty) #fundsGrid that the page's own renderGrid() overwrites on load.
 */
export const dynamic = 'force-dynamic';

const PATH_AR = '/ar/Funds';
const PATH_EN = '/Funds';

const AR_TITLE = 'صناديق الاستثمار في مصر — الأسعار والعوائد والرسوم | Starta Markets';
const AR_DESC =
    'كل صناديق الاستثمار في مصر: صافي قيمة الأصول والعوائد التاريخية ورسوم الإدارة ومدير كل صندوق، مصنّفة حسب الفئة ومحدثة مرتين يومياً من إفصاحات مديري الصناديق.';

export async function GET() {
    let funds: Array<Record<string, unknown>> = [];
    try {
        funds = await getAllFundsRanked();
    } catch (error) {
        console.error('[hub:ar-funds] query failed:', (error as Error).message);
    }

    const counts = new Map<string, number>();
    for (const f of funds) {
        const c = categoryOfFund(f);
        if (c) counts.set(c.key, (counts.get(c.key) ?? 0) + 1);
    }
    const liveCategories = FUND_CATEGORIES.filter((c) => (counts.get(c.key) ?? 0) >= MIN_FUNDS_TO_PUBLISH);

    // Category links are the crawl path into the six category pages. Rendered
    // inside #fundsGrid, which the marketplace clears on load — so this is a
    // crawler-facing pre-render of content the user reaches through the
    // marketplace's own type filter.
    const categoryNav = liveCategories.length
        ? `<nav aria-label="فئات الصناديق" style="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem" dir="rtl">` +
          liveCategories
              .map(
                  (c) =>
                      `<a href="${escUrl(categoryPath(c, 'ar'))}">${esc(c.nameAr)} (${esc(String(counts.get(c.key)))})</a>`
              )
              .join('') +
          `</nav>`
        : '';

    // Provider links: the crawl path into the bank and asset-manager hubs, and
    // the internal signal that ties "صناديق بنك مصر" to this hub.
    const providers = buildProviders(funds);
    const providerNav = providers.length
        ? `<nav aria-label="صناديق البنوك ومديري الأصول" dir="rtl" style="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0">` +
          providers
              .slice(0, 24)
              .map((p) => `<a href="${escUrl(providerPath(p, 'ar'))}">${esc(p.nameAr)} (${esc(String(p.fundCount))})</a>`)
              .join('') +
          `</nav>`
        : '';

    return renderStaticHub({
        file: 'marketplace.html',
        lang: 'ar',
        replacements: [
            { find: '<title>Funds Marketplace | Starta Markets</title>', replace: `<title>${esc(AR_TITLE)}</title>` },
            {
                find: '<link rel="canonical" href="https://startamarkets.com/Funds">',
                replace: `<link rel="canonical" href="https://startamarkets.com${PATH_AR}">`,
            },
            {
                find: '<meta property="og:url" content="https://startamarkets.com/Funds">',
                replace: `<meta property="og:url" content="https://startamarkets.com${PATH_AR}">`,
            },
            {
                find: '<meta property="og:title" content="Funds Marketplace | Starta Markets">',
                replace: `<meta property="og:title" content="${esc(AR_TITLE)}">`,
            },
            { find: '<meta property="og:locale" content="en_US">', replace: '<meta property="og:locale" content="ar_EG">' },
            {
                find: '<meta name="description"\n        content="Explore the full Egypt mutual funds universe with Starta. Filter by manager, performance, risk, and Shariah status with a premium research-grade interface.">',
                replace: `<meta name="description" content="${esc(AR_DESC)}">`,
            },
        ],
        // The hero H1/subline are the ONE thing the head-tag replacements above
        // never touched: this page served `<h1>Mutual Funds</h1>` inside an
        // `<html lang="ar">` document. A JS-executing crawler recovered the
        // Arabic via the page's own i18n pass, but the answer-engine crawlers we
        // explicitly invite in robots.txt (OAI-SearchBot, PerplexityBot, CCBot)
        // largely do not run JS — so the site's most valuable Arabic commercial
        // URL presented an English heading to exactly the systems §27/§31 target.
        //
        // The strings are the shell's OWN Arabic dictionary values, so the
        // rendered result is identical to what the visitor already sees, and
        // `keepKey` leaves the language toggle working in both directions.
        // Verified live 2026-09-04: production was still serving the shell's
        // English default here while this exact call renders Arabic locally,
        // so the route's build output was stale. Touching the file forces a
        // rebuild; scripts/test-ar-hub-hero.ts now asserts the rendered H1.
        heroText: [
            { dataKey: 'marketplace_title', text: 'الصناديق الاستثمارية', keepKey: true },
            {
                dataKey: 'marketplace_subline',
                text: 'بيانات دقيقة ومحدثة تساعدك على مقارنة الصناديق واتخاذ قرارات أفضل.',
                keepKey: true,
            },
            ...AR_MARKETPLACE_CLOSING,
        ],
        injections: [{ id: 'fundsGrid', html: categoryNav + providerNav + fundsHubRows(funds, 'ar') }],
        head:
            langSeedScript('ar') +
            (funds.length ? jsonLdScript(fundsHubItemList(funds, 'ar', PATH_AR)) : '') +
            jsonLdScript(breadcrumbJson([{ name: 'الرئيسية', url: '/ar' }, { name: 'صناديق الاستثمار' }])),
        cacheSeconds: 900,
    });
}

// Re-exported for the sitemap's benefit: this hub and its English twin are a
// reciprocal pair, and marketplace.html already carries the hreflang triple.
export const HUB_PAIR = { en: absUrl(PATH_EN), ar: absUrl(PATH_AR), site: SITE_URL, fundPath };
