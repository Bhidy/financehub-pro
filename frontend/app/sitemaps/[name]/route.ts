import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';
import { getMarketLists, getSeasonalitySymbols, getAllFundsRanked, getFundRiskTable, getAllTickers, getStatsMap } from '@/lib/public-data';
import { pairIsPublishable } from '@/content/stock-vs';
import { riskEligible, MIN_RISK_ROWS } from '@/lib/fund-stats';
import { rankFundPairs } from '@/lib/fund-pairs';
import { SITE_URL, absUrl, fundPath, symbolPath, symbolPathAr, slugify, learnPath, glossaryPath, sectorPath } from '@/lib/seo';
import { canonicalNewsPath, primaryNewsRows } from '@/lib/news-display';
import { sectorAr } from '@/content/sector-names-ar';
import learnTopics from '@/content/learn-topics.generated';
import { GLOSSARY_TERMS } from '@/content/glossary-terms';
import { FUND_CATEGORIES, MIN_FUNDS_TO_PUBLISH, categoryOfFund, categoryPath } from '@/content/fund-categories';
import { buildProviders, providerPath } from '@/content/fund-providers';
import { fundIsDormant } from '@/lib/fund-stats';
import { MARKET_SCREENS, screenPath } from '@/content/market-screens';
import { NEWS_TOPICS, newsTopicPath } from '@/content/news-topics';
import { livePublishedTopics } from '@/app/News/renderNewsHubs';
import { EGX_ONLY } from '@/lib/public-data';
import { publishableEgxSectors } from '@/app/sectors/egx/renderEgxSector';

export const dynamic = 'force-dynamic';

/**
 * Segmented child sitemaps: /sitemaps/{core|companies|funds|learn|news}.xml
 * Every <loc> is the canonical form (apex host, canonical casing, slugged
 * detail URLs) — the same builders the pages themselves use (lib/seo.ts).
 */

type Entry = { loc: string; lastmod?: string | null; changefreq?: string; priority?: string };

function render(entries: Entry[]): string {
    const body = entries
        .map((e) => {
            const parts = [`    <loc>${e.loc}</loc>`];
            if (e.lastmod) parts.push(`    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>`);
            if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
            if (e.priority) parts.push(`    <priority>${e.priority}</priority>`);
            return `  <url>\n${parts.join('\n')}\n  </url>`;
        })
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

async function coreEntries(): Promise<Entry[]> {
    const hubs: Array<[string, string, string]> = [
        ['/', 'hourly', '1.0'],
        ['/News', 'hourly', '0.9'],
        ['/ar/News', 'hourly', '0.9'], // the Arabic news hub (previously a 404)
        ['/Funds', 'daily', '0.9'],
        ['/ar/Funds', 'daily', '0.9'], // the Arabic funds hub (was a 308 to /Funds)
        // The price-intent page — the highest-intent fund query in this market
        // ("أسعار وثائق صناديق الاستثمار اليوم") had no destination at all.
        ['/Funds/prices-today', 'daily', '0.9'],
        ['/ar/Funds/prices-today', 'daily', '0.9'],
        ['/Funds/fees', 'weekly', '0.8'],
        ['/ar/Funds/fees', 'weekly', '0.8'],
        ['/Funds/Compare', 'daily', '0.6'],
        ['/ar/Funds/Compare', 'daily', '0.6'], // Arabic twin (previously had no URL at all)
        // The three league tables above the category/provider clusters — the
        // datasets no competitor publishes (provider stats, category medians,
        // per-fund risk). /Funds/risk is added below, gated on its own rows.
        ['/Funds/providers', 'daily', '0.7'],
        ['/ar/Funds/providers', 'daily', '0.7'],
        ['/Funds/categories', 'daily', '0.7'],
        ['/ar/Funds/categories', 'daily', '0.7'],
        ['/methodology', 'monthly', '0.5'],
        ['/ar/methodology', 'monthly', '0.5'],
        ['/Market-Pulse', 'hourly', '0.9'],
        ['/ar/Market-Pulse', 'daily', '0.7'], // Arabic twin (previously a hard 404)
        ['/Learn', 'weekly', '0.8'],
        ['/ar/Learn', 'weekly', '0.8'], // the Arabic Learn hub (was a 308 to /Learn)
        ['/companies', 'daily', '0.9'],
        ['/sectors', 'daily', '0.7'],
        ['/markets/movers', 'hourly', '0.7'],
        // Market screens are added below, gated on actually having rows.
        ['/markets/dividend-calendar', 'daily', '0.7'],
        ['/markets/egx30', 'hourly', '0.8'],
        ['/markets/top-dividend-yield', 'daily', '0.7'],
        ['/ar/markets/top-dividend-yield', 'daily', '0.6'],
        ['/markets/largest-companies', 'daily', '0.7'],
        ['/ar/markets/largest-companies', 'daily', '0.6'],
        ['/markets/lowest-pe-stocks', 'daily', '0.7'],
        ['/ar/markets/lowest-pe-stocks', 'daily', '0.6'],
        ['/ar/markets/egx30', 'hourly', '0.7'],
        // Arabic hub cluster (audit #1 gap — the AR lane)
        ['/ar', 'hourly', '0.9'],
        ['/ar/companies', 'daily', '0.8'],
        ['/ar/sectors', 'daily', '0.6'],
        ['/ar/markets/movers', 'hourly', '0.6'],
        ['/ar/markets/dividend-calendar', 'daily', '0.5'],
        ['/Funds/best-mutual-funds-egypt-2026', 'daily', '0.8'],
        ['/ar/Funds/best-mutual-funds-egypt-2026', 'daily', '0.7'],
        ['/about', 'monthly', '0.5'],
        ['/ar/about', 'monthly', '0.6'], // Arabic twin (previously 404)
        ['/editorial-policy', 'monthly', '0.4'],
        ['/ar/editorial-policy', 'monthly', '0.3'],
        ['/corrections', 'monthly', '0.3'],
        ['/ar/corrections', 'monthly', '0.3'],
        ['/contact', 'monthly', '0.4'],
        ['/ar/contact', 'monthly', '0.5'], // Arabic twin (previously 404)
        ['/Calculators', 'weekly', '0.6'],
        ['/ar/Calculators', 'weekly', '0.6'],
        ['/RiskAssessment', 'weekly', '0.6'],
        ['/ar/RiskAssessment', 'weekly', '0.6'],
        ['/privacy', 'yearly', '0.2'],
        ['/terms', 'yearly', '0.2'],
    ];
    // NEWS TOPICS — advertised only where the topic currently clears its own
    // article threshold, using the same classifier the pages use.
    try {
        const live = await livePublishedTopics();
        for (const slug of live) {
            const topic = NEWS_TOPICS.find((t) => t.slug === slug);
            if (!topic) continue;
            hubs.push([newsTopicPath(topic, 'en'), 'daily', '0.7']);
            hubs.push([newsTopicPath(topic, 'ar'), 'daily', '0.7']);
        }
    } catch (error) {
        console.error('[sitemap:core] news topics unavailable:', (error as Error).message);
    }

    // RISK LEAGUE TABLE — advertised only when enough funds clear the SAME
    // eligibility rule the page applies (lib/fund-stats riskEligible), so the
    // sitemap and the page's notFound gate provably agree.
    try {
        const risk = await getFundRiskTable();
        if (risk.filter(riskEligible).length >= MIN_RISK_ROWS) {
            hubs.push(['/Funds/risk', 'daily', '0.7']);
            hubs.push(['/ar/Funds/risk', 'daily', '0.7']);
        }
    } catch (error) {
        console.error('[sitemap:core] fund risk table unavailable:', (error as Error).message);
    }

    // MARKET SCREENS — advertised only when the screen currently has enough
    // rows to render. `oversold-stocks` legitimately empties when no EGX stock
    // is below RSI 30, and a sitemap that keeps listing it while the page 404s
    // is the sitemap/page disagreement this codebase keeps having to fix.
    // getMarketLists is cached (300s), so this costs one shared query.
    try {
        const lists = await getMarketLists(30);
        for (const sc of MARKET_SCREENS) {
            if ((lists[sc.key]?.length ?? 0) < sc.minRows) continue;
            hubs.push([screenPath(sc, 'en'), 'hourly', '0.7']);
            hubs.push([screenPath(sc, 'ar'), 'hourly', '0.7']);
        }
    } catch (error) {
        // A failed screener read must not empty the whole core segment.
        console.error('[sitemap:core] market screens unavailable:', (error as Error).message);
    }

    return hubs.map(([path, changefreq, priority]) => ({ loc: SITE_URL + path, changefreq, priority }));
}

async function companyEntries(): Promise<Entry[]> {
    // Sub-tab URLs are DATA-GATED: each sub-tab page notFound()s when its
    // dataset is empty, so the sitemap must only advertise URLs that resolve
    // (the post-deploy audit caught exactly this class of dead-URL defect
    // in the funds segment).
    // Single-pass CTEs instead of correlated EXISTS: the per-row subquery
    // version cost 71.8s at the origin (audit finding) because UPPER(symbol)
    // defeats the indexes — one DISTINCT scan per table is ~constant.
    const result = await db.query(
        `WITH fin AS (SELECT DISTINCT UPPER(symbol) AS s FROM egx_financials),
              div1 AS (SELECT DISTINCT UPPER(symbol) AS s FROM dividend_history),
              div2 AS (SELECT DISTINCT UPPER(symbol) AS s FROM egx_dividends
                       WHERE div_yield > 0 OR amount_recent IS NOT NULL OR amount_upcoming IS NOT NULL),
              tech AS (SELECT DISTINCT UPPER(symbol) AS s FROM egx_technicals),
              hist AS (SELECT DISTINCT UPPER(symbol) AS s FROM ohlc_data)
         SELECT t.symbol,
                GREATEST(
                    COALESCE(t.last_updated, 'epoch'::timestamptz),
                    COALESCE(t.updated_at, 'epoch'::timestamptz)
                ) AS lastmod,
                (t.symbol IN (SELECT s FROM fin)) AS has_fin,
                (t.symbol IN (SELECT s FROM div1) OR t.symbol IN (SELECT s FROM div2)) AS has_div,
                (t.symbol IN (SELECT s FROM tech)) AS has_tech,
                (t.symbol IN (SELECT s FROM hist)) AS has_hist
         FROM market_tickers t
         WHERE t.last_price IS NOT NULL
           AND t.${EGX_ONLY}
           AND COALESCE(t.sector_name,'') <> 'Index' -- EGX30 index row is not a company page
           AND NOT (t.symbol LIKE '%.CA' AND EXISTS (
               SELECT 1 FROM market_tickers b
               WHERE b.symbol = REPLACE(t.symbol, '.CA', '') AND b.last_price IS NOT NULL))
         ORDER BY t.symbol`
    );
    // Seasonality is gated on the SAME set the pages and the tab strip use,
    // so a URL here can never render "not enough history".
    const seasonal = await getSeasonalitySymbols();
    return result.rows.flatMap((r: any) => {
        const base = symbolPath(r.symbol);
        const entries: Entry[] = [
            { loc: absUrl(base), lastmod: r.lastmod, changefreq: 'daily', priority: '0.8' },
        ];
        if (r.has_fin) entries.push({ loc: absUrl(`${base}/financials`), lastmod: r.lastmod, changefreq: 'weekly', priority: '0.6' });
        if (r.has_div) entries.push({ loc: absUrl(`${base}/dividends`), lastmod: r.lastmod, changefreq: 'weekly', priority: '0.6' });
        if (r.has_tech) entries.push({ loc: absUrl(`${base}/technicals`), lastmod: r.lastmod, changefreq: 'daily', priority: '0.5' });
        if (r.has_hist) entries.push({ loc: absUrl(`${base}/history`), lastmod: r.lastmod, changefreq: 'daily', priority: '0.5' });
        // Statistics needs enough REPORTED figures to clear the page's own
        // gate; the fiscal-year block is the bulk of it, so the financials
        // signal is the closest available proxy and is a strict subset of it.
        if (seasonal.has(String(r.symbol).toUpperCase())) entries.push({ loc: absUrl(`${base}/seasonality`), lastmod: r.lastmod, changefreq: 'monthly', priority: '0.5' });
        if (r.has_fin) entries.push({ loc: absUrl(`${base}/statistics`), lastmod: r.lastmod, changefreq: 'weekly', priority: '0.6' });
        return entries;
    });
}

async function sectorEntries(): Promise<Entry[]> {
    const result = await db.query(
        `SELECT sector_name
         FROM market_tickers
         WHERE last_price IS NOT NULL AND ${EGX_ONLY} AND sector_name IS NOT NULL AND sector_name <> ''
           AND sector_name <> 'Index'
         GROUP BY sector_name
         ORDER BY sector_name`
    );
    const vendor: Entry[] = result.rows.flatMap((r: any) => [
        { loc: absUrl(sectorPath(r.sector_name, null, 'en')), changefreq: 'daily', priority: '0.7' },
        { loc: absUrl(sectorPath(r.sector_name, sectorAr(r.sector_name), 'ar')), changefreq: 'daily', priority: '0.6' },
    ]);
    // Official EGX sector hubs — the exchange's own 18-sector classification
    // through the security master; same MIN_COMPANIES gate as the pages.
    let official: Entry[] = [];
    try {
        official = (await publishableEgxSectors()).flatMap((x) => [
            { loc: absUrl(x.en), changefreq: 'daily', priority: '0.7' },
            { loc: absUrl(encodeURI(x.ar)), changefreq: 'daily', priority: '0.7' },
        ]);
    } catch (error) {
        console.error('[sitemap:sectors] official sectors unavailable:', (error as Error).message);
    }
    return vendor.concat(official);
}

async function arCompanyEntries(): Promise<Entry[]> {
    // Arabic twins of the company pages (/ar/symbol/{SYM}).
    const result = await db.query(
        `WITH tech AS (SELECT DISTINCT UPPER(symbol) AS s FROM egx_technicals),
              fin  AS (SELECT DISTINCT UPPER(symbol) AS s FROM egx_financials),
              div1 AS (SELECT DISTINCT UPPER(symbol) AS s FROM dividend_history),
              div2 AS (SELECT DISTINCT UPPER(symbol) AS s FROM egx_dividends
                       WHERE div_yield > 0 OR amount_recent IS NOT NULL OR amount_upcoming IS NOT NULL),
              hist AS (SELECT DISTINCT UPPER(symbol) AS s FROM ohlc_data)
         SELECT t.symbol, t.name_ar,
                (t.symbol IN (SELECT s FROM tech)) AS has_tech,
                (t.symbol IN (SELECT s FROM fin)) AS has_fin,
                (t.symbol IN (SELECT s FROM div1) OR t.symbol IN (SELECT s FROM div2)) AS has_div,
                (t.symbol IN (SELECT s FROM hist)) AS has_hist,
                GREATEST(
                    COALESCE(t.last_updated, 'epoch'::timestamptz),
                    COALESCE(t.updated_at, 'epoch'::timestamptz)
                ) AS lastmod
         FROM market_tickers t
         WHERE t.last_price IS NOT NULL
           AND t.${EGX_ONLY}
           AND COALESCE(t.sector_name,'') <> 'Index'
           AND NOT (t.symbol LIKE '%.CA' AND EXISTS (
               SELECT 1 FROM market_tickers b
               WHERE b.symbol = REPLACE(t.symbol, '.CA', '') AND b.last_price IS NOT NULL))
         ORDER BY t.symbol`
    );
    // Arabic canonical carries the Arabic company slug where one exists —
    // built by the SAME helper the page canonicalises with, so the sitemap can
    // never advertise a URL that redirects.
    // Arabic company URLs + their sub-pages. DATA-GATED exactly like the
    // English segment: a sub-tab is advertised only where the page will
    // actually render, so the sitemap and the 404 gate provably agree.
    // Seasonality is gated on the SAME set the pages and the tab strip use,
    // so a URL here can never render "not enough history".
    const seasonal = await getSeasonalitySymbols();
    return result.rows.flatMap((r: any) => {
        const base = symbolPathAr(r.symbol, r.name_ar);
        const entries: Entry[] = [
            { loc: absUrl(base), lastmod: r.lastmod, changefreq: 'daily', priority: '0.7' },
        ];
        if (r.has_fin) entries.push({ loc: absUrl(`${base}/financials`), lastmod: r.lastmod, changefreq: 'weekly', priority: '0.6' });
        if (r.has_div) entries.push({ loc: absUrl(`${base}/dividends`), lastmod: r.lastmod, changefreq: 'weekly', priority: '0.6' });
        if (r.has_tech) entries.push({ loc: absUrl(`${base}/technicals`), lastmod: r.lastmod, changefreq: 'daily', priority: '0.5' });
        if (r.has_hist) entries.push({ loc: absUrl(`${base}/history`), lastmod: r.lastmod, changefreq: 'daily', priority: '0.5' });
        // Statistics needs enough REPORTED figures to clear the page's own
        // gate; the fiscal-year block is the bulk of it, so the financials
        // signal is the closest available proxy and is a strict subset of it.
        if (seasonal.has(String(r.symbol).toUpperCase())) entries.push({ loc: absUrl(`${base}/seasonality`), lastmod: r.lastmod, changefreq: 'monthly', priority: '0.5' });
        if (r.has_fin) entries.push({ loc: absUrl(`${base}/statistics`), lastmod: r.lastmod, changefreq: 'weekly', priority: '0.6' });
        return entries;
    });
}

async function metricEntries(): Promise<Entry[]> {
    // Per-metric pages, DATA-GATED to mirror the page-level notFound() gates
    // (under-listing is safe; over-listing recreates the dead-URL defect the
    // audits keep hunting). revenue/net-income/eps approximate via statement
    // history EXISTS — a strict subset of the page gate.
    const result = await db.query(
        `SELECT t.symbol,
                (t.market_cap IS NOT NULL) AS m_marketcap,
                (t.pe_ratio IS NOT NULL) AS m_pe,
                (COALESCE(t.dividend_yield, 0) > 0
                 OR EXISTS(SELECT 1 FROM egx_financials f WHERE UPPER(f.symbol) = t.symbol AND f.dps IS NOT NULL)) AS m_dy,
                EXISTS(SELECT 1 FROM egx_financials f WHERE UPPER(f.symbol) = t.symbol AND f.revenue IS NOT NULL) AS m_rev,
                EXISTS(SELECT 1 FROM egx_financials f WHERE UPPER(f.symbol) = t.symbol AND f.net_income IS NOT NULL) AS m_ni,
                EXISTS(SELECT 1 FROM egx_financials f WHERE UPPER(f.symbol) = t.symbol AND f.eps_diluted IS NOT NULL) AS m_eps
         FROM market_tickers t
         WHERE t.last_price IS NOT NULL
           AND t.${EGX_ONLY}
           AND COALESCE(t.sector_name,'') <> 'Index'
           AND NOT (t.symbol LIKE '%.CA' AND EXISTS (
               SELECT 1 FROM market_tickers b
               WHERE b.symbol = REPLACE(t.symbol, '.CA', '') AND b.last_price IS NOT NULL))
         ORDER BY t.symbol`
    );
    return result.rows.flatMap((r: any) => {
        const base = symbolPath(r.symbol);
        const entries: Entry[] = [];
        if (r.m_marketcap) entries.push({ loc: absUrl(`${base}/market-cap`), changefreq: 'daily', priority: '0.5' });
        if (r.m_pe) entries.push({ loc: absUrl(`${base}/pe-ratio`), changefreq: 'daily', priority: '0.5' });
        if (r.m_dy) entries.push({ loc: absUrl(`${base}/dividend-yield`), changefreq: 'weekly', priority: '0.5' });
        if (r.m_rev) entries.push({ loc: absUrl(`${base}/revenue`), changefreq: 'weekly', priority: '0.5' });
        if (r.m_ni) entries.push({ loc: absUrl(`${base}/net-income`), changefreq: 'weekly', priority: '0.5' });
        if (r.m_eps) entries.push({ loc: absUrl(`${base}/eps`), changefreq: 'weekly', priority: '0.5' });
        return entries;
    });
}

async function glossaryEntries(): Promise<Entry[]> {
    const entries: Entry[] = [
        { loc: absUrl('/Learn/glossary'), changefreq: 'monthly', priority: '0.7' },
        { loc: absUrl('/ar/Learn/glossary'), changefreq: 'monthly', priority: '0.7' },
    ];
    for (const t of GLOSSARY_TERMS) {
        entries.push({ loc: absUrl(glossaryPath(t.slug, t.ar.term, 'en')), changefreq: 'yearly', priority: '0.5' });
        entries.push({ loc: absUrl(glossaryPath(t.slug, t.ar.term, 'ar')), changefreq: 'yearly', priority: '0.5' });
    }
    return entries;
}

async function comparisonEntries(): Promise<Entry[]> {
    // Pairs come from lib/fund-pairs.ts, the SAME function the comparison hub
    // links from. This used to run its own funds_view query here, which is how
    // a sitemap starts advertising URLs a page cannot produce — the exact
    // failure that shipped 404ing provider hubs.
    let funds: Array<Record<string, unknown>> = [];
    try {
        funds = await getAllFundsRanked();
    } catch (error) {
        console.error('[sitemap:comparisons] query failed:', (error as Error).message);
        return [];
    }
    const entries: Entry[] = [];
    for (const pair of rankFundPairs(funds)) {
        entries.push({ loc: absUrl(`/Funds/vs/${pair.slug}`), changefreq: 'weekly', priority: '0.4' });
        entries.push({ loc: absUrl(`/ar/Funds/vs/${pair.slug}`), changefreq: 'weekly', priority: '0.4' });
    }
    return entries;
}

async function fundCategoryEntries(): Promise<Entry[]> {
    // DATA-GATED to mirror the page gate: renderFundCategory() 404s a category
    // with fewer than MIN_FUNDS_TO_PUBLISH funds, so the sitemap must apply
    // the same threshold or it advertises dead URLs.
    const result = await db.query(
        `SELECT fund_id, fund_type, fund_type_en, classification_en, is_shariah, last_nav_date
         FROM funds_view
         WHERE fund_id::text ~ '^[0-9]+$'`
    );
    const counts = new Map<string, number>();
    const lastmods = new Map<string, number>();
    for (const r of result.rows as Array<Record<string, unknown>>) {
        const c = categoryOfFund(r);
        if (!c) continue;
        counts.set(c.key, (counts.get(c.key) ?? 0) + 1);
        const t = r.last_nav_date ? Date.parse(String(r.last_nav_date)) : NaN;
        if (Number.isFinite(t) && t > (lastmods.get(c.key) ?? 0)) lastmods.set(c.key, t);
    }
    const entries: Entry[] = [];
    for (const c of FUND_CATEGORIES) {
        if ((counts.get(c.key) ?? 0) < MIN_FUNDS_TO_PUBLISH) continue;
        const lm = lastmods.get(c.key);
        const lastmod = lm ? new Date(lm).toISOString() : null;
        entries.push({ loc: absUrl(categoryPath(c, 'en')), lastmod, changefreq: 'daily', priority: '0.8' });
        entries.push({ loc: absUrl(categoryPath(c, 'ar')), lastmod, changefreq: 'daily', priority: '0.8' });
    }
    return entries;
}

async function fundProviderEntries(): Promise<Entry[]> {
    // Providers are derived from the fund rows, so this segment self-updates:
    // a newly listed bank is advertised as soon as its funds appear, and one
    // that falls below the publish threshold stops being advertised. The SAME
    // buildProviders() the pages use, so the sitemap and the 404 gate agree.
    const result = await db.query(
        `SELECT owner_name, owner_name_en, manager_name, manager_name_en, last_nav_date
         FROM funds_view
         WHERE fund_id::text ~ '^[0-9]+$'`
    );
    const rows = result.rows as Array<Record<string, unknown>>;
    const lastmod = rows.reduce<number | null>((mx, r) => {
        const t = r.last_nav_date ? Date.parse(String(r.last_nav_date)) : NaN;
        return Number.isFinite(t) && (mx === null || t > mx) ? t : mx;
    }, null);
    const iso = lastmod ? new Date(lastmod).toISOString() : null;
    // Same universe as the pages: getAllFundsRanked() drops dormant funds
    // (no NAV for 180 days), so a provider whose only funds are dormant must
    // not be advertised — /ar/Funds/provider/ميد-بنك was sitemapped and 404'd.
    const current = rows.filter((r) => !fundIsDormant(r.last_nav_date as string | Date | null));
    return buildProviders(current).flatMap((p) => [
        { loc: absUrl(providerPath(p, 'en')), lastmod: iso, changefreq: 'daily', priority: '0.8' },
        { loc: absUrl(providerPath(p, 'ar')), lastmod: iso, changefreq: 'daily', priority: '0.8' },
    ]);
}

async function fundEntries(): Promise<Entry[]> {
    // Numeric fund_ids only: the /Funds/[id] route resolves numeric ids, but
    // funds_view also carries legacy string ids (EGY_NEW_*, EGYAAIB*, ...)
    // whose URLs 404 — the post-deploy audit caught 152 dead URLs here.
    const result = await db.query(
        `SELECT fund_id, fund_name, fund_name_en, last_nav_date, nav_points
         FROM funds_view
         WHERE fund_id::text ~ '^[0-9]+$'
         ORDER BY fund_id`
    );
    // EN + AR pairs (reciprocal hreflang lives in the pages' metadata). The AR
    // canonical carries the Arabic slug — absUrl percent-encodes it for <loc>.
    return result.rows.flatMap((r: any) => {
        const en = fundPath(r.fund_id, r.fund_name_en, r.fund_name, 'en');
        const ar = fundPath(r.fund_id, r.fund_name_en, r.fund_name, 'ar');
        const entries: Entry[] = [
            { loc: absUrl(en), lastmod: r.last_nav_date, changefreq: 'daily', priority: '0.7' },
            { loc: absUrl(ar), lastmod: r.last_nav_date, changefreq: 'daily', priority: '0.7' },
        ];
        // NAV history is gated at 24 published points by the page; nav_points
        // is the same count, so the sitemap and the 404 gate agree exactly.
        if (Number(r.nav_points) >= 24) {
            entries.push({ loc: absUrl(`${en}/nav-history`), lastmod: r.last_nav_date, changefreq: 'weekly', priority: '0.6' });
            entries.push({ loc: absUrl(`${ar}/nav-history`), lastmod: r.last_nav_date, changefreq: 'weekly', priority: '0.6' });
        }
        return entries;
    });
}

async function learnEntries(): Promise<Entry[]> {
    // EN + AR pairs (reciprocal hreflang lives in the pages' metadata). The AR
    // canonical carries the Arabic-title slug.
    return (learnTopics as Array<{ slug: string; ar: { title: string } }>).flatMap((t) => [
        { loc: absUrl(learnPath(t.slug, t.ar.title, 'en')), changefreq: 'monthly', priority: '0.7' },
        { loc: absUrl(learnPath(t.slug, t.ar.title, 'ar')), changefreq: 'monthly', priority: '0.7' },
    ]);
}

async function newsEntries(): Promise<Entry[]> {
    // Indexable window only (NEWS_INDEX_DAYS in renderNewsArticle): older wire
    // copy serves noindex,follow and must not be advertised as indexable.
    // The query reads the full archive so duplicate detection sees the first copy.
    const result = await db.query(
        `SELECT id, headline, published_at, source_section, symbol,
                left(article_body, 400) AS body_head
         FROM market_news
         ORDER BY published_at DESC
         LIMIT 45000`
    );
    // Dedupe against the WHOLE archive, then keep the indexable window: a
    // story re-ingested inside the window whose first copy is older than the
    // window is not primary — the page 308s to the old copy — and must not be
    // advertised (audit URL_REDIRECTS on /News/175651…, 2026-09-05).
    const cutoff = Date.now() - 120 * 86_400_000;
    // primaryNewsRows: no off-market (Saudi) stories, and ONE URL per story —
    // the archive had 185 second copies of re-ingested headlines, each a
    // "Duplicate, Google chose different canonical" row in Search Console.
    return primaryNewsRows(result.rows as Array<{ id: number; headline: string; symbol: string | null; body_head: string | null; published_at: string; source_section: string | null }>)
        .filter((r) => Date.parse(String(r.published_at)) >= cutoff)
        .map((r: any) => ({
        // canonicalNewsPath, NOT newsPath(raw): the article page strips
        // dateline prefixes before slugifying, so the raw headline produces a
        // URL that 308s — ~510 sitemap entries were advertising redirects.
        loc: absUrl(canonicalNewsPath(r.id, r.headline, r.source_section)),
        lastmod: r.published_at,
        changefreq: 'never',
        priority: '0.5',
    }));
}


/**
 * Stock-vs-stock comparison pages, gated to match renderStockVs()'s own rules:
 * SAME sector, a real market cap, never the index row. Top 8 by market cap per
 * sector gives C(8,2) = 28 pairs for a large sector — the same shape as the
 * fund comparisons above, and for the same reason: 318 symbols is 50,403
 * unordered pairs, and advertising all of them would be a crawl trap made of
 * comparisons nobody is making. URLs are canonical-ordered (alphabetical) so
 * the sitemap can never advertise a URL that 308s.
 */
async function stockComparisonEntries(): Promise<Entry[]> {
    const result = await db.query(
        `SELECT symbol, sector_name, market_cap
         FROM market_tickers
         WHERE last_price IS NOT NULL
           AND ${EGX_ONLY}
           AND market_cap IS NOT NULL AND market_cap > 0
           AND sector_name IS NOT NULL AND sector_name <> '' AND sector_name <> 'Index'
           AND NOT (symbol LIKE '%.CA' AND EXISTS (
               SELECT 1 FROM market_tickers b
               WHERE b.symbol = REPLACE(market_tickers.symbol, '.CA', '') AND b.last_price IS NOT NULL))
         ORDER BY sector_name, market_cap DESC`
    );

    const bySector = new Map<string, string[]>();
    for (const r of result.rows as Array<Record<string, unknown>>) {
        const sector = String(r.sector_name);
        const list = bySector.get(sector);
        if (list) {
            if (list.length < 8) list.push(String(r.symbol).toUpperCase());
        } else {
            bySector.set(sector, [String(r.symbol).toUpperCase()]);
        }
    }

    // THE PAGE'S OWN GATE, applied here. renderStockVs 404s a pair with fewer
    // than MIN_ROWS populated metric rows; selecting by market cap alone
    // advertised four such URLs (ACRO-vs-EIUD, AIHC-vs-ANFI, both languages).
    // Same stats, same ticker fields, same counter — the two cannot disagree.
    const [tickers, statsMap] = await Promise.all([getAllTickers(), getStatsMap()]);
    const tickerBySym = new Map(tickers.map((t) => [String(t.symbol).toUpperCase(), t as unknown as Record<string, unknown>]));

    const entries: Entry[] = [];
    for (const syms of bySector.values()) {
        if (syms.length < 2) continue;
        for (let i = 0; i < syms.length; i++) {
            for (let j = i + 1; j < syms.length; j++) {
                const [a, b] = syms[i] < syms[j] ? [syms[i], syms[j]] : [syms[j], syms[i]];
                const ta = tickerBySym.get(a);
                const tb = tickerBySym.get(b);
                if (!ta || !tb) continue;
                if (!pairIsPublishable(statsMap[a] ?? null, ta, statsMap[b] ?? null, tb)) continue;
                const pair = `${a}-vs-${b}`;
                entries.push({ loc: absUrl(`/companies/vs/${pair}`), changefreq: 'weekly', priority: '0.4' });
                entries.push({ loc: absUrl(`/ar/companies/vs/${pair}`), changefreq: 'weekly', priority: '0.4' });
            }
        }
    }
    return entries;
}

const BUILDERS: Record<string, () => Promise<Entry[]>> = {
    core: coreEntries,
    companies: companyEntries,
    'ar-companies': arCompanyEntries,
    metrics: metricEntries,
    sectors: sectorEntries,
    funds: fundEntries,
    'fund-categories': fundCategoryEntries,
    'fund-providers': fundProviderEntries,
    comparisons: comparisonEntries,
    'stock-comparisons': stockComparisonEntries,
    learn: learnEntries,
    glossary: glossaryEntries,
    news: newsEntries,
};

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    const { name } = await params;
    const key = (name || '').replace(/\.xml$/, '');
    const builder = BUILDERS[key];
    if (!builder) {
        return new NextResponse('Not found', { status: 404 });
    }
    try {
        const entries = await builder();
        return new NextResponse(render(entries), {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400',
            },
        });
    } catch (error: any) {
        console.error(`[sitemap:${key}]`, error.message);
        return new NextResponse('Sitemap temporarily unavailable', { status: 503 });
    }
}
