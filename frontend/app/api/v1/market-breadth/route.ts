import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';
import { EGX_ONLY } from '@/lib/public-data';

export async function GET() {
    try {
        // Computed LIVE from market_tickers (EGX). Previously this read the stale
        // `market_breadth` table, which was frozen at 2025-12 AND held the WRONG
        // market (Saudi/TDWL) — so EGX Market-Pulse / Data-Explorer showed ~6-month-old
        // Saudi breadth. Returns the current EGX breadth snapshot.
        const r = await db.query(`
            SELECT
                CURRENT_DATE                                                       AS date,
                'EGX'                                                              AS market_code,
                COUNT(*)                                                           AS total_stocks,
                SUM(CASE WHEN change_percent > 0 THEN 1 ELSE 0 END)                AS advancing,
                SUM(CASE WHEN change_percent < 0 THEN 1 ELSE 0 END)                AS declining,
                SUM(CASE WHEN change_percent = 0 OR change_percent IS NULL THEN 1 ELSE 0 END) AS unchanged,
                COUNT(CASE WHEN high_52w IS NOT NULL AND last_price >= high_52w * 0.98 THEN 1 END) AS new_highs,
                COUNT(CASE WHEN low_52w  IS NOT NULL AND last_price <= low_52w  * 1.02 THEN 1 END) AS new_lows,
                ROUND(SUM(CASE WHEN change_percent > 0 THEN volume ELSE 0 END)::numeric, 0) AS advance_volume,
                ROUND(SUM(CASE WHEN change_percent < 0 THEN volume ELSE 0 END)::numeric, 0) AS decline_volume
            FROM market_tickers
            WHERE last_price IS NOT NULL AND market_code = 'EGX' AND ${EGX_ONLY}
        `);
        return NextResponse.json(r.rows);
    } catch (error: any) {
        console.error('market-breadth route error:', error?.message);
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
