import { ltrNum } from '@/lib/bidi';
import type { FundRiskRow } from '@/lib/public-data';

/**
 * Small, shared arithmetic + formatting for the fund league tables
 * (/Funds/providers, /Funds/categories, /Funds/risk). Kept in one module so a
 * "median" or a signed percentage means the same thing on every table, and so
 * the bidi guard (ltrNum) is applied in exactly one place.
 */

export type Row = Record<string, unknown>;

export const num = (r: Row, k: string): number | null =>
    typeof r[k] === 'number' && Number.isFinite(r[k] as number) ? (r[k] as number) : null;
export const str = (r: Row, k: string): string | null =>
    typeof r[k] === 'string' && (r[k] as string).trim() ? (r[k] as string).trim() : null;

/** Median of the finite values; null when there are none. Medians, not means,
 *  because one fund with a redenomination artefact would drag a mean. */
export function median(values: Array<number | null>): number | null {
    const v = values.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
    if (!v.length) return null;
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** A signed percentage, bidi-isolated so the sign stays on the left in Arabic. */
export const pctSigned = (v: number | null): string => (v === null ? '—' : ltrNum(`${v >= 0 ? '+' : ''}${v.toFixed(2)}%`));
/** An unsigned percentage (fees, volatility), bidi-isolated. */
export const pct = (v: number | null): string => (v === null ? '—' : ltrNum(`${v.toFixed(2)}%`));

export function dayOf(v: unknown, lang: 'en' | 'ar'): { iso: string; human: string } {
    const t = v ? Date.parse(String(v)) : NaN;
    if (!Number.isFinite(t)) return { iso: '', human: '—' };
    const d = new Date(t);
    return {
        iso: d.toISOString().slice(0, 10),
        human: d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    };
}

/**
 * RISK LEAGUE TABLE ELIGIBILITY — shared by the page and the sitemap so the
 * two can never disagree about whether the page exists.
 *
 *  - not `analytics_suppressed`: the backend flags cash-fund redenomination
 *    artefacts there; ranking one would publish a false extreme
 *  - volatility AND drawdown present: both are computed from the same clean
 *    series, so one without the other means the series failed a guard
 *  - at least 30 observations: fewer is a sketch of a series, not a history
 */
export const MIN_RISK_POINTS = 30;
export const MIN_RISK_ROWS = 10;
export const riskEligible = (r: FundRiskRow): boolean =>
    !r.analytics_suppressed && r.volatility_annual !== null && r.max_drawdown !== null && (r.points ?? 0) >= MIN_RISK_POINTS;
