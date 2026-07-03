import { cache } from 'react';
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

export const getFund = cache(async (fundId: number): Promise<Fund | null> => {
    const result = await db.query(`SELECT * FROM funds_view WHERE fund_id = $1`, [fundId]);
    const row = result.rows[0] as Fund | undefined;
    if (!row) return null;
    // Canonical NAV = live value derived from nav_history (see /api/v1/funds/[id]).
    row.latest_nav = (row.live_latest_nav as number | null) ?? (Number(row.latest_nav) || null);
    toNum(row, [
        'latest_nav', 'return_ytd', 'return_1m', 'return_3m', 'return_1y', 'return_3y', 'return_5y',
        'expense_ratio', 'fee_management', 'fee_subscription', 'fee_redemption',
        'nav_52w_high', 'nav_52w_low', 'aum', 'min_subscription', 'par_value',
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
export const getSectors = cache(async (): Promise<Array<{ sector_name: string; companies: number; market_cap: number | null }>> => {
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
});

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
    return {
        upcoming: up.rows.map((r: Record<string, unknown>) => toNum(r, ['amount_upcoming', 'ex_date_upcoming', 'payment_date_upcoming'])),
        recent: rec.rows.map((r: Record<string, unknown>) => toNum(r, ['dividend_amount'])),
    };
});

/** All funds with the fields the rankings/comparison pages need. */
export const getAllFundsRanked = cache(async (): Promise<Array<Record<string, unknown>>> => {
    const result = await db.query(
        `SELECT fund_id, fund_name, fund_name_en, fund_type, fund_type_en,
                classification_en, issuer_en, manager_name_en, currency, is_shariah,
                latest_nav, live_latest_nav, last_nav_date,
                return_ytd, return_1m, return_3m, return_1y, return_3y, return_5y,
                expense_ratio, fee_management, min_subscription, inception_date, risk_level_en
         FROM funds_view
         WHERE fund_id::text ~ '^[0-9]+$'
         ORDER BY return_1y DESC NULLS LAST`
    );
    return result.rows.map((r: Record<string, unknown>) => {
        r.latest_nav = (r.live_latest_nav as number | null) ?? r.latest_nav;
        return toNum(r, ['latest_nav', 'return_ytd', 'return_1m', 'return_3m', 'return_1y', 'return_3y', 'return_5y', 'expense_ratio', 'fee_management', 'min_subscription']);
    });
});

/** All companies for the /companies directory hub. */
export const getAllTickers = cache(async (): Promise<Ticker[]> => {
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
});
