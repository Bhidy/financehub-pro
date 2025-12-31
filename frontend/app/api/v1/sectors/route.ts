import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET() {
    try {
        // Get sector performance calculated from average stock change_percent
        const result = await db.query(
            `SELECT 
                sector_name,
                COUNT(*) as stock_count,
                ROUND(AVG(change_percent)::numeric, 2) as performance,
                SUM(CASE WHEN change > 0 THEN 1 ELSE 0 END) as gainers,
                SUM(CASE WHEN change < 0 THEN 1 ELSE 0 END) as losers,
                SUM(CASE WHEN change = 0 THEN 1 ELSE 0 END) as unchanged,
                ROUND(SUM(volume)::numeric / 1000000, 2) as volume_millions
             FROM market_tickers 
             WHERE sector_name IS NOT NULL 
               AND last_price IS NOT NULL
             GROUP BY sector_name
             ORDER BY performance DESC`
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('[API /sectors ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
