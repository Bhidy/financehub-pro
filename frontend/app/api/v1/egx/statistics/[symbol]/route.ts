import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, numerify } from '@/lib/db-server';

// stock_stats_view ALREADY emits absolute EGP (monetary scaled x1e6 in the view) —
// so coerce NUMERIC strings to numbers but do NOT re-scale here.
const STATS_NUM = ['last_price', 'pe_ratio', 'forward_pe', 'pb_ratio', 'dividend_yield', 'market_cap',
    'beta_1y', 'float_shares_percent', 'float_shares', 'shareholders_count',
    'rsi_14', 'ma_50d', 'ma_200d', 'gross_margin', 'operating_margin', 'profit_margin',
    'revenue_growth', 'profit_growth', 'eps_growth',
    'eps_ttm', 'revenue_ttm', 'net_income_ttm', 'fcf_ttm',
    'eps_fy', 'revenue_fy', 'net_income_fy', 'fcf_fy', 'ebitda_fy',
    'roe', 'roa', 'total_debt', 'book_value', 'bvps', 'shares_outstanding'];

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
        return NextResponse.json(numerify(result.rows[0], STATS_NUM));
    } catch (error: any) {
        console.error('[API] /egx/statistics error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
