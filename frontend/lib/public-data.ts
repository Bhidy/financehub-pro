import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db-server';
import { matchAssetManager } from './asset-managers';
import { fundIsDormant } from './fund-stats';
import { primaryNewsRows, newsDedupeKey, sanitizeNewsText, likeEscape } from './news-display';

/**
 * EGX-ONLY GATE for every PUBLIC / indexable surface.
 *
 * market_tickers carries a legacy Tadawul (Saudi) universe alongside the
 * Egyptian one: 273 of 500 rows sampled on 2026-09-03 were Saudi, identifiable
 * with certainty because they carry `market_code IS NULL` and `currency='SAR'`
 * while every EGX row carries `market_code='EGX'`.
 *
 * Unfiltered, those rows were published as Egyptian Exchange companies:
 * 414 of 1,673 URLs in companies.xml and 413 of 729 in ar-companies.xml —
 * so the Arabic page titled "أسهم البورصة المصرية" was 57% Saudi. On a
 * financial site that is a correctness failure before it is an SEO one, and as
 * SEO it is 827 wrong-market URLs diluting topical authority.
 *
 * This gate is applied to the PUBLIC layer only. No data is deleted and the
 * internal app/API are untouched — the owner deferred the wider Saudi cleanup,
 * and this does not pre-empt that decision.
 */
export const EGX_ONLY = `market_code = 'EGX'`;


/**
 * Server-side data access for the SEO/public pages (news articles, symbol
 * pages, fund pages, hubs). Every helper is React.cache()-wrapped so
 * generateMetadata + the page body share one query per request.
 *
 * SQL mirrors the proven /api/v1 route queries (same tables/views/columns) —
 * do not invent new column names here without checking those routes.
 */

export type NewsArticle = {
    id: number;
    symbol: string | null;
    headline: string;
    url: string | null;
    published_at: string;
    article_body: string | null;
    image_url: string | null;
    source_section: string | null;
    source_country: string | null;
};

export const getNewsArticle = cache(async (id: number): Promise<NewsArticle | null> => {
    const result = await db.query(
        `SELECT id, symbol, headline, url, published_at, article_body,
                image_url, source_section, source_country
         FROM market_news WHERE id = $1`,
        [id]
    );
    return (result.rows[0] as NewsArticle) || null;
});

export const getLatestNews = cache(async (limit = 6): Promise<NewsArticle[]> => {
    // Over-fetch, then keep only publishable rows (no off-market stories, one
    // copy per headline) — see primaryNewsRows(). A LIMIT applied before that
    // filter would hand callers short lists on days the feed re-ingests.
    const result = await db.query(
        `SELECT id, symbol, headline, url, published_at, article_body,
                image_url, source_section, source_country
         FROM market_news ORDER BY published_at DESC LIMIT $1`,
        [limit * 2 + 20]
    );
    return primaryNewsRows(result.rows as NewsArticle[]).slice(0, limit);
});

/**
 * The id of the PRIMARY copy of a story when `article` is a later duplicate,
 * else null. The feed re-ingests stories under new ids; the article page 308s
 * every later copy to the first, and its metadata names the first as
 * canonical. Candidates come from a headline-prefix ILIKE and are confirmed
 * with the same newsDedupeKey() the lists use, so page and lists agree.
 */
export const getNewsPrimaryId = cache(async (article: { id: number; headline?: string | null }): Promise<number | null> => {
    const key = newsDedupeKey(article.headline);
    if (!key) return null;
    const prefix = sanitizeNewsText(article.headline).slice(0, 40);
    if (!prefix) return null;
    const result = await db.query(
        `SELECT id, headline FROM market_news
         WHERE id < $1 AND headline ILIKE $2
         ORDER BY id ASC LIMIT 20`,
        [article.id, `%${likeEscape(prefix)}%`]
    );
    const hit = (result.rows as Array<{ id: number; headline: string }>).find((r) => newsDedupeKey(r.headline) === key);
    return hit ? Number(hit.id) : null;
});

export type Ticker = {
    symbol: string;
    name_en: string | null;
    name_ar: string | null;
    last_price: number | null;
    change_percent: number | null;
    volume: number | null;
    sector_name: string | null;
    market_cap: number | null;
    pe_ratio: number | null;
    pb_ratio: number | null;
    dividend_yield: number | null;
    currency: string | null;
    isin: string | null;
    logo_url: string | null;
    last_updated: string | null;
};

const TICKER_NUM = ['last_price', 'change_percent', 'volume', 'market_cap', 'pe_ratio', 'pb_ratio', 'dividend_yield'];

/**
 * A few upstream rows carry raw provider tuples instead of company names
 * ("EIUD.CA,0P0000TP7J,28746876") — indexing those as titles is data
 * corruption in the SERP. Null them out; callers fall back to the symbol.
 */
const PROVIDER_TUPLE = /^[A-Z0-9._-]+,0P[0-9A-Z]+,\d+$/;
function cleanName(row: Record<string, unknown>): Record<string, unknown> {
    for (const k of ['name_en', 'name_ar']) {
        const v = row[k];
        if (typeof v === 'string' && PROVIDER_TUPLE.test(v.trim())) row[k] = null;
    }
    // Currency sanitizer (audit 2026-07-04, Critical): ~36 EGX tickers carry a
    // stale 'SAR' label (Tadawul-era residue) and were rendering "SAR" prices
    // on the indexable /companies, /markets/egx30, movers and symbol pages —
    // feeding AI engines a wrong currency. NO EGX line trades in SAR; only a
    // handful legitimately trade in USD (FAITA/EGBE/VLMRA). Map SAR -> EGP for
    // DISPLAY only (the DB is untouched — the deferred Saudi purge is separate).
    if (row.currency === 'SAR') row.currency = 'EGP';
    return row;
}

function toNum(row: Record<string, unknown>, fields: string[]): Record<string, unknown>;
function toNum(row: Record<string, unknown> | null, fields: string[]): Record<string, unknown> | null;
function toNum(row: Record<string, unknown> | null, fields: string[]) {
    if (!row) return row;
    for (const f of fields) {
        const v = row[f];
        if (v === null || v === undefined || v === '') { row[f] = null; continue; }
        const n = typeof v === 'number' ? v : Number(v);
        row[f] = Number.isFinite(n) ? n : null;
    }
    return row;
}

export const getTicker = cache(async (symbol: string): Promise<Ticker | null> => {
    const result = await db.query(
        `SELECT symbol, name_en, name_ar, last_price, change_percent, volume,
                sector_name, market_cap, pe_ratio, pb_ratio, dividend_yield,
                currency, isin, logo_url, last_updated
         FROM market_tickers WHERE symbol = $1 AND ${EGX_ONLY}`,
        [symbol.toUpperCase()]
    );
    const row = result.rows[0] ? cleanName(result.rows[0]) : null;
    return (toNum(row, TICKER_NUM) as Ticker) || null;
});

/** Numeric columns of stock_stats_view every reader coerces — ONE list, so
 *  the per-symbol read and the all-symbols map can never disagree. */
const STATS_NUM_FIELDS = [
    'last_price', 'pe_ratio', 'forward_pe', 'pb_ratio', 'dividend_yield', 'market_cap',
    'beta_1y', 'rsi_14', 'ma_50d', 'ma_200d', 'eps_ttm', 'revenue_ttm', 'net_income_ttm',
    'roe', 'roa', 'bvps', 'shares_outstanding', 'dps',
    // FISCAL-YEAR + balance-sheet + growth columns. The view exposes these
    // (migration 0009) and they are far better populated than their TTM
    // siblings — revenue_fy ~78% vs revenue_ttm ~24% — but they were never
    // coerced here, so a statistics page could not use them. The overview
    // shows the TTM set; these are what make a dedicated statistics page
    // additive rather than a re-grouping.
    'revenue_fy', 'net_income_fy', 'eps_fy', 'ebitda_fy', 'fcf_fy', 'fcf_ttm',
    'total_assets', 'total_debt', 'book_value',
    'revenue_growth', 'profit_growth', 'eps_growth', 'profit_margin',
    'float_shares_percent',
];

/** Key statistics (stock_stats_view — already absolute EGP). */
export const getStats = cache(async (symbol: string): Promise<Record<string, number | string | null> | null> => {
    const result = await db.query(`SELECT * FROM stock_stats_view WHERE symbol = $1`, [symbol.toUpperCase()]);
    const row = result.rows[0] || null;
    return row ? (toNum(row, STATS_NUM_FIELDS) as Record<string, number | string | null>) : null;
});

/**
 * Key statistics for EVERY EGX symbol, keyed by ticker — the read the sitemap
 * needs to apply the comparison page's own row gate. The stock-comparisons
 * segment used to pick pairs by market cap alone while the page demanded
 * eight populated metric rows, so four sitemapped URLs 404'd (verified live
 * 2026-09-05). One cached scan of the view, 15 minutes.
 */
const _statsMapCached = unstable_cache(
    async (): Promise<Record<string, Record<string, number | string | null>>> => {
        const result = await db.query(
            `SELECT s.*
             FROM stock_stats_view s
             JOIN market_tickers t ON t.symbol = s.symbol
             WHERE t.last_price IS NOT NULL AND t.${EGX_ONLY}`
        );
        const out: Record<string, Record<string, number | string | null>> = {};
        for (const r of result.rows as Array<Record<string, unknown>>) {
            out[String(r.symbol).toUpperCase()] = toNum(r, STATS_NUM_FIELDS) as Record<string, number | string | null>;
        }
        return out;
    },
    ['seo:stats-map'],
    { revalidate: 900, tags: ['seo-tickers'] }
);
export const getStatsMap = cache((): Promise<Record<string, Record<string, number | string | null>>> => _statsMapCached());

export type CompanyProfile = {
    description: string | null;
    website: string | null;
    industry: string | null;
    employees: number | null;
    ceo: string | null;
    founded: string | null;
    headquarters: string | null;
};

export const getCompanyProfile = cache(async (symbol: string): Promise<CompanyProfile | null> => {
    const base = symbol.toUpperCase().replace('.CA', '');
    const result = await db.query(
        `SELECT description, website, industry, employees, ceo, founded, headquarters
         FROM company_profiles WHERE symbol = $1 OR symbol = $2 LIMIT 1`,
        [base, `${base}.CA`]
    );
    return (result.rows[0] as CompanyProfile) || null;
});

/** Same-sector peers by market cap (for the "compare with" module). */
export const getSectorPeers = cache(async (sector: string, excludeSymbol: string, limit = 6): Promise<Ticker[]> => {
    const result = await db.query(
        `SELECT symbol, name_en, name_ar, last_price, change_percent, market_cap,
                sector_name, currency, dividend_yield, pe_ratio, pb_ratio, volume,
                isin, logo_url, last_updated
         FROM market_tickers
         WHERE sector_name = $1 AND symbol <> $2 AND last_price IS NOT NULL
           AND ${EGX_ONLY}
         ORDER BY market_cap::numeric DESC NULLS LAST
         LIMIT $3`,
        [sector, excludeSymbol.toUpperCase(), limit]
    );
    return result.rows.map((r: Record<string, unknown>) => toNum(cleanName(r), TICKER_NUM)) as Ticker[];
});

export type Fund = Record<string, unknown> & {
    fund_id: number;
    fund_name: string | null;
    fund_name_en: string | null;
    latest_nav: number | null;
    live_latest_nav: number | null;
    last_nav_date: string | null;
};

/**
 * funds_view ships two families of return columns: the `return_*` family is
 * NULL on production while `returns_*` / `one_year_return`-style columns carry
 * the data (2026-07-03 final audit: empty money-page table + empty comparisons
 * sitemap). Normalize onto the `return_*` names every consumer reads — done in
 * JS, not SQL COALESCE, so mismatched column types can never 500 a page.
 */
const RETURN_FALLBACKS: Array<[string, string[]]> = [
    ['return_ytd', ['returns_ytd', 'ytd_return']],
    ['return_1m', ['returns_1m']],
    ['return_3m', ['returns_3m']],
    ['return_1y', ['returns_1y', 'one_year_return']],
    ['return_3y', ['returns_3y', 'three_year_return']],
    ['return_5y', ['returns_5y', 'five_year_return']],
];
function coalesceReturns(r: Record<string, unknown>): Record<string, unknown> {
    for (const [main, alts] of RETURN_FALLBACKS) {
        if (r[main] === null || r[main] === undefined) {
            for (const alt of alts) {
                if (r[alt] !== null && r[alt] !== undefined) {
                    r[main] = r[alt];
                    break;
                }
            }
        }
    }
    return r;
}

export const getFund = cache(async (fundId: number): Promise<Fund | null> => {
    const result = await db.query(`SELECT * FROM funds_view WHERE fund_id = $1`, [fundId]);
    const row = result.rows[0] as Fund | undefined;
    if (!row) return null;
    // Canonical NAV = live value derived from nav_history (see /api/v1/funds/[id]).
    row.latest_nav = (row.live_latest_nav as number | null) ?? (Number(row.latest_nav) || null);
    // ------------------------------------------------------------------
    // TRUST HIERARCHY CUTOVER (2026-08-15 audit).
    //
    // The old order ran the legacy coalesce FIRST and let fund_risk_metrics
    // "fill only gaps". The legacy figures are decypha/Mubasher-era columns
    // that NOTHING refreshes from source anymore — reconciling them against
    // our own nav_history reproduced the displayed YTD on 5 of 158 funds.
    // Meanwhile fund_risk_metrics is recomputed daily from nav_history with
    // audited math: a window return whose reference sits further than 10% of
    // the window from its anchor is NULL, not a wrong number.
    //
    // So when a computed row exists it is AUTHORITATIVE for the whole return
    // family and the 52w range — including its NULLs. A NULL here means "this
    // cannot be computed honestly from the history we hold", and papering over
    // it with a legacy figure we cannot reproduce is precisely the mistrust
    // this page is being cured of. The tile renders '—', which is the truth.
    // Legacy coalesce survives ONLY for funds with no computed row at all.
    // ------------------------------------------------------------------
    let computed = false;
    try {
        const rm = await db.query(`SELECT * FROM fund_risk_metrics WHERE fund_id = $1`, [String(fundId)]);
        const m = rm.rows[0] as Record<string, unknown> | undefined;
        if (m) {
            computed = true;
            row.max_drawdown = m.max_drawdown;
            row.volatility_annual = m.volatility_annual;
            // Phase-2 analytics primitives live ONLY in fund_risk_metrics — take verbatim.
            for (const k of ['cagr', 'return_inception', 'inception_years', 'downside_deviation',
                'best_period', 'worst_period', 'positive_periods_pct', 'avg_gain', 'avg_loss',
                'avg_period_days', 'analytics_suppressed']) {
                row[k] = m[k];
            }
            for (const k of ['nav_52w_high', 'nav_52w_low', 'return_1m', 'return_3m', 'return_6m',
                'return_ytd', 'return_1y', 'return_3y', 'return_5y']) {
                row[k] = m[k];
            }
            if ((row.nav_points === null || row.nav_points === undefined) && m.points != null) row.nav_points = m.points;
        }
    } catch { /* side table isolated — never break the core payload */ }
    if (!computed) coalesceReturns(row);
    // Harvested metadata that funds_view doesn't carry (prospectus / manager person /
    // purchase+redemption frequency) + distribution platforms. Isolated: a missing
    // column or the fund_platforms table can never break the page.
    try {
        const meta = await db.query(
            `SELECT prospectus_url, alternative_names, fund_manager, purchase_frequency, redemption_frequency,
                    isin, aum, aum_millions, market
             FROM mutual_funds WHERE fund_id = $1`, [String(fundId)]);
        const mm = meta.rows[0] as Record<string, unknown> | undefined;
        if (mm) for (const k of ['prospectus_url', 'alternative_names', 'fund_manager', 'purchase_frequency',
            'redemption_frequency', 'isin', 'aum', 'aum_millions', 'market']) {
            if (row[k] === null || row[k] === undefined) row[k] = mm[k];
        }
    } catch { /* isolated */ }
    try {
        const pl = await db.query(
            `SELECT platform_name, logo_url FROM fund_platforms WHERE fund_id = $1 ORDER BY platform_name`, [String(fundId)]);
        row.platforms = pl.rows;
    } catch { row.platforms = []; }
    // The per-fund NAV quality ledger (compute_fund_data_quality.py): cadence,
    // coverage, worst gap, grade. Published on the profile as a fact about OUR
    // history of the fund — the spec's "confidence/status" field — never as a
    // judgement of the fund. Isolated: a missing table cannot break the page.
    try {
        const q = await db.query(
            `SELECT grade, coverage_pct, cadence, points, first_date, worst_gap_days, worst_gap_from, worst_gap_to
             FROM fund_data_quality WHERE fund_id = $1`, [String(fundId)]);
        const qr = q.rows[0] as Record<string, unknown> | undefined;
        if (qr) {
            row.quality_grade = qr.grade;
            row.quality_coverage_pct = qr.coverage_pct;
            row.quality_cadence = qr.cadence;
            row.quality_points = qr.points;
            row.quality_first_date = qr.first_date instanceof Date ? qr.first_date.toISOString().slice(0, 10) : qr.first_date;
            row.quality_worst_gap_days = qr.worst_gap_days;
            row.quality_worst_gap_from = qr.worst_gap_from instanceof Date ? qr.worst_gap_from.toISOString().slice(0, 10) : qr.worst_gap_from;
            row.quality_worst_gap_to = qr.worst_gap_to instanceof Date ? qr.worst_gap_to.toISOString().slice(0, 10) : qr.worst_gap_to;
        }
    } catch { /* isolated */ }
    // Asset-manager profile from the STATIC harvested set (23 houses in
    // lib/asset-managers.ts). Matched by normalised, Arabic-aware token-set
    // equality (precise: "اتون فاروس" never matches a "فاروس" fund). No DB
    // dependency — the asset_managers table is unreliable to populate.
    try {
        const mp = matchAssetManager(
            row.manager_name as string | null,
            row.manager_name_en as string | null,
            row.owner_name as string | null,
            row.owner_name_en as string | null,
            row.issuer_en as string | null);
        if (mp) row.manager_profile = mp;
    } catch { /* isolated */ }
    toNum(row, [
        'latest_nav', 'return_ytd', 'return_1m', 'return_3m', 'return_6m', 'return_1y', 'return_3y', 'return_5y',
        'expense_ratio', 'fee_management', 'fee_subscription', 'fee_redemption',
        'nav_52w_high', 'nav_52w_low', 'aum', 'aum_millions', 'min_subscription', 'par_value',
        'max_drawdown', 'volatility_annual', 'nav_points',
        'cagr', 'return_inception', 'inception_years', 'downside_deviation',
        'best_period', 'worst_period', 'positive_periods_pct', 'avg_gain', 'avg_loss', 'avg_period_days',
        'quality_coverage_pct', 'quality_points', 'quality_worst_gap_days',
    ]);
    return row;
});

export const getFundPeers = cache(async (fundId: number): Promise<Array<Record<string, unknown>>> => {
    try {
        // fund_peers stores peers BY NAME (peer_fund_name, peer_rank) — the
        // scraper writes no peer id, and fund_id is VARCHAR. The old query
        // joined on a column that never existed (p.peer_fund_id) and compared
        // varchar to integer, so it threw on every request and "Similar funds"
        // was empty on every fund page (Vercel logs, 2026-09-05). Resolve the
        // peer's id by matching its name against the fund universe.
        const result = await db.query(
            `SELECT p.peer_fund_name AS peer_name_raw, p.peer_rank,
                    f.fund_id AS peer_fund_id,
                    COALESCE(f.fund_name, p.peer_fund_name) AS peer_fund_name,
                    f.fund_name_en AS peer_fund_name_en
             FROM fund_peers p
             LEFT JOIN funds_view f
               ON f.fund_name = p.peer_fund_name OR f.fund_name_en = p.peer_fund_name
             WHERE p.fund_id = $1::text
             ORDER BY p.peer_rank NULLS LAST LIMIT 6`,
            [String(fundId)]
        );
        return result.rows;
    } catch {
        return [];
    }
});

/** Annual financial statements (egx_financials via TradingView, up to 20y). */
export type FinancialYear = {
    fiscal_year: number;
    revenue: number | null;
    gross_profit: number | null;
    ebitda: number | null;
    net_income: number | null;
    eps_diluted: number | null;
    free_cash_flow: number | null;
    total_assets: number | null;
    total_debt: number | null;
    dps: number | null;
};

export const getFinancialYears = cache(async (symbol: string): Promise<FinancialYear[]> => {
    const result = await db.query(
        `SELECT fiscal_year, revenue, gross_profit, ebitda, net_income,
                eps_diluted, free_cash_flow, total_assets, total_debt, dps
         FROM egx_financials WHERE UPPER(symbol) = $1 ORDER BY fiscal_year DESC`,
        [symbol.toUpperCase()]
    );
    return result.rows.map((r: Record<string, unknown>) =>
        toNum(r, ['fiscal_year', 'revenue', 'gross_profit', 'ebitda', 'net_income', 'eps_diluted', 'free_cash_flow', 'total_assets', 'total_debt', 'dps'])
    ) as FinancialYear[];
});

/** Historical dividend payments (dividend_history). */
export const getDividendHistory = cache(async (symbol: string): Promise<Array<Record<string, unknown>>> => {
    const result = await db.query(
        `SELECT ex_date, dividend_amount, record_date, pay_date, currency
         FROM dividend_history WHERE UPPER(symbol) = $1 ORDER BY ex_date DESC LIMIT 50`,
        [symbol.toUpperCase()]
    );
    return result.rows.map((r: Record<string, unknown>) => toNum(r, ['dividend_amount']));
});

/** Dividend summary (egx_dividends via TradingView; unix-second dates). */
export const getDividendSummary = cache(async (symbol: string): Promise<Record<string, unknown> | null> => {
    const result = await db.query(
        `SELECT symbol, div_yield, amount_recent, ex_date_recent, payment_date_recent,
                amount_upcoming, ex_date_upcoming, payment_date_upcoming,
                frequency, payout_ratio_ttm, continuous_growth
         FROM egx_dividends WHERE UPPER(symbol) = $1`,
        [symbol.toUpperCase()]
    );
    const row = result.rows[0] || null;
    return row ? toNum(row, ['div_yield', 'amount_recent', 'ex_date_recent', 'payment_date_recent', 'amount_upcoming', 'payout_ratio_ttm', 'continuous_growth']) : null;
});

/** Multi-timeframe technicals (egx_technicals — same columns as the API route). */
export const getTechnicals = cache(async (symbol: string): Promise<Array<Record<string, unknown>>> => {
    const result = await db.query(
        `SELECT timeframe, rsi, macd_macd, macd_signal, stoch_k, stoch_d,
                cci20, adx, mom, recommend_all, recommend_ma, recommend_other,
                ema50, ema200, sma50, sma200, updated_at
         FROM egx_technicals
         WHERE UPPER(symbol) = $1
         ORDER BY CASE timeframe
             WHEN '60' THEN 1 WHEN '240' THEN 2 WHEN '1D' THEN 3 WHEN '1W' THEN 4 ELSE 5 END`,
        [symbol.toUpperCase()]
    );
    return result.rows.map((r: Record<string, unknown>) =>
        toNum(r, ['rsi', 'macd_macd', 'macd_signal', 'stoch_k', 'stoch_d', 'cci20', 'adx', 'mom', 'recommend_all', 'recommend_ma', 'recommend_other', 'ema50', 'ema200', 'sma50', 'sma200'])
    );
});

/** Recent daily OHLC rows (ohlc_data), newest first. */
export const getRecentHistory = cache(async (symbol: string, limit = 60): Promise<Array<Record<string, unknown>>> => {
    const result = await db.query(
        `SELECT date, open, high, low, close, volume
         FROM ohlc_data WHERE UPPER(symbol) = $1 ORDER BY date DESC LIMIT $2`,
        [symbol.toUpperCase(), limit]
    );
    return result.rows.map((r: Record<string, unknown>) => toNum(r, ['open', 'high', 'low', 'close', 'volume']));
});

/**
 * Multi-horizon performance + quote essentials from ohlc_data in ONE query:
 * previous close, 52-week high/low, and % change vs 1W/1M/3M/6M/YTD/1Y/5Y
 * reference closes. Every top-ranking finance template carries this block;
 * ours was missing it entirely (2026-07-03 competitor audit).
 */
export type SymbolPerformance = {
    prev_close: number | null;
    high_52w: number | null;
    low_52w: number | null;
    latest_close: number | null;
    latest_date: string | null;
    horizons: Array<{ label: string; pct: number | null }>;
};

export const getPerformance = cache(async (symbol: string): Promise<SymbolPerformance | null> => {
    const result = await db.query(
        `WITH h AS (
            SELECT date, close FROM ohlc_data
            WHERE UPPER(symbol) = $1 AND close IS NOT NULL
            ORDER BY date DESC LIMIT 1400
        )
        SELECT
            (SELECT close FROM h ORDER BY date DESC LIMIT 1)                                        AS latest_close,
            (SELECT date  FROM h ORDER BY date DESC LIMIT 1)                                        AS latest_date,
            (SELECT close FROM h ORDER BY date DESC OFFSET 1 LIMIT 1)                               AS prev_close,
            (SELECT MAX(close) FROM h WHERE date >= NOW() - INTERVAL '365 days')                    AS high_52w,
            (SELECT MIN(close) FROM h WHERE date >= NOW() - INTERVAL '365 days')                    AS low_52w,
            (SELECT close FROM h WHERE date <= NOW() - INTERVAL '7 days'   ORDER BY date DESC LIMIT 1) AS ref_1w,
            (SELECT close FROM h WHERE date <= NOW() - INTERVAL '30 days'  ORDER BY date DESC LIMIT 1) AS ref_1m,
            (SELECT close FROM h WHERE date <= NOW() - INTERVAL '91 days'  ORDER BY date DESC LIMIT 1) AS ref_3m,
            (SELECT close FROM h WHERE date <= NOW() - INTERVAL '182 days' ORDER BY date DESC LIMIT 1) AS ref_6m,
            (SELECT close FROM h WHERE date <  date_trunc('year', NOW())   ORDER BY date DESC LIMIT 1) AS ref_ytd,
            (SELECT close FROM h WHERE date <= NOW() - INTERVAL '365 days' ORDER BY date DESC LIMIT 1) AS ref_1y,
            (SELECT close FROM h ORDER BY date ASC LIMIT 1)                                         AS ref_oldest,
            (SELECT date  FROM h ORDER BY date ASC LIMIT 1)                                         AS oldest_date`,
        [symbol.toUpperCase()]
    );
    const r = result.rows[0] as Record<string, unknown> | undefined;
    if (!r || r.latest_close === null || r.latest_close === undefined) return null;
    const n = (v: unknown): number | null => {
        const x = typeof v === 'number' ? v : Number(v);
        return Number.isFinite(x) ? x : null;
    };
    const latest = n(r.latest_close);
    const pct = (ref: unknown): number | null => {
        const base = n(ref);
        return latest !== null && base !== null && base !== 0 ? ((latest - base) / base) * 100 : null;
    };
    // The 1,400-row window covers ~5.5 trading years; the oldest row is the
    // 5Y reference (labelled 5Y only when it is actually old enough).
    const oldestOldEnough =
        r.oldest_date != null && Date.now() - Date.parse(String(r.oldest_date)) > 4.5 * 365 * 86400_000;
    return {
        prev_close: n(r.prev_close),
        high_52w: n(r.high_52w),
        low_52w: n(r.low_52w),
        latest_close: latest,
        latest_date: r.latest_date ? String(r.latest_date) : null,
        horizons: [
            { label: '1W', pct: pct(r.ref_1w) },
            { label: '1M', pct: pct(r.ref_1m) },
            { label: '3M', pct: pct(r.ref_3m) },
            { label: '6M', pct: pct(r.ref_6m) },
            { label: 'YTD', pct: pct(r.ref_ytd) },
            { label: '1Y', pct: pct(r.ref_1y) },
            { label: '5Y', pct: oldestOldEnough ? pct(r.ref_oldest) : null },
        ],
    };
});

/**
 * EGX 30 index quote for the /markets/egx30 SSR page. Reads the internal
 * WS-backed route (30s server cache) so the crawler-visible page carries a
 * real index value + change — the audit found "EGX30 today" had no citable
 * number anywhere on the domain. Degrades to null (page shows definition +
 * constituents) rather than throwing.
 */
export type Egx30Quote = {
    value: number | null;
    change: number | null;
    changePercent: number | null;
    volume: number | null;
    timestamp: string | null;
    high52: number | null;
    low52: number | null;
    ytdPct: number | null;
};

export const getEgx30Index = cache(async (): Promise<Egx30Quote | null> => {
    try {
        const res = await fetch('https://startamarkets.com/api/v1/egx30/index', {
            signal: AbortSignal.timeout(7000),
            // revalidate (not no-store) so the /markets/egx30 pages can be ISR
            // rather than forced-dynamic; the route itself caches 30s upstream.
            next: { revalidate: 120 },
        });
        if (!res.ok) return null;
        const d = (await res.json()) as {
            quote?: { value?: number; change?: number; changePercent?: number; volume?: number; timestamp?: string };
            history?: Array<{ date?: string; close?: number }>;
        };
        const q = d.quote || {};
        const hist = Array.isArray(d.history) ? d.history : [];
        const closes = hist.map((h) => Number(h.close)).filter((n) => Number.isFinite(n));
        const yr = closes.slice(-252);
        const high52 = yr.length ? Math.max(...yr) : null;
        const low52 = yr.length ? Math.min(...yr) : null;
        // YTD: first close on/after Jan 1 of the latest year in history.
        let ytdPct: number | null = null;
        const cur = Number(q.value);
        if (Number.isFinite(cur) && hist.length) {
            const latestYear = new Date(hist[hist.length - 1].date || Date.now()).getUTCFullYear();
            const janRef = hist.find((h) => h.date && new Date(h.date).getUTCFullYear() === latestYear);
            const base = janRef ? Number(janRef.close) : NaN;
            if (Number.isFinite(base) && base !== 0) ytdPct = ((cur - base) / base) * 100;
        }
        const n = (v: unknown): number | null => (Number.isFinite(Number(v)) ? Number(v) : null);
        return {
            value: n(q.value),
            change: n(q.change),
            changePercent: n(q.changePercent),
            volume: n(q.volume),
            timestamp: q.timestamp || null,
            high52,
            low52,
            ytdPct,
        };
    } catch {
        return null;
    }
});

/** EGX30 constituents (top-30 by market cap as a stable proxy). */
export const getEgx30Constituents = cache(async (): Promise<Ticker[]> => {
    const result = await db.query(
        `SELECT symbol, name_en, name_ar, last_price, change_percent, market_cap,
                sector_name, currency, dividend_yield, pe_ratio, pb_ratio, volume,
                isin, logo_url, last_updated
         FROM market_tickers
         WHERE market_cap IS NOT NULL AND last_price IS NOT NULL
           AND ${EGX_ONLY}
           AND symbol NOT IN ('EGX30','^EGX30')
         ORDER BY market_cap::numeric DESC NULLS LAST LIMIT 30`
    );
    return result.rows.map((r: Record<string, unknown>) => toNum(cleanName(r), TICKER_NUM)) as Ticker[];
});

/** Latest news headlines for one symbol (symbol-page news block). */
export const getSymbolNews = cache(async (symbol: string, limit = 5): Promise<NewsArticle[]> => {
    const result = await db.query(
        `SELECT id, symbol, headline, url, published_at, article_body, image_url,
                source_section, source_country
         FROM market_news WHERE UPPER(symbol) = $1
         ORDER BY published_at DESC LIMIT $2`,
        [symbol.toUpperCase(), limit * 2]
    );
    return primaryNewsRows(result.rows as NewsArticle[]).slice(0, limit);
});

/** All-time price range + row count for the history page summary. */
// Cross-request cache: this is a full scan of a symbol's OHLC history for four
// aggregates, and the price-history pages were the slowest tail of the whole
// site (5-15 s cold, measured 2026-09-05) because every request re-ran it.
// Daily bars change once per session; 15 minutes cannot show a stale figure
// the page does not already date.
const _historyStatsCached = unstable_cache(
    async (symbol: string): Promise<Record<string, unknown> | null> => {
        const result = await db.query(
            `SELECT COUNT(*)::int AS rows, MIN(date) AS first_date, MAX(date) AS last_date,
                    MIN(low) AS all_time_low, MAX(high) AS all_time_high
             FROM ohlc_data WHERE UPPER(symbol) = $1`,
            [symbol.toUpperCase()]
        );
        const row = result.rows[0] || null;
        if (!row || !row.rows) return null;
        // Dates go through the cache as JSON — normalise to ISO strings here so
        // callers never see a Date on a cache miss and a string on a hit.
        for (const k of ['first_date', 'last_date']) {
            const v = row[k];
            if (v instanceof Date) row[k] = v.toISOString();
        }
        return toNum(row, ['rows', 'all_time_low', 'all_time_high']);
    },
    ['seo:history-stats'],
    { revalidate: 900, tags: ['seo-tickers'] }
);
export const getHistoryStats = cache((symbol: string): Promise<Record<string, unknown> | null> => _historyStatsCached(symbol.toUpperCase()));

/** Sector list with counts + aggregate market cap (for /sectors hubs). */
// Sector aggregates change slowly (membership + summed caps) and power the
// /sectors hubs — cache cross-request for 5 min, same rationale as the ticker list.
const _sectorsCached = unstable_cache(
    async (): Promise<Array<{ sector_name: string; companies: number; market_cap: number | null }>> => {
        const result = await db.query(
            `SELECT sector_name, COUNT(*)::int AS companies, SUM(market_cap::numeric) AS market_cap
             FROM market_tickers
             WHERE last_price IS NOT NULL AND sector_name IS NOT NULL
               AND ${EGX_ONLY} AND sector_name <> ''
               AND sector_name <> 'Index' -- the EGX30 index row is not a company sector
             GROUP BY sector_name
             ORDER BY SUM(market_cap::numeric) DESC NULLS LAST`
        );
        return result.rows.map((r: Record<string, unknown>) => toNum(r, ['companies', 'market_cap'])) as Array<{
            sector_name: string; companies: number; market_cap: number | null;
        }>;
    },
    ['seo:sectors'],
    { revalidate: 300, tags: ['seo-tickers'] }
);
export const getSectors = cache((): Promise<Array<{ sector_name: string; companies: number; market_cap: number | null }>> => _sectorsCached());

/** Movers straight from market_tickers (no dedicated endpoint exists). */
export const getMovers = cache(async (limit = 10): Promise<{ gainers: Ticker[]; losers: Ticker[]; active: Ticker[] }> => {
    const cols = `symbol, name_en, name_ar, last_price, change_percent, volume,
                  sector_name, market_cap, pe_ratio, pb_ratio, dividend_yield,
                  currency, isin, logo_url, last_updated`;
    const [gainers, losers, active] = await Promise.all([
        db.query(`SELECT ${cols} FROM market_tickers WHERE last_price IS NOT NULL AND ${EGX_ONLY} AND change_percent IS NOT NULL AND COALESCE(sector_name,'') <> 'Index' ORDER BY change_percent::numeric DESC LIMIT $1`, [limit]),
        db.query(`SELECT ${cols} FROM market_tickers WHERE last_price IS NOT NULL AND ${EGX_ONLY} AND change_percent IS NOT NULL AND COALESCE(sector_name,'') <> 'Index' ORDER BY change_percent::numeric ASC LIMIT $1`, [limit]),
        db.query(`SELECT ${cols} FROM market_tickers WHERE last_price IS NOT NULL AND ${EGX_ONLY} AND COALESCE(sector_name,'') <> 'Index' ORDER BY volume::numeric DESC NULLS LAST LIMIT $1`, [limit]),
    ]);
    const numify = (rows: Array<Record<string, unknown>>) => rows.map((r) => toNum(cleanName(r), TICKER_NUM)) as Ticker[];
    return { gainers: numify(gainers.rows), losers: numify(losers.rows), active: numify(active.rows) };
});

/** Paged news for the server-rendered /News hub. */
export const getNewsPage = cache(async (page: number, perPage = 24): Promise<{ articles: NewsArticle[]; total: number }> => {
    const offset = (Math.max(page, 1) - 1) * perPage;
    const [rows, count] = await Promise.all([
        db.query(
            `SELECT id, symbol, headline, url, published_at, article_body,
                    image_url, source_section, source_country
             FROM market_news ORDER BY published_at DESC LIMIT $1 OFFSET $2`,
            [perPage, offset]
        ),
        db.query(`SELECT COUNT(*)::int AS n FROM market_news`),
    ]);
    return { articles: rows.rows as NewsArticle[], total: (count.rows[0]?.n as number) || 0 };
});


/** Upcoming + recent dividend events across the market (calendar page). */
export const getDividendCalendar = cache(async (): Promise<{ upcoming: Array<Record<string, unknown>>; recent: Array<Record<string, unknown>> }> => {
    const [up, rec] = await Promise.all([
        db.query(
            `SELECT e.symbol, e.amount_upcoming, e.ex_date_upcoming, e.payment_date_upcoming,
                    t.name_en, t.name_ar, t.currency
             FROM egx_dividends e
             JOIN market_tickers t ON t.symbol = UPPER(e.symbol)
             WHERE e.amount_upcoming IS NOT NULL AND e.ex_date_upcoming IS NOT NULL
             ORDER BY e.ex_date_upcoming ASC`
        ),
        db.query(
            `SELECT d.symbol, d.dividend_amount, d.ex_date, d.pay_date, d.currency AS div_currency,
                    t.name_en, t.name_ar
             FROM dividend_history d
             JOIN market_tickers t ON t.symbol = UPPER(d.symbol)
             WHERE d.ex_date >= NOW() - INTERVAL '90 days'
             ORDER BY d.ex_date DESC LIMIT 60`
        ),
    ]);
    // SAR is stale-mislabel residue (never valid for EGX) — map to EGP for
    // display so the dividend calendar can't show a SAR per-share payout.
    const sar = (r: Record<string, unknown>, k: string) => { if (r[k] === 'SAR') r[k] = 'EGP'; return r; };
    return {
        upcoming: up.rows.map((r: Record<string, unknown>) => sar(toNum(r, ['amount_upcoming', 'ex_date_upcoming', 'payment_date_upcoming']), 'currency')),
        recent: rec.rows.map((r: Record<string, unknown>) => sar(toNum(r, ['dividend_amount']), 'div_currency')),
    };
});

/** All funds with the fields the rankings/comparison pages need. */
// Cross-request data cache (15 min), matching the pattern used for tickers
// above. This is the hottest fund read: it powers /ar/Funds, every fund
// category page, the EN + AR money pages and each fund detail page's peer
// block. Those routes are force-dynamic and Vercel does not CDN-cache a
// dynamic function response (measured 2026-09-03: middleware and next.config
// Cache-Control are both overridden by the platform's no-store), so the DATA
// cache is the only lever that removes the per-request round trip — the audit
// measured 1.29-1.9s TTFB on exactly these pages.
// 15 min is far shorter than the NAV publication cadence (twice daily) and
// every page carries an as-of stamp, so the cache can never show a figure the
// origin would not have shown.
const _allFundsRankedCached = unstable_cache(
    async (): Promise<Array<Record<string, unknown>>> => {
    const result = await db.query(
        `SELECT fund_id, fund_name, fund_name_en, fund_type, fund_type_en,
                classification_en, issuer_en, currency, is_shariah,
                -- Provider identity, BOTH languages. Omitting owner_name* and
                -- manager_name here made buildProviders() see managers only,
                -- so every bank hub 404'd while the sitemap (which queries its
                -- own column set) advertised them — a page/sitemap
                -- disagreement that only a live check catches.
                manager_name, manager_name_en, owner_name, owner_name_en,
                latest_nav, live_latest_nav, last_nav_date,
                return_ytd, return_1m, return_3m, return_1y, return_3y, return_5y,
                returns_ytd, ytd_return, returns_1m, returns_3m, returns_1y, one_year_return,
                returns_3y, three_year_return, returns_5y, five_year_return,
                expense_ratio, fee_management, min_subscription, inception_date, risk_level_en
         FROM funds_view
         WHERE fund_id::text ~ '^[0-9]+$'`
    );
    const rows = result.rows.map((r: Record<string, unknown>) => {
        r.latest_nav = (r.live_latest_nav as number | null) ?? r.latest_nav;
        coalesceReturns(r);
        return toNum(r, ['latest_nav', 'return_ytd', 'return_1m', 'return_3m', 'return_1y', 'return_3y', 'return_5y', 'expense_ratio', 'fee_management', 'min_subscription']);
    });
    // Rank in JS on the coalesced value (the raw return_1y column is all-NULL,
    // so an SQL ORDER BY on it would be meaningless).
    rows.sort((a, b) => ((b.return_1y as number | null) ?? -Infinity) - ((a.return_1y as number | null) ?? -Infinity));
    // THE CURRENT-FUND UNIVERSE. A fund that has not published a NAV for over
    // DORMANT_DAYS is closed, matured or frozen at source; it stays reachable
    // through its own page (getFund) but is not a current price, a ranked
    // return, a category member or a provider's live product. The public API
    // already drops these, so this is also what makes the crawler-facing
    // pre-render equal to what the marketplace shows a visitor.
    return rows.filter((r) => !fundIsDormant(r.last_nav_date));
    },
    ['seo:all-funds-ranked'],
    { revalidate: 900, tags: ['seo-funds'] }
);
// React.cache() still dedups within a single request; unstable_cache dedups
// ACROSS requests.
export const getAllFundsRanked = cache((): Promise<Array<Record<string, unknown>>> => _allFundsRankedCached());

/**
 * FUND RISK LEAGUE TABLE — the aggregate view of fund_risk_metrics.
 *
 * The backend recomputes volatility, drawdown, downside deviation and CAGR
 * for every fund daily (compute_fund_metrics.py, audited math), and until now
 * the site published them ONLY on each fund's own page: no URL answered "which
 * Egyptian funds are least volatile", a question competitors answer with a
 * broken drawdown figure. One cached read; the join to names/categories is
 * done in JS against getAllFundsRanked() so no second SQL join can drift.
 *
 * `analytics_suppressed` rows are carried so callers can EXCLUDE them — the
 * backend flags cash-fund redenomination artifacts there, and a league table
 * that ranked one of them would publish a false extreme.
 */
export type FundRiskRow = {
    fund_id: number;
    volatility_annual: number | null;
    max_drawdown: number | null;
    downside_deviation: number | null;
    cagr: number | null;
    inception_years: number | null;
    positive_periods_pct: number | null;
    worst_period: number | null;
    points: number | null;
    latest_date: string | null;
    analytics_suppressed: boolean;
};

const _fundRiskCached = unstable_cache(
    async (): Promise<FundRiskRow[]> => {
        const result = await db.query(
            `SELECT fund_id, volatility_annual, max_drawdown, downside_deviation, cagr,
                    inception_years, positive_periods_pct, worst_period, points, latest_date,
                    analytics_suppressed
             FROM fund_risk_metrics
             WHERE fund_id ~ '^[0-9]+$'`
        );
        return result.rows.map((r: Record<string, unknown>) => {
            toNum(r, ['volatility_annual', 'max_drawdown', 'downside_deviation', 'cagr', 'inception_years', 'positive_periods_pct', 'worst_period', 'points']);
            const d = r.latest_date;
            const latest = d instanceof Date ? d.toISOString().slice(0, 10) : d ? String(d).slice(0, 10) : null;
            return {
                fund_id: Number(r.fund_id),
                volatility_annual: r.volatility_annual as number | null,
                max_drawdown: r.max_drawdown as number | null,
                downside_deviation: r.downside_deviation as number | null,
                cagr: r.cagr as number | null,
                inception_years: r.inception_years as number | null,
                positive_periods_pct: r.positive_periods_pct as number | null,
                worst_period: r.worst_period as number | null,
                points: r.points as number | null,
                latest_date: latest,
                analytics_suppressed: r.analytics_suppressed === true || r.analytics_suppressed === 't',
            };
        });
    },
    ['seo:fund-risk'],
    { revalidate: 900, tags: ['seo-funds'] }
);

export const getFundRiskTable = cache((): Promise<FundRiskRow[]> => _fundRiskCached());

/**
 * MARKET SCREENER LISTS — one query, six ranked slices.
 *
 * Each slice answers a DIFFERENT search intent, so each gets its own page:
 * top gainers, top losers, most active, oversold, overbought and most
 * volatile. Running six separate queries would be six table scans per crawl;
 * one gated scan feeds them all.
 *
 * EGX-ONLY by construction (the gate lives in the WHERE clause), and
 * stock_stats_view is joined rather than read alone so the market filter on
 * market_tickers governs the result.
 *
 * RSI thresholds are the standard Wilder bands (>=70 overbought, <=30
 * oversold) — stated on the page, not invented, and applied to the daily RSI
 * that ~93% of EGX symbols carry.
 */
export type MarketListKey = 'gainers' | 'losers' | 'active' | 'oversold' | 'overbought' | 'volatile';

const _marketListsCached = unstable_cache(
    async (limit: number): Promise<Record<MarketListKey, Ticker[]>> => {
        const result = await db.query(
            `SELECT t.symbol, t.name_en, t.name_ar, t.last_price, t.change_percent, t.volume,
                    t.sector_name, t.market_cap, t.pe_ratio, t.pb_ratio, t.dividend_yield,
                    t.currency, t.isin, t.logo_url, t.last_updated,
                    s.rsi_14, s.beta_1y
             FROM market_tickers t
             LEFT JOIN stock_stats_view s ON s.symbol = t.symbol
             WHERE t.last_price IS NOT NULL
               AND t.${EGX_ONLY}
               AND COALESCE(t.sector_name,'') <> 'Index'
               AND NOT (t.symbol LIKE '%.CA' AND EXISTS (
                   SELECT 1 FROM market_tickers b
                   WHERE b.symbol = REPLACE(t.symbol, '.CA', '') AND b.last_price IS NOT NULL))`
        );
        const rows = result.rows.map((r: Record<string, unknown>) =>
            toNum(cleanName(r), [...TICKER_NUM, 'rsi_14', 'beta_1y'])
        ) as Array<Ticker & { rsi_14: number | null; beta_1y: number | null }>;

        const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
        const byDesc = <T,>(arr: T[], key: (x: T) => number | null) =>
            arr.filter((x) => finite(key(x))).sort((a, b) => (key(b) as number) - (key(a) as number));
        const byAsc = <T,>(arr: T[], key: (x: T) => number | null) =>
            arr.filter((x) => finite(key(x))).sort((a, b) => (key(a) as number) - (key(b) as number));

        // Volume needs a real trade behind it — a zero-volume line is not
        // "most active", it is a stale quote.
        const traded = rows.filter((r) => finite(r.volume) && (r.volume as number) > 0);

        return {
            gainers: byDesc(rows, (r) => r.change_percent).slice(0, limit),
            losers: byAsc(rows, (r) => r.change_percent).slice(0, limit),
            active: byDesc(traded, (r) => r.volume).slice(0, limit),
            oversold: byAsc(
                rows.filter((r) => finite(r.rsi_14) && (r.rsi_14 as number) <= 30),
                (r) => r.rsi_14
            ).slice(0, limit),
            overbought: byDesc(
                rows.filter((r) => finite(r.rsi_14) && (r.rsi_14 as number) >= 70),
                (r) => r.rsi_14
            ).slice(0, limit),
            volatile: byDesc(rows, (r) => r.beta_1y).slice(0, limit),
        };
    },
    ['seo:market-lists'],
    { revalidate: 300, tags: ['seo-tickers'] }
);

export const getMarketLists = cache((limit = 30): Promise<Record<MarketListKey, Ticker[]>> => _marketListsCached(limit));

/**
 * RECENT NEWS WINDOW for the topic hubs.
 *
 * Topic assignment reads `source_section`, which arrives percent-encoded and
 * carries Arabic path segments. Postgres has no URL-decode, so matching in SQL
 * would mean maintaining both the decoded and encoded form of every pattern —
 * two spellings of one rule, guaranteed to drift. Instead one cached query
 * returns a bounded recent window and the SAME topicOfArticle() the pages and
 * the sitemap use does the classification. Page and sitemap therefore cannot
 * disagree about which topic an article belongs to.
 *
 * The window is bounded deliberately: a topic hub is a current archive, not
 * the full 4,583-article history, which stays discoverable through the news
 * sitemap.
 */
const NEWS_WINDOW = 2500;

const _newsWindowCached = unstable_cache(
    async (): Promise<Array<Record<string, unknown>>> => {
        const result = await db.query(
            `SELECT id, headline, published_at, source_section, symbol, image_url,
                    left(article_body, 400) AS body_head
             FROM market_news
             ORDER BY published_at DESC
             LIMIT $1`,
            [NEWS_WINDOW]
        );
        // Publishable rows only: no off-market stories, one copy per headline.
        return primaryNewsRows(result.rows as Array<{ id: number; headline: string; symbol: string | null; body_head: string | null }>) as Array<Record<string, unknown>>;
    },
    ['seo:news-window'],
    { revalidate: 900, tags: ['seo-news'] }
);

export const getNewsWindow = cache((): Promise<Array<Record<string, unknown>>> => _newsWindowCached());

/**
 * FULL NAV SERIES for a fund, oldest → newest.
 *
 * The public API caps at 90 points; the stored series runs to ~4,300 and back
 * to 2009 (median 711 points, 78% of funds above 100). A NAV history page is
 * only worth publishing on the full series, so this reads nav_history directly
 * rather than going through the capped endpoint.
 */
export type NavPoint = { date: string; nav: number };

export const getFundNavHistory = cache(async (fundId: number): Promise<NavPoint[]> => {
    const result = await db.query(
        `SELECT date, nav FROM nav_history WHERE fund_id = $1 ORDER BY date ASC`,
        [fundId]
    );
    return (result.rows as Array<Record<string, unknown>>)
        .map((r) => {
            const d = r.date instanceof Date ? r.date : new Date(String(r.date));
            const nav = Number(r.nav);
            if (Number.isNaN(d.getTime()) || !Number.isFinite(nav) || nav <= 0) return null;
            // Local components, not toISOString: a pg DATE arrives at local
            // midnight and UTC conversion shifts it a day.
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return { date: iso, nav };
        })
        .filter((p): p is NavPoint => p !== null);
});

/** All companies for the /companies directory hub. */
// Cross-request data cache (5 min) for the full ticker list — the hottest read
// path (powers /companies, every /markets ranking page, the egx30 constituents
// and sector peers). These hub routes are force-dynamic, so before this each
// crawl/visit re-queried the DB; unstable_cache collapses that to one query per
// 5-minute window. React.cache() below still dedups within a single request.
// Prices refresh ~15 min upstream and every page shows an as-of stamp, so
// up-to-5-min data staleness is safe for SEO.
const _allTickersCached = unstable_cache(
    async (): Promise<Ticker[]> => {
        const result = await db.query(
            `SELECT symbol, name_en, name_ar, last_price, change_percent, volume,
                    sector_name, market_cap, pe_ratio, pb_ratio, dividend_yield,
                    currency, isin, logo_url, last_updated
             FROM market_tickers t
             WHERE last_price IS NOT NULL
               AND ${EGX_ONLY}
               AND COALESCE(sector_name,'') <> 'Index' -- EGX30 is an index, not a listed company
               -- .CA duplicate listings: keep only the primary ticker when both exist
               AND NOT (t.symbol LIKE '%.CA' AND EXISTS (
                   SELECT 1 FROM market_tickers b
                   WHERE b.symbol = REPLACE(t.symbol, '.CA', '') AND b.last_price IS NOT NULL))
             ORDER BY market_cap::numeric DESC NULLS LAST`
        );
        return result.rows.map((r: Record<string, unknown>) => toNum(cleanName(r), TICKER_NUM)) as Ticker[];
    },
    ['seo:all-tickers'],
    { revalidate: 300, tags: ['seo-tickers'] }
);
export const getAllTickers = cache((): Promise<Ticker[]> => _allTickersCached());

// ─────────────────────────────────────────────────────────────────────────────
// Seasonality (monthly return profile), computed from our own ohlc_data.
//
// ONE implementation, shared by /api/v1/egx/seasonals/[symbol] and the
// /symbol/[id]/seasonality pages. Two copies of one computation is the exact
// failure mode that shipped 404ing provider hubs (getAllFundsRanked vs. the
// sitemap's private query), so the route delegates here rather than repeating
// the SQL.
//
// Method (matches the convention TradingView uses for monthly seasonals):
//   1. month_close = last close of each calendar month
//   2. monthly return = (close - prev_month_close) / prev_month_close
//   3. group by calendar month: mean return, positive rate, N observations
export type SeasonalMonth = {
    month: number;          // 1..12
    label: string;          // 'Jan'
    avgReturn: number | null;
    positiveRate: number | null;
    years: number;
};
export type Seasonality = {
    symbol: string;
    windowYears: number;    // 0 = all history
    yearsCovered: number;
    available: boolean;
    months: SeasonalMonth[];
};

const SEASONAL_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const _seasonalityCached = unstable_cache(
    async (symbol: string, windowYears: number): Promise<Seasonality> => {
        const sym = symbol.toUpperCase().replace('.CA', '');
        // windowYears is already coerced to a non-negative integer by the
        // exported wrapper; re-assert here because this string is interpolated.
        const w = Number.isSafeInteger(windowYears) && windowYears > 0 ? windowYears : 0;
        const dateFilter = w > 0
            ? `AND date::date >= (CURRENT_DATE - INTERVAL '${w} years')`
            : '';

        const result = await db.query(
            `WITH monthly AS (
                 SELECT date_trunc('month', date::date) AS m,
                        (array_agg(close ORDER BY date DESC))[1] AS month_close
                 FROM ohlc_data
                 WHERE (symbol = $1 OR symbol = $2) AND close > 0 ${dateFilter}
                 GROUP BY 1
             ),
             ret AS (
                 SELECT m, month_close, LAG(month_close) OVER (ORDER BY m) AS prev_close
                 FROM monthly
             )
             SELECT EXTRACT(MONTH FROM m)::int AS month,
                    ROUND(AVG((month_close - prev_close) / prev_close * 100)::numeric, 2) AS avg_return,
                    ROUND((AVG(CASE WHEN month_close > prev_close THEN 1.0 ELSE 0.0 END) * 100)::numeric, 0) AS positive_rate,
                    COUNT(*) AS years
             FROM ret
             WHERE prev_close IS NOT NULL AND prev_close > 0
             GROUP BY 1
             ORDER BY 1`,
            [sym, `${sym}.CA`]
        );

        const byMonth = new Map<number, Record<string, unknown>>();
        for (const r of result.rows as Array<Record<string, unknown>>) {
            byMonth.set(Number(r.month), r);
        }

        const months: SeasonalMonth[] = SEASONAL_LABELS.map((label, i) => {
            const r = byMonth.get(i + 1);
            return {
                month: i + 1,
                label,
                avgReturn: r ? Number(r.avg_return) : null,
                positiveRate: r ? Number(r.positive_rate) : null,
                years: r ? Number(r.years) : 0,
            };
        });

        const withData = months.filter((m) => m.avgReturn != null);
        const yearsCovered = months.reduce((mx, m) => Math.max(mx, m.years), 0);

        return {
            symbol: sym,
            windowYears: w,
            yearsCovered,
            available: withData.length >= 6 && yearsCovered >= 2,
            months,
        };
    },
    ['seo:seasonality'],
    // Monthly closes only change once a month; 6h is plenty fresh and keeps
    // this 318-symbol computation off the DB on every crawl.
    { revalidate: 21600, tags: ['seo-seasonality'] }
);

export const getSeasonality = cache(
    (symbol: string, windowYears = 10): Promise<Seasonality> => {
        const w = Number.isFinite(windowYears) && windowYears > 0 ? Math.floor(windowYears) : 0;
        return _seasonalityCached(symbol, w);
    }
);

/**
 * Page-worthiness gate. A seasonality page is only honest with enough
 * observations behind each monthly average — 5 years is the floor we publish
 * at, and it is the SAME predicate the sitemap uses, so we never link a page
 * that renders "not enough history".
 */
export const SEASONALITY_MIN_YEARS = 5;
export function seasonalityIsPublishable(s: Seasonality | null | undefined): boolean {
    return !!s && s.available && s.yearsCovered >= SEASONALITY_MIN_YEARS;
}

/**
 * The set of EGX symbols whose seasonality page is worth publishing — ONE
 * query for all of them, not a per-symbol probe.
 *
 * Every company page renders a sibling tab strip, so if seasonality were an
 * unconditional tab all 318 symbols would link to it and the ~126 without
 * enough history would answer 404. Pages ask this set instead. The sitemap
 * uses the SAME set, so we can never link or submit a URL that renders
 * "not enough history".
 *
 * Predicate matches seasonalityIsPublishable(): >= 6 calendar months with data
 * and >= SEASONALITY_MIN_YEARS observations in the deepest month.
 */
const _seasonalitySymbolsCached = unstable_cache(
    async (): Promise<string[]> => {
        const result = await db.query(
            `WITH monthly AS (
                 SELECT regexp_replace(symbol, '\\.CA$', '') AS sym,
                        date_trunc('month', date::date) AS m,
                        (array_agg(close ORDER BY date DESC))[1] AS month_close
                 FROM ohlc_data
                 WHERE close > 0 AND date::date >= (CURRENT_DATE - INTERVAL '10 years')
                 GROUP BY 1, 2
             ),
             ret AS (
                 SELECT sym, m, month_close,
                        LAG(month_close) OVER (PARTITION BY sym ORDER BY m) AS prev_close
                 FROM monthly
             ),
             per_month AS (
                 SELECT sym, EXTRACT(MONTH FROM m)::int AS month, COUNT(*) AS years
                 FROM ret
                 WHERE prev_close IS NOT NULL AND prev_close > 0
                 GROUP BY 1, 2
             ),
             eligible AS (
                 SELECT sym FROM per_month
                 GROUP BY sym
                 HAVING COUNT(*) >= 6 AND MAX(years) >= ${SEASONALITY_MIN_YEARS}
             )
             SELECT e.sym FROM eligible e
             JOIN market_tickers mt ON mt.symbol = e.sym
             WHERE ${EGX_ONLY}
             ORDER BY e.sym`
        );
        return (result.rows as Array<Record<string, unknown>>).map((r) => String(r.sym).toUpperCase());
    },
    ['seo:seasonality-symbols'],
    { revalidate: 21600, tags: ['seo-seasonality'] }
);

export const getSeasonalitySymbols = cache(
    async (): Promise<Set<string>> => new Set(await _seasonalitySymbolsCached())
);
