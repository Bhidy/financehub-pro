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
        const result = await db.query(
            `SELECT symbol, pe_ratio, pb_ratio, dividend_yield,
                    gross_margin, operating_margin, profit_margin AS net_margin,
                    roe, roa, eps_ttm, revenue_growth, profit_growth,
                    updated_at AS date
             FROM stock_stats_view WHERE symbol = $1 LIMIT $2`,
            [symbol.toUpperCase(), limit]
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
