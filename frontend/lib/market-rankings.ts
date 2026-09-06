import type { Ticker } from '@/lib/public-data';

/**
 * THE RANKED MARKET SCREENS — one definition per ranking.
 *
 * /markets/largest-companies, /markets/top-dividend-yield and
 * /markets/lowest-pe-stocks each carried their own copy of the filter, the sort
 * and the 50-row cut, and each Arabic twin carried a fourth and fifth and sixth.
 * Six copies of three rules. The market-data hub (/markets) now states each
 * ranking's leader on the hub itself, which turns that duplication from untidy
 * into dangerous: the moment one copy drifts, the hub advertises a leader the
 * page it links to does not show — the cross-surface metric drift this codebase
 * treats as a Critical data defect.
 *
 * So the rule lives here once and every surface asks for it.
 */

/** Rows shown per ranked screen. The hub reads the same list it links to. */
export const RANK_LIMIT = 50;

/**
 * A yield above this is a data artifact, not a repeatable payout — a special or
 * return-of-capital distribution, or a stale price/units mismatch. Audit
 * 2026-07-04 found SAIB reporting 761% and SEIGA 215%. Publishing those as
 * "highest dividend yield" would discredit the ranking and its ItemList.
 */
export const MAX_PLAUSIBLE_YIELD = 100;

const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;

/** Largest listed companies, by market capitalisation, descending. */
export function rankByMarketCap(all: Ticker[]): Ticker[] {
    return all
        .filter((t) => (num(t.market_cap) ?? 0) > 0)
        .sort((a, b) => (b.market_cap as number) - (a.market_cap as number))
        .slice(0, RANK_LIMIT);
}

/** Highest dividend yield, descending, with the implausible-yield guard. */
export function rankByDividendYield(all: Ticker[]): Ticker[] {
    return all
        .filter((t) => {
            const y = num(t.dividend_yield);
            return y !== null && y > 0 && y <= MAX_PLAUSIBLE_YIELD;
        })
        .sort((a, b) => (b.dividend_yield as number) - (a.dividend_yield as number))
        .slice(0, RANK_LIMIT);
}

/** Lowest trailing P/E, ascending. Loss-makers have no meaningful multiple. */
export function rankByLowestPe(all: Ticker[]): Ticker[] {
    return all
        .filter((t) => (num(t.pe_ratio) ?? 0) > 0)
        .sort((a, b) => (a.pe_ratio as number) - (b.pe_ratio as number))
        .slice(0, RANK_LIMIT);
}

/** Newest `last_updated` in a ranked set — the figures' own as-of stamp. */
export function rankedAsOf(rows: Ticker[]): string | null {
    return rows.reduce<string | null>(
        (mx, t) => (t.last_updated && (!mx || new Date(t.last_updated) > new Date(mx)) ? t.last_updated : mx),
        null,
    );
}
