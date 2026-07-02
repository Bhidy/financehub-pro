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
    return (toNum(result.rows[0] || null, TICKER_NUM) as Ticker) || null;
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
    return result.rows.map((r: Record<string, unknown>) => toNum(r, TICKER_NUM)) as Ticker[];
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

/** All companies for the /companies directory hub. */
export const getAllTickers = cache(async (): Promise<Ticker[]> => {
    const result = await db.query(
        `SELECT symbol, name_en, name_ar, last_price, change_percent, volume,
                sector_name, market_cap, pe_ratio, pb_ratio, dividend_yield,
                currency, isin, logo_url, last_updated
         FROM market_tickers
         WHERE last_price IS NOT NULL
         ORDER BY market_cap::numeric DESC NULLS LAST`
    );
    return result.rows.map((r: Record<string, unknown>) => toNum(r, TICKER_NUM)) as Ticker[];
});
