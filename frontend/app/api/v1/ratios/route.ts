import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = searchParams.get('limit') || '1';

    try {
        // FRESH ratios derived from TradingView + Yahoo via stock_stats_view.
        // (The financial_ratios table is empty/deprecated — was stockanalysis-era.)
        if (!symbol) {
            return NextResponse.json([]);
        }
        // NOTE: stock_stats_view has NO updated_at column — selecting it 500'd for
        // every symbol. Use only columns the view actually exposes.
        const result = await db.query(
            `SELECT symbol, pe_ratio, pb_ratio, dividend_yield,
                    gross_margin, operating_margin, profit_margin AS net_margin,
                    roe, roa, eps_ttm, revenue_growth, profit_growth,
                    NOW() AS date
             FROM stock_stats_view WHERE symbol = $1 LIMIT $2`,
            [symbol.toUpperCase(), limit]
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('ratios route error:', error?.message);
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
