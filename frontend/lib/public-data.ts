import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db-server';

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
    const result = await db.query(
        `SELECT id, symbol, headline, url, published_at, article_body,
                image_url, source_section, source_country
         FROM market_news ORDER BY published_at DESC LIMIT $1`,
        [limit]
    );
    return result.rows as NewsArticle[];
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
         FROM market_tickers WHERE symbol = $1`,
        [symbol.toUpperCase()]
    );
    const row = result.rows[0] ? cleanName(result.rows[0]) : null;
    return (toNum(row, TICKER_NUM) as Ticker) || null;
});

/** Key statistics (stock_stats_view — already absolute EGP). */
export const getStats = cache(async (symbol: string): Promise<Record<string, number | string | null> | null> => {
    const result = await db.query(`SELECT * FROM stock_stats_view WHERE symbol = $1`, [symbol.toUpperCase()]);
    const row = result.rows[0] || null;
    return row
        ? (toNum(row, [
              'last_price', 'pe_ratio', 'forward_pe', 'pb_ratio', 'dividend_yield', 'market_cap',
              'beta_1y', 'rsi_14', 'ma_50d', 'ma_200d', 'eps_ttm', 'revenue_ttm', 'net_income_ttm',
              'roe', 'roa', 'bvps', 'shares_outstanding', 'dps',
          ]) as Record<string, number | string | null>)
        : null;
});

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

/**
 * Normalised, order-independent token key for an asset-manager name, used to
 * match a fund's manager to a harvested asset_managers row WITHOUT false
 * positives. Arabic diacritics/alef/ta-marbuta are normalised and the common
 * "…for asset management / صناديق الاستثمار / لإدارة الأصول" boilerplate is
 * dropped, leaving only the distinctive house tokens (e.g. "فاروس" vs
 * "اتون فاروس" — which stay distinct, so Aton Pharos never matches Pharos).
 */
const MGR_STOP = new Set([
    'لاداره', 'لادارة', 'لإدارة', 'لادار', 'واداره', 'وادارة', 'وإدارة', 'لتكوين', 'لاداره',
    'الاصول', 'الأصول', 'الاستثمارات', 'الاستثمار', 'صناديق', 'الماليه', 'المالية', 'المحافظ',
    'القابضه', 'القابضة', 'شركه', 'شركة', 'مصر', 'ايجيبت', 'الاوراق', 'للاستثمارات', 'للاستثمار',
    'asset', 'management', 'capital', 'for', 'investment', 'investments', 'securities', 'holding',
    'company', 'and', 'funds', 'fund', 'the', 'egypt',
]);
function mgrTokenKey(name: string | null): string | null {
    if (!name || !name.trim()) return null;
    const x = name
        .toLowerCase()
        .replace(/[ً-ْٰ]/g, '') // Arabic diacritics
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه');
    const toks = x
        .split(/[^a-z0-9؀-ۿ]+/)
        .filter((w) => w.length > 1 && !MGR_STOP.has(w));
    return toks.length ? Array.from(new Set(toks)).sort().join(' ') : null;
}

export const getFund = cache(async (fundId: number): Promise<Fund | null> => {
    const result = await db.query(`SELECT * FROM funds_view WHERE fund_id = $1`, [fundId]);
    const row = result.rows[0] as Fund | undefined;
    if (!row) return null;
    // Canonical NAV = live value derived from nav_history (see /api/v1/funds/[id]).
    row.latest_nav = (row.live_latest_nav as number | null) ?? (Number(row.latest_nav) || null);
    coalesceReturns(row);
    // Merge computed risk metrics (fund_risk_metrics side table). Isolated in
    // try/catch so a missing table can never break the page. Advanced metrics the
    // view lacks (max_drawdown, volatility_annual) always come from here; returns
    // and 52w fill ONLY gaps — never override a value funds_view already carries.
    try {
        const rm = await db.query(`SELECT * FROM fund_risk_metrics WHERE fund_id = $1`, [String(fundId)]);
        const m = rm.rows[0] as Record<string, unknown> | undefined;
        if (m) {
            row.max_drawdown = m.max_drawdown;
            row.volatility_annual = m.volatility_annual;
            for (const k of ['nav_52w_high', 'nav_52w_low', 'return_1m', 'return_3m',
                'return_ytd', 'return_1y', 'return_3y', 'return_5y']) {
                if (row[k] === null || row[k] === undefined) row[k] = m[k];
            }
        }
    } catch { /* side table isolated — never break the core payload */ }
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
    // Asset-manager profile (23 harvested houses, Arabic-named; no FK). Match by
    // NORMALISED TOKEN-SET EQUALITY, not substring — a loose "%فاروس%" would wrongly
    // attach "أتون فاروس" (Aton Pharos, a different house) to a Pharos fund, i.e.
    // misleading financial data. Token-set equality accepts only the same house.
    // Isolated: a missing table / no match never breaks the page.
    try {
        const targets = [row.manager_name, row.manager_name_en, row.owner_name, row.owner_name_en]
            .map((n) => mgrTokenKey(n as string | null))
            .filter((k): k is string => !!k);
        if (targets.length) {
            const all = await db.query(
                `SELECT name, name_en, establishment_year, chairman, capital, total_aum, fund_count, logo_url FROM asset_managers`);
            const match = (all.rows as Record<string, unknown>[]).find((r) => {
                const keys = [mgrTokenKey(r.name as string | null), mgrTokenKey(r.name_en as string | null)].filter(Boolean);
                return keys.some((k) => targets.includes(k as string));
            });
            if (match) row.manager_profile = match;
        }
    } catch { /* isolated */ }
    toNum(row, [
        'latest_nav', 'return_ytd', 'return_1m', 'return_3m', 'return_1y', 'return_3y', 'return_5y',
        'expense_ratio', 'fee_management', 'fee_subscription', 'fee_redemption',
        'nav_52w_high', 'nav_52w_low', 'aum', 'aum_millions', 'min_subscription', 'par_value',
        'max_drawdown', 'volatility_annual',
    ]);
    return row;
});

export const getFundPeers = cache(async (fundId: number): Promise<Array<Record<string, unknown>>> => {
    try {
        const result = await db.query(
            `SELECT p.*, f.fund_name AS peer_fund_name, f.fund_name_en AS peer_fund_name_en
             FROM fund_peers p
             LEFT JOIN funds_view f ON f.fund_id = p.peer_fund_id
             WHERE p.fund_id = $1 ORDER BY p.peer_rank LIMIT 6`,
            [fundId]
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
        [symbol.toUpperCase(), limit]
    );
    return result.rows as NewsArticle[];
});

/** All-time price range + row count for the history page summary. */
export const getHistoryStats = cache(async (symbol: string): Promise<Record<string, unknown> | null> => {
    const result = await db.query(
        `SELECT COUNT(*)::int AS rows, MIN(date) AS first_date, MAX(date) AS last_date,
                MIN(low) AS all_time_low, MAX(high) AS all_time_high
         FROM ohlc_data WHERE UPPER(symbol) = $1`,
        [symbol.toUpperCase()]
    );
    const row = result.rows[0] || null;
    if (!row || !row.rows) return null;
    return toNum(row, ['rows', 'all_time_low', 'all_time_high']);
});

/** Sector list with counts + aggregate market cap (for /sectors hubs). */
// Sector aggregates change slowly (membership + summed caps) and power the
// /sectors hubs — cache cross-request for 5 min, same rationale as the ticker list.
const _sectorsCached = unstable_cache(
    async (): Promise<Array<{ sector_name: string; companies: number; market_cap: number | null }>> => {
        const result = await db.query(
            `SELECT sector_name, COUNT(*)::int AS companies, SUM(market_cap::numeric) AS market_cap
             FROM market_tickers
             WHERE last_price IS NOT NULL AND sector_name IS NOT NULL AND sector_name <> ''
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
        db.query(`SELECT ${cols} FROM market_tickers WHERE last_price IS NOT NULL AND change_percent IS NOT NULL AND COALESCE(sector_name,'') <> 'Index' ORDER BY change_percent::numeric DESC LIMIT $1`, [limit]),
        db.query(`SELECT ${cols} FROM market_tickers WHERE last_price IS NOT NULL AND change_percent IS NOT NULL AND COALESCE(sector_name,'') <> 'Index' ORDER BY change_percent::numeric ASC LIMIT $1`, [limit]),
        db.query(`SELECT ${cols} FROM market_tickers WHERE last_price IS NOT NULL AND COALESCE(sector_name,'') <> 'Index' ORDER BY volume::numeric DESC NULLS LAST LIMIT $1`, [limit]),
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
export const getAllFundsRanked = cache(async (): Promise<Array<Record<string, unknown>>> => {
    const result = await db.query(
        `SELECT fund_id, fund_name, fund_name_en, fund_type, fund_type_en,
                classification_en, issuer_en, manager_name_en, currency, is_shariah,
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
    return rows;
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
