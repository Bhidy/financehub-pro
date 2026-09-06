import { renderStaticHub, esc, escUrl, jsonLdScript, langSeedScript } from '@/lib/static-hub';
import { getAllFundsRanked } from '@/lib/public-data';
import { FUND_CATEGORIES, MIN_FUNDS_TO_PUBLISH, categoryOfFund, categoryPath } from '@/content/fund-categories';
import { buildProviders, providerPath } from '@/content/fund-providers';
import { fundsHubRows, fundsHubItemList, fundsCountInjection, breadcrumbJson } from '@/lib/funds-hub-render';

/**
 * /Funds — the designed funds marketplace, unchanged, with its fund list
 * additionally rendered server-side.
 *
 * Before: 179 words, ZERO structured data, FOUR internal links and not one
 * fund name in the HTML. This is the head-term page for Egyptian mutual funds
 * and it gave a crawler nothing to rank.
 *
 * The premium marketplace is untouched — its own renderGrid() does
 * `grid.innerHTML = …` on load, so a visitor sees exactly what they saw
 * before. Only the pre-render inside the empty grid is new.
 */
export const dynamic = 'force-dynamic';

// The shell's own <title> is the product name — "Funds Marketplace" — which
// matches no query anyone types for this URL. The head term for the English
// hub is the category itself, exactly as the Arabic twin already carries it.
// Head-tag replacements only: the designed file's bytes are untouched.
const EN_TITLE = 'Mutual Funds in Egypt — NAVs, Returns & Fees | Starta Markets';
const EN_DESC =
    'Egyptian mutual funds that publish a NAV: latest NAV, trailing returns, management fee and manager, by category and by bank. Updated twice daily from disclosures.';

export async function GET() {
    let funds: Array<Record<string, unknown>> = [];
    try {
        funds = await getAllFundsRanked();
    } catch (error) {
        console.error('[hub:funds] query failed:', (error as Error).message);
    }

    const counts = new Map<string, number>();
    for (const f of funds) {
        const c = categoryOfFund(f);
        if (c) counts.set(c.key, (counts.get(c.key) ?? 0) + 1);
    }
    const liveCategories = FUND_CATEGORIES.filter((c) => (counts.get(c.key) ?? 0) >= MIN_FUNDS_TO_PUBLISH);

    const categoryNav = liveCategories.length
        ? `<nav aria-label="Fund categories" style="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem">` +
          liveCategories
              .map((c) => `<a href="${escUrl(categoryPath(c, 'en'))}">${esc(c.nameEn)} (${esc(String(counts.get(c.key)))})</a>`)
              .join('') +
          `</nav>`
        : '';

    // Provider links: the crawl path into the bank and asset-manager hubs, and
    // the internal signal that ties "Banque Misr funds" to this hub.
    const providers = buildProviders(funds);
    const providerNav = providers.length
        ? `<nav aria-label="Funds by bank and asset manager" style="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0">` +
          providers
              .slice(0, 24)
              .map((p) => `<a href="${escUrl(providerPath(p, 'en'))}">${esc(p.nameEn)} (${esc(String(p.fundCount))})</a>`)
              .join('') +
          `</nav>`
        : '';

    return renderStaticHub({
        file: 'marketplace.html',
        lang: 'en',
        replacements: [
            { find: '<title>Funds Marketplace | Starta Markets</title>', replace: `<title>${esc(EN_TITLE)}</title>` },
            {
                find: '<meta property="og:title" content="Funds Marketplace | Starta Markets">',
                replace: `<meta property="og:title" content="${esc(EN_TITLE)}">`,
            },
            {
                find: '<meta name="description"\n        content="Explore the full Egypt mutual funds universe with Starta. Filter by manager, performance, risk, and Shariah status with a premium research-grade interface.">',
                replace: `<meta name="description" content="${esc(EN_DESC)}">`,
            },
        ],
        injections: [
            { id: 'fundsGrid', html: categoryNav + providerNav + fundsHubRows(funds, 'en') },
            // The counter beside the grid must equal the rows in the grid.
            fundsCountInjection(funds),
        ],
        // hreflang already ships inside marketplace.html (injected by
        // scripts/inject-seo-heads.mjs) — re-adding it here would duplicate it.
        head:
            // R3 (lib/lang.ts): a URL whose language is fixed must WRITE that
            // language down. Only the /ar twins used to seed, which made storage a
            // one-way ratchet toward Arabic: a reader who chose English was flipped
            // back by any /ar URL they opened, and the next single-URL page they
            // visited rendered in the wrong language.
            langSeedScript('en') +
            (funds.length ? jsonLdScript(fundsHubItemList(funds, 'en', '/Funds')) : '') +
            jsonLdScript(breadcrumbJson([{ name: 'Home', url: '/' }, { name: 'Mutual Funds' }])),
        cacheSeconds: 900,
    });
}
