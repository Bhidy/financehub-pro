import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

export async function GET() {
    try {
        // Calculate market-wide aggregates from market_tickers
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_stocks,
                SUM(CASE WHEN change > 0 THEN 1 ELSE 0 END) as advancing,
                SUM(CASE WHEN change < 0 THEN 1 ELSE 0 END) as declining,
                SUM(CASE WHEN change = 0 THEN 1 ELSE 0 END) as unchanged,
                ROUND(SUM(volume)::numeric, 0) as total_volume,
                ROUND(SUM(last_price * volume)::numeric, 0) as total_turnover,
                ROUND(AVG(change_percent)::numeric, 2) as market_change_percent,
                ROUND(AVG(last_price)::numeric, 2) as avg_price,
                MAX(high) as market_high,
                MIN(low) as market_low
            FROM market_tickers 
            WHERE last_price IS NOT NULL
        `);

        // Get latest market breadth for additional context
        const breadthResult = await db.query(`
            SELECT date, advancing, declining, unchanged, new_highs, new_lows,
                   advance_volume, decline_volume
            FROM market_breadth 
            ORDER BY date DESC 
            LIMIT 1
        `);

        const stats = result.rows[0];
        const breadth = breadthResult.rows[0] || {};

        // Calculate a synthetic index value based on market cap weighted average
        // This gives us a TASI-like representation
        const indexResult = await db.query(`
            SELECT 
                ROUND(SUM(last_price * volume) / NULLIF(SUM(volume), 0), 2) as weighted_price,
                ROUND(SUM(change * volume) / NULLIF(SUM(volume), 0), 3) as weighted_change,
                ROUND(SUM(change_percent * volume) / NULLIF(SUM(volume), 0), 2) as weighted_change_percent
            FROM market_tickers 
            WHERE last_price IS NOT NULL AND volume > 0
        `);

        const indexData = indexResult.rows[0];

        return NextResponse.json({
            market_status: "OPEN",
            market_code: "TASI",
            market_name: "Tadawul All Share Index",

            // Synthetic index (volume-weighted)
            index_value: 12000 + (parseFloat(indexData?.weighted_price) || 0) * 0.5,
            index_change: parseFloat(indexData?.weighted_change) || 0,
            index_change_percent: parseFloat(indexData?.weighted_change_percent) || 0,

            // Market breadth stats
            total_stocks: parseInt(stats?.total_stocks) || 0,
            advancing: parseInt(stats?.advancing) || 0,
            declining: parseInt(stats?.declining) || 0,
            unchanged: parseInt(stats?.unchanged) || 0,

            // Volume
            total_volume: parseInt(stats?.total_volume) || 0,
            total_turnover: parseInt(stats?.total_turnover) || 0,

            // Additional breadth data
            new_highs: parseInt(breadth?.new_highs) || 0,
            new_lows: parseInt(breadth?.new_lows) || 0,
            advance_volume: parseInt(breadth?.advance_volume) || 0,
            decline_volume: parseInt(breadth?.decline_volume) || 0,

            // Timestamp
            last_updated: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('[API /market-summary ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
