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
 * DORMANT FUNDS — the universe of CURRENT funds excludes them.
 *
 * Found 2026-09-05 on the live price list: eight funds whose newest NAV was
 * over 90 days old, five of them over a year — one last priced in March 2011,
 * two target-maturity funds that matured in late 2025 — all listed under
 * "prices today", ranked, counted in category and provider statistics, and
 * pre-rendered into the marketplace for crawlers while the client-side
 * marketplace (fed by the API, which drops them) showed 200 funds. A closed or
 * matured fund is real history and keeps its own page, with a dormancy notice;
 * it is not a current price.
 *
 * 180 days: 54 funds publish weekly, so this is 25+ missed publications — far
 * beyond any holiday, and beyond the source freeze the EIMA backfill covers.
 */
export const DORMANT_DAYS = 180;
export function navAgeDays(lastNavDate: unknown, now = Date.now()): number | null {
    const t = lastNavDate ? Date.parse(String(lastNavDate)) : NaN;
    return Number.isFinite(t) ? Math.floor((now - t) / 86_400_000) : null;
}
export function fundIsDormant(lastNavDate: unknown, now = Date.now()): boolean {
    const age = navAgeDays(lastNavDate, now);
    return age !== null && age > DORMANT_DAYS;
}

/**
 * THE CURRENT-FUND UNIVERSE — one rule, shared by the server pre-render
 * (getAllFundsRanked) and the marketplace's own list API (/api/v1/funds).
 *
 * Until 2026-09-05 the two had different gates (the API hid a fund after 30
 * days without a NAV and demanded 10 NAV points; the pre-render used the
 * 180-day dormancy rule and no point minimum), so a crawler was served 207
 * funds while the visitor's marketplace showed 200 — a hybrid render is only
 * honest when both halves describe the same set. A fund is CURRENT when its
 * manager has published a NAV within DORMANT_DAYS and we hold at least
 * MIN_NAV_POINTS of them: a single scraped point is a stub, not a history.
 */
export const MIN_NAV_POINTS = 2;
export function fundIsCurrent(row: { last_nav_date?: unknown; nav_points?: unknown }, now = Date.now()): boolean {
    if (fundIsDormant(row.last_nav_date, now)) return false;
    const pts = row.nav_points === null || row.nav_points === undefined ? null : Number(row.nav_points);
    // A view row without a point count is not judged on it (the count is a
    // derived column that can legitimately be absent on older rows).
    return pts === null || !Number.isFinite(pts) || pts >= MIN_NAV_POINTS;
}

/**
 * DENOMINATION. funds_view stores 'EGP' on every row — including the 15
 * funds whose registered name says USD or EUR (Banque Misr Youm B Youm USD,
 * Beltone Fixed Income Fund Issuance 1 USD, Maksab OZ Fixed Income Fund 2
 * EURO …). Printing "100.45 EGP" on a dollar fund is a misleading financial
 * figure. The backend derives currency from the name for NEW rows
 * (funds_list_api_sync._derive_currency); this is the same rule for the rows
 * already stored, applied wherever a NAV is shown. An explicit non-EGP stored
 * currency always wins; the name is consulted only when the store says EGP.
 */
const CURRENCY_MARKERS: Array<[string, RegExp]> = [
    ['USD', /\b(usd|dollar|dollars)\b|دولار/i],
    ['EUR', /\b(eur|euro|euros)\b|يورو/i],
    ['SAR', /\b(sar|riyal)\b|ريال/i],
    ['AED', /\b(aed|dirham)\b|درهم/i],
    ['GBP', /\b(gbp|sterling)\b|استرليني|إسترليني/i],
];
export function fundCurrency(row: { currency?: unknown; fund_name?: unknown; fund_name_en?: unknown }): string {
    const stored = typeof row.currency === 'string' ? row.currency.trim().toUpperCase() : '';
    if (stored && stored !== 'EGP') return stored;
    const hay = `${typeof row.fund_name_en === 'string' ? row.fund_name_en : ''} ${typeof row.fund_name === 'string' ? row.fund_name : ''}`;
    for (const [code, re] of CURRENCY_MARKERS) if (re.test(hay)) return code;
    return 'EGP';
}

/**
 * RANKING ELIGIBILITY — deterministic, and every exclusion has a reason.
 *
 * The "best funds" tables rank by trailing 12-month return. That figure is
 * AUTHORITATIVE only when the audited engine (fund_metrics.py, recomputed
 * daily from nav_history) produced it: a window return whose anchor NAV sits
 * further than 10% of the window from the reference date is NULL, and a series
 * flagged `analytics_suppressed` (a redenomination artefact the cleaner could
 * not repair) is not ranked even if a number exists. Until 2026-09-05 the
 * ranking read a legacy column family instead, which disagreed with the fund's
 * own profile on 96 of 114 funds (fund 2734: 93.81% ranked vs 81.50% on its
 * page) and carried −85…−98% artefacts on eight bank funds.
 */
export type RankingReason = 'ranked' | 'no_history' | 'history_lt_1y' | 'series_gap' | 'suppressed';
export type RankingEligibility = { eligible: boolean; reason: RankingReason };
export function rankingEligibility(row: {
    return_1y?: unknown;
    returns_source?: unknown;
    analytics_suppressed?: unknown;
    inception_years?: unknown;
    metrics_points?: unknown;
}): RankingEligibility {
    const suppressed = row.analytics_suppressed === true || row.analytics_suppressed === 't' || row.analytics_suppressed === 'true';
    if (row.returns_source !== 'computed') return { eligible: false, reason: 'no_history' };
    if (suppressed) return { eligible: false, reason: 'suppressed' };
    const r1y = typeof row.return_1y === 'number' && Number.isFinite(row.return_1y) ? row.return_1y : null;
    if (r1y !== null) return { eligible: true, reason: 'ranked' };
    const years = typeof row.inception_years === 'number' ? row.inception_years : Number(row.inception_years);
    if (!Number.isFinite(years) || years < 1) return { eligible: false, reason: 'history_lt_1y' };
    return { eligible: false, reason: 'series_gap' };
}
export const RANKING_REASON_LABELS: Record<RankingReason, { en: string; ar: string }> = {
    ranked: { en: 'ranked', ar: 'مُرتَّب' },
    no_history: { en: 'no computed NAV history yet', ar: 'لا يوجد سجل محسوب لصافي قيمة الأصول بعد' },
    history_lt_1y: { en: 'less than 12 months of NAV history', ar: 'سجل صافي قيمة الأصول أقل من 12 شهرًا' },
    series_gap: { en: 'no NAV published near the 12-month anchor date', ar: 'لا يوجد إفصاح قريب من تاريخ الإسناد قبل 12 شهرًا' },
    suppressed: { en: 'NAV series carries a data artefact (returns shown on the fund page, not ranked)', ar: 'سلسلة صافي قيمة الأصول تحمل خللًا في البيانات (تُعرض العوائد على صفحة الصندوق ولا تُرتَّب)' },
};

/**
 * STALE QUOTES. A listed company whose last quote is weeks old (TradingView
 * dropped the line, or it stopped trading) was still shown on /companies and
 * the market screens with that price and a day change — a 3-month-old price
 * presented as "live". Beyond QUOTE_STALE_DAYS the quote is unknown, not
 * current: price fields render as unknown and the row is not ranked by
 * price movement. 14 days clears every EGX holiday closure (Eid runs up to
 * nine calendar days with the surrounding weekends).
 */
export const QUOTE_STALE_DAYS = 14;
export function quoteIsStale(lastUpdated: unknown, now = Date.now()): boolean {
    const t = lastUpdated ? Date.parse(String(lastUpdated)) : NaN;
    return Number.isFinite(t) && now - t > QUOTE_STALE_DAYS * 86_400_000;
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
    !r.analytics_suppressed &&
    r.volatility_annual !== null &&
    r.max_drawdown !== null &&
    (r.points ?? 0) >= MIN_RISK_POINTS &&
    // a dormant fund's risk figures describe a series that stopped — not a
    // current fund; the page drops it via the funds join, the sitemap via this
    !fundIsDormant(r.latest_date);
