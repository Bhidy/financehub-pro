import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';
import { DORMANT_DAYS, MIN_NAV_POINTS, fundCurrency } from '@/lib/fund-stats';
import { fundTypeSlug } from '@/content/fund-categories';
import { applyReturnHierarchy } from '@/lib/public-data';

/**
 * THE MARKETPLACE LIST — what the visitor's /Funds page (and the mobile app)
 * render. Three rules here are shared with the server pre-render, on purpose:
 *
 *  · UNIVERSE: a fund is current when it published a NAV within DORMANT_DAYS
 *    and we hold ≥ MIN_NAV_POINTS of them (lib/fund-stats.ts). This route used
 *    a 30-day / 10-point gate while the pre-render used 180 days, so a crawler
 *    was served 207 funds and the visitor saw 200 (audit 2026-09-05).
 *  · RETURNS: fund_risk_metrics is authoritative when a computed row exists
 *    (applyReturnHierarchy) — the legacy aliases the shell reads
 *    (`returns_1y`, `one_year_return`, …) are overwritten with the computed
 *    value, so a card here and the fund's own page show ONE number.
 *  · DENOMINATION / TYPE: fundCurrency() and fundTypeSlug() — the stored
 *    currency is 'EGP' on USD funds and the disclosed type is missing on half
 *    the universe; the name carries both, by the same rule everywhere.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market');
    const idsParam = searchParams.get('ids');
    const ids = idsParam
        ? idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4)
        : [];

    try {
        const params: string[] = [];
        let p = 1;

        let whereClause = `
            f.fund_name_en NOT IN ('3 Years', '5 Years', '7 Years', '10 Years', '15 Years')
            AND f.fund_name_en NOT LIKE '%Years%'
            AND f.fund_name_en IS NOT NULL
            AND f.fund_name_en != ''
        `;

        if (market) {
            whereClause += ` AND f.market_code = $${p++}`;
            params.push(market);
        }

        if (ids.length > 0) {
            // Compare page: return the exact requested funds regardless of NAV status
            const placeholders = ids.map(() => `$${p++}`).join(', ');
            whereClause += ` AND CAST(f.fund_id AS TEXT) IN (${placeholders})`;
            params.push(...ids);
        } else {
            // Listing page: the shared current-fund universe. A single scraped
            // point is a stub, not a history; a NAV older than DORMANT_DAYS is a
            // closed, matured or frozen fund (it keeps its own page). Anything
            // older than 10 days is flagged `is_stale` below and always carries
            // its real `as_of_date`, so an older NAV is never presented as
            // current. (Compare-by-ids path above is exempt so a direct link
            // still resolves.)
            whereClause += ` AND (SELECT COUNT(*) FROM nav_history WHERE fund_id = f.fund_id) >= ${MIN_NAV_POINTS}`;
            whereClause += ` AND (SELECT MAX(date) FROM nav_history WHERE fund_id = f.fund_id) >= (CURRENT_DATE - INTERVAL '${DORMANT_DAYS} days')`;
        }

        const query = `
            SELECT f.*,
                COALESCE(
                    (SELECT nav FROM nav_history WHERE fund_id = f.fund_id ORDER BY date DESC LIMIT 1),
                    NULLIF(f.latest_nav, 0)
                ) AS latest_nav,
                (SELECT MAX(date) FROM nav_history WHERE fund_id = f.fund_id) AS last_nav_date
            FROM mutual_funds f
            WHERE ${whereClause}
            ORDER BY COALESCE(f.fund_name_en, f.fund_name) ASC
            LIMIT 500
        `;

        const [result, metricsResult] = await Promise.all([
            db.query(query, params),
            // The audited engine's rows, keyed by fund. Isolated: a missing
            // table degrades to the legacy family, it never breaks the list.
            db
                .query(
                    `SELECT fund_id, return_ytd, return_1m, return_3m, return_6m, return_1y, return_3y, return_5y,
                            nav_52w_high, nav_52w_low, points, inception_years, analytics_suppressed
                     FROM fund_risk_metrics`
                )
                .catch(() => ({ rows: [] as Array<Record<string, unknown>> })),
        ]);
        const metricsById = new Map<string, Record<string, unknown>>();
        for (const m of metricsResult.rows as Array<Record<string, unknown>>) metricsById.set(String(m.fund_id), m);
        // Freshness hygiene: mutual_funds.last_updated and last_synced_at are orphan
        // columns — only ever written by the now-retired decypha sync, so they are frozen
        // months in the past. The active NAV pipeline keeps last_update_date / last_nav_date
        // current. Expose the TRUE as-of date on every freshness field so no API consumer
        // can read a stale "last updated". Web pages read the DB directly (unaffected); the
        // mobile client already prefers last_update_date, so this only corrects, never breaks.
        const rows = result.rows.map((raw: Record<string, unknown>) => {
            const r = applyReturnHierarchy({ ...raw }, metricsById.get(String(raw.fund_id)) ?? null);
            const asOf = r.last_nav_date ?? r.last_update_date ?? null;
            const asOfMs = asOf ? new Date(asOf as string).getTime() : NaN;
            // Flag NAVs older than 10 days so clients can show a "delayed" cue (the fund
            // detail page renders an amber badge). Keeps the universe rule honest.
            const is_stale = Number.isFinite(asOfMs) ? Date.now() - asOfMs > 10 * 86_400_000 : false;
            const type = fundTypeSlug(r);
            return {
                ...r,
                currency: fundCurrency(r),
                fund_type: type.slug || r.fund_type,
                fund_type_source: type.source,
                as_of_date: asOf,
                is_stale,
                last_updated: asOf ?? r.last_updated,
                last_synced_at: asOf ?? r.last_synced_at,
            };
        });
        return NextResponse.json(rows, {
            headers: {
                // The listing query is heavy (per-fund nav_history subqueries, ~3s) and
                // fund NAVs update only ~2×/day, so cache the result at the Vercel edge:
                // the query runs at most once per 2 min instead of on EVERY visit (was
                // x-vercel-cache: MISS every load). stale-while-revalidate keeps the page
                // instant while a fresh copy is fetched in the background.
                'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
            },
        });
    } catch (error: any) {
        return apiError('/funds', error);
    }
}
