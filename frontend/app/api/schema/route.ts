import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

/**
 * COMPREHENSIVE SCHEMA DISCOVERY ENDPOINT
 * This gives us the EXACT tables and columns available in Supabase
 */
export async function GET() {
    const tables = [
        'market_tickers',
        'mutual_funds',
        'ohlc_history',
        'financial_statements',
        'shareholders',
        'analyst_ratings',
        'earnings',
        'insider_trading',
        'corporate_actions',
        'fair_values',
        'market_breadth',
        'news',
        'intraday_data',
        'economic_indicators',
        'etfs',
        'fund_nav_history'
    ];

    const results: Record<string, any> = {};

    for (const table of tables) {
        try {
            const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
            const sampleResult = await db.query(`SELECT * FROM ${table} LIMIT 1`);
            results[table] = {
                exists: true,
                count: parseInt(countResult.rows[0]?.count || '0'),
                columns: sampleResult.rows[0] ? Object.keys(sampleResult.rows[0]) : []
            };
        } catch (error: any) {
            results[table] = {
                exists: false,
                error: error.message?.includes('does not exist') ? 'TABLE_NOT_FOUND' : error.message
            };
        }
    }

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        schema: results
    });
}
