import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

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
            // Listing page: only show funds with meaningful chart data (>= 10 nav_history entries)
            // This excludes ghost/stub records that have only 1 scraped point and no real history
            whereClause += ` AND (SELECT COUNT(*) FROM nav_history WHERE fund_id = f.fund_id) >= 10`;
            // Freshness gate: hide funds whose latest NAV is older than 30 days. Relaxed from
            // 14d to recover "present but hidden" funds that are only a few weeks stale (EG fund
            // NAVs publish ~weekly). Anything older than 10d is flagged `is_stale` below and always
            // carries its real `as_of_date`, so an older NAV is never presented as current; beyond
            // 30d the data is too old to be useful and stays hidden.
            // (Compare-by-ids path above is exempt so a direct link still resolves.)
            whereClause += ` AND (SELECT MAX(date) FROM nav_history WHERE fund_id = f.fund_id) >= (CURRENT_DATE - INTERVAL '30 days')`;
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

        const result = await db.query(query, params);
        // Freshness hygiene: mutual_funds.last_updated and last_synced_at are orphan
        // columns — only ever written by the now-retired decypha sync, so they are frozen
        // months in the past. The active NAV pipeline keeps last_update_date / last_nav_date
        // current. Expose the TRUE as-of date on every freshness field so no API consumer
        // can read a stale "last updated". Web pages read the DB directly (unaffected); the
        // mobile client already prefers last_update_date, so this only corrects, never breaks.
        const rows = result.rows.map((r: any) => {
            const asOf = r.last_nav_date ?? r.last_update_date ?? null;
            const asOfMs = asOf ? new Date(asOf).getTime() : NaN;
            // Flag NAVs older than 10 days so clients can show a "delayed" cue (the fund
            // detail page renders an amber badge). Keeps the relaxed 30d gate honest.
            const is_stale = Number.isFinite(asOfMs) ? Date.now() - asOfMs > 10 * 86_400_000 : false;
            return {
                ...r,
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
        console.error('[API] /funds error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
