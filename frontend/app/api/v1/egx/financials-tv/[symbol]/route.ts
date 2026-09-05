import { NextRequest, NextResponse } from 'next/server';
import { db, numerify } from '@/lib/db-server';

const TVFIN_NUM = ['revenue', 'gross_profit', 'ebitda', 'net_income',
    'eps_diluted', 'free_cash_flow', 'total_assets', 'total_debt', 'dps'];

// TradingView 20-year annual statement history for an EGX symbol.
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    try {
        const { symbol } = await params;
        const result = await db.query(
            `SELECT fiscal_year, revenue, gross_profit, ebitda, net_income,
                    eps_diluted, free_cash_flow, total_assets, total_debt, dps
             FROM egx_financials
             WHERE symbol = $1 AND period_type = 'annual'
             ORDER BY fiscal_year ASC`,
            [symbol.toUpperCase()]
        );
        return NextResponse.json({
            symbol: symbol.toUpperCase(),
            source: 'tradingview',
            years: result.rows.map((r) => numerify(r, TVFIN_NUM)),
        });
    } catch (error) {
        console.error('Error fetching EGX financials (TV):', error);
        return NextResponse.json({ error: 'Failed to fetch financials' }, { status: 500 });
    }
}
