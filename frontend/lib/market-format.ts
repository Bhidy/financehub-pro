import { ltrNum } from './bidi';

/**
 * HOW A QUOTED FIGURE IS PRINTED — one definition for every public market table.
 *
 * WHY: a price column has to be read DOWN, and a column that reads
 *
 *     136.05
 *     127.1
 *      57
 *      90.2
 *
 * cannot be. On /ar/companies alone, 92 of 259 price cells (36%) carried
 * fewer than two decimals, because fourteen listing surfaces each wrote
 * `toLocaleString('en-EG', { maximumFractionDigits: 2 })` — which SHORTENS
 * 57.00 to "57" and 127.10 to "127.1" — while three surfaces (both EGX 30
 * tables and the stock-comparison page) set `minimumFractionDigits` too and
 * printed the column correctly. The right behaviour already existed; it was
 * just not shared, so every new table drifted back to the wrong one.
 *
 * Two decimals, always: that is how the Egyptian Exchange quotes, how the
 * three correct surfaces already print, and what makes a column scannable.
 *
 * Every helper here returns an LTR-isolated string. Latin digits inside Arabic
 * RTL prose reorder without it — the defect that once printed "-2.55%" as
 * "2.55%-" on Arabic pages (lib/bidi.ts).
 */

/** Digits grouped, always exactly `decimals` places. Never "57" next to "136.05". */
export function fixed(value: number, decimals = 2): string {
    return value.toLocaleString('en-EG', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/**
 * A quoted price, or the honest dash. A currency is appended only when it is
 * not the page's implicit EGP, matching what the listing tables already do.
 */
export function quotedPrice(
    value: number | null | undefined,
    currency?: string | null,
    decimals = 2
): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    const suffix = currency && currency.toUpperCase() !== 'EGP' ? ` ${currency}` : '';
    return ltrNum(`${fixed(value, decimals)}${suffix}`);
}

/**
 * A percentage change, or the honest dash. `sign` prints a leading "+" on
 * non-negative values — the convention every change column on the site uses.
 */
export function percentChange(
    value: number | null | undefined,
    { sign = true, decimals = 2 }: { sign?: boolean; decimals?: number } = {}
): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    const lead = sign && value >= 0 ? '+' : '';
    return ltrNum(`${lead}${fixed(value, decimals)}%`);
}

/** A plain ratio or multiple (P/E, P/B). Same two-decimal discipline, no unit. */
export function quotedRatio(value: number | null | undefined, decimals = 2): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    return ltrNum(fixed(value, decimals));
}
