import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';
import { SITE_URL, absUrl, newsPath, fundPath, symbolPath, slugify, learnPath, glossaryPath, sectorPath } from '@/lib/seo';
import { sectorAr } from '@/content/sector-names-ar';
import learnTopics from '@/content/learn-topics.generated';
import { GLOSSARY_TERMS } from '@/content/glossary-terms';

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
        ['/Funds', 'daily', '0.9'],
        ['/Funds/Compare', 'daily', '0.6'],
        ['/Market-Pulse', 'hourly', '0.9'],
        ['/Learn', 'weekly', '0.8'],
        ['/companies', 'daily', '0.9'],
        ['/sectors', 'daily', '0.7'],
        ['/markets/movers', 'hourly', '0.7'],
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
        ['/editorial-policy', 'monthly', '0.4'],
        ['/ar/editorial-policy', 'monthly', '0.3'],
        ['/corrections', 'monthly', '0.3'],
        ['/ar/corrections', 'monthly', '0.3'],
        ['/contact', 'monthly', '0.4'],
        ['/Calculators', 'weekly', '0.6'],
        ['/ar/Calculators', 'weekly', '0.6'],
        ['/RiskAssessment', 'weekly', '0.6'],
        ['/ar/RiskAssessment', 'weekly', '0.6'],
        ['/privacy', 'yearly', '0.2'],
        ['/terms', 'yearly', '0.2'],
    ];
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
           AND COALESCE(t.sector_name,'') <> 'Index' -- EGX30 index row is not a company page
           AND NOT (t.symbol LIKE '%.CA' AND EXISTS (
               SELECT 1 FROM market_tickers b
               WHERE b.symbol = REPLACE(t.symbol, '.CA', '') AND b.last_price IS NOT NULL))
         ORDER BY t.symbol`
    );
    return result.rows.flatMap((r: any) => {
        const base = symbolPath(r.symbol);
        const entries: Entry[] = [
            { loc: absUrl(base), lastmod: r.lastmod, changefreq: 'daily', priority: '0.8' },
        ];
        if (r.has_fin) entries.push({ loc: absUrl(`${base}/financials`), lastmod: r.lastmod, changefreq: 'weekly', priority: '0.6' });
        if (r.has_div) entries.push({ loc: absUrl(`${base}/dividends`), lastmod: r.lastmod, changefreq: 'weekly', priority: '0.6' });
        if (r.has_tech) entries.push({ loc: absUrl(`${base}/technicals`), lastmod: r.lastmod, changefreq: 'daily', priority: '0.5' });
        if (r.has_hist) entries.push({ loc: absUrl(`${base}/history`), lastmod: r.lastmod, changefreq: 'daily', priority: '0.5' });
        return entries;
    });
}

async function sectorEntries(): Promise<Entry[]> {
    const result = await db.query(
        `SELECT sector_name
         FROM market_tickers
         WHERE last_price IS NOT NULL AND sector_name IS NOT NULL AND sector_name <> ''
           AND sector_name <> 'Index'
         GROUP BY sector_name
         ORDER BY sector_name`
    );
    return result.rows.flatMap((r: any) => [
        { loc: absUrl(sectorPath(r.sector_name, null, 'en')), changefreq: 'daily', priority: '0.7' },
        { loc: absUrl(sectorPath(r.sector_name, sectorAr(r.sector_name), 'ar')), changefreq: 'daily', priority: '0.6' },
    ]);
}

async function arCompanyEntries(): Promise<Entry[]> {
    // Arabic twins of the company pages (/ar/symbol/{SYM}).
    const result = await db.query(
        `SELECT t.symbol,
                GREATEST(
                    COALESCE(t.last_updated, 'epoch'::timestamptz),
                    COALESCE(t.updated_at, 'epoch'::timestamptz)
                ) AS lastmod
         FROM market_tickers t
         WHERE t.last_price IS NOT NULL
           AND COALESCE(t.sector_name,'') <> 'Index'
           AND NOT (t.symbol LIKE '%.CA' AND EXISTS (
               SELECT 1 FROM market_tickers b
               WHERE b.symbol = REPLACE(t.symbol, '.CA', '') AND b.last_price IS NOT NULL))
         ORDER BY t.symbol`
    );
    return result.rows.map((r: any) => ({
        loc: absUrl(`/ar${symbolPath(r.symbol)}`),
        lastmod: r.lastmod,
        changefreq: 'daily',
        priority: '0.7',
    }));
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
    // Top fund pairs within each fund type (numeric ids, ranked by 1Y return):
    // C(top5, 2) = 10 pairs per type — every URL resolves by construction.
    // return_1y itself is all-NULL in funds_view; the populated columns are
    // returns_1y / one_year_return (2026-07-03 audit: this gate emptied the
    // whole segment). Coalesce + rank in JS.
    const result = await db.query(
        `SELECT fund_id, fund_type_en, return_1y, returns_1y, one_year_return
         FROM funds_view
         WHERE fund_id::text ~ '^[0-9]+$'`
    );
    const ranked = (result.rows as Array<Record<string, unknown>>)
        .map((r) => {
            const raw = r.return_1y ?? r.returns_1y ?? r.one_year_return;
            const r1y = raw === null || raw === undefined ? NaN : Number(raw);
            return { fund_id: Number(r.fund_id), fund_type_en: (r.fund_type_en as string | null) || 'other', r1y };
        })
        .filter((r) => Number.isFinite(r.r1y))
        .sort((a, b) => (a.fund_type_en === b.fund_type_en ? b.r1y - a.r1y : a.fund_type_en.localeCompare(b.fund_type_en)));
    const byType = new Map<string, number[]>();
    for (const r of ranked) {
        const t = r.fund_type_en;
        if (!byType.has(t)) byType.set(t, []);
        const arr = byType.get(t) as number[];
        if (arr.length < 5) arr.push(r.fund_id);
    }
    const entries: Entry[] = [];
    for (const ids of byType.values()) {
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const [a, b] = ids[i] < ids[j] ? [ids[i], ids[j]] : [ids[j], ids[i]];
                entries.push({ loc: absUrl(`/Funds/vs/${a}-vs-${b}`), changefreq: 'weekly', priority: '0.4' });
            }
        }
    }
    return entries;
}

async function fundEntries(): Promise<Entry[]> {
    // Numeric fund_ids only: the /Funds/[id] route resolves numeric ids, but
    // funds_view also carries legacy string ids (EGY_NEW_*, EGYAAIB*, ...)
    // whose URLs 404 — the post-deploy audit caught 152 dead URLs here.
    const result = await db.query(
        `SELECT fund_id, fund_name, fund_name_en, last_nav_date
         FROM funds_view
         WHERE fund_id::text ~ '^[0-9]+$'
         ORDER BY fund_id`
    );
    // EN + AR pairs (reciprocal hreflang lives in the pages' metadata). The AR
    // canonical carries the Arabic slug — absUrl percent-encodes it for <loc>.
    return result.rows.flatMap((r: any) => [
        {
            loc: absUrl(fundPath(r.fund_id, r.fund_name_en, r.fund_name, 'en')),
            lastmod: r.last_nav_date,
            changefreq: 'daily',
            priority: '0.7',
        },
        {
            loc: absUrl(fundPath(r.fund_id, r.fund_name_en, r.fund_name, 'ar')),
            lastmod: r.last_nav_date,
            changefreq: 'daily',
            priority: '0.7',
        },
    ]);
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
    // Full archive (well under the 50k/sitemap limit; revisit when we approach it).
    const result = await db.query(
        `SELECT id, headline, published_at
         FROM market_news
         ORDER BY published_at DESC
         LIMIT 45000`
    );
    return result.rows.map((r: any) => ({
        loc: absUrl(newsPath(r.id, r.headline)),
        lastmod: r.published_at,
        changefreq: 'never',
        priority: '0.5',
    }));
}

const BUILDERS: Record<string, () => Promise<Entry[]>> = {
    core: coreEntries,
    companies: companyEntries,
    'ar-companies': arCompanyEntries,
    metrics: metricEntries,
    sectors: sectorEntries,
    funds: fundEntries,
    comparisons: comparisonEntries,
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
