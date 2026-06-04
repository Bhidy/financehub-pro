import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

// Key statistics from the FRESH single source: stock_stats_view derives everything
// live from TradingView (market_tickers + egx_technicals) + Yahoo (income_statements,
// balance_sheets). Replaces the stale stockanalysis.com `stock_statistics` table.
export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const sym = symbol?.toUpperCase();
    if (!sym) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

    try {
        const result = await db.query(
            `SELECT * FROM stock_stats_view WHERE symbol = $1`,
            [sym]
        );
        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Statistics not found' }, { status: 404 });
        }
        return NextResponse.json(result.rows[0]);
    } catch (error: any) {
        console.error('[API] /egx/statistics error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
