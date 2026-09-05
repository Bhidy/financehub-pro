import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';
import { EGX_ONLY } from '@/lib/public-data';

// Single source of truth: compute EGX market stats directly from Supabase
// (was proxying to the Hetzner backend). Same output keys as the backend.
export async function GET() {
    try {
        const summary = await db.query(`
            SELECT
                COUNT(*) AS total_stocks,
                COUNT(CASE WHEN change_percent > 0 THEN 1 END) AS gainers,
                COUNT(CASE WHEN change_percent < 0 THEN 1 END) AS losers,
                COUNT(CASE WHEN change_percent = 0 THEN 1 END) AS unchanged,
                COALESCE(SUM(volume), 0) AS total_volume
            FROM market_tickers WHERE market_code = 'EGX' AND ${EGX_ONLY}
        `);
        const ohlc = await db.query(
            `SELECT COUNT(*) AS c FROM ohlc_data
             WHERE symbol IN (SELECT symbol FROM market_tickers WHERE market_code = 'EGX' AND ${EGX_ONLY})`);
        const fin = await db.query(
            `SELECT COUNT(*) AS c FROM financial_statements WHERE symbol ~ '^[A-Z]+$'`);

        const s = summary.rows[0] || {};
        return NextResponse.json({
            total_stocks: Number(s.total_stocks) || 0,
            total_ohlc: Number(ohlc.rows[0]?.c) || 0,
            total_financials: Number(fin.rows[0]?.c) || 0,
            gainers: Number(s.gainers) || 0,
            losers: Number(s.losers) || 0,
            unchanged: Number(s.unchanged) || 0,
            total_volume: Number(s.total_volume) || 0,
        });
    } catch (error: any) {
        console.error('[API] /egx/stats error:', error.message);
        return apiError('/v1/egx/stats', error);
    }
}
