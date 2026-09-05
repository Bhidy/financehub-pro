import { NextRequest, NextResponse } from 'next/server';
import { db, numerify } from '@/lib/db-server';

const DIV_NUM = ['div_yield', 'amount_recent', 'ex_date_recent', 'payment_date_recent',
    'amount_upcoming', 'ex_date_upcoming', 'payment_date_upcoming',
    'payout_ratio_ttm', 'continuous_growth'];

// TradingView dividend snapshot for an EGX symbol, incl. forward ex-date /
// payment-date calendar. One row per symbol.
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    try {
        const { symbol } = await params;
        const result = await db.query(
            `SELECT symbol, div_yield, amount_recent, ex_date_recent, payment_date_recent,
                    amount_upcoming, ex_date_upcoming, payment_date_upcoming,
                    frequency, payout_ratio_ttm, continuous_growth, updated_at
             FROM egx_dividends
             WHERE symbol = $1`,
            [symbol.toUpperCase()]
        );
        if (result.rows.length === 0) {
            return NextResponse.json({ symbol: symbol.toUpperCase(), pays_dividend: false });
        }
        const r = numerify(result.rows[0], DIV_NUM);
        const pays = (r.div_yield ?? 0) > 0 || r.amount_recent != null;
        return NextResponse.json({ ...r, pays_dividend: pays, source: 'tradingview' });
    } catch (error) {
        console.error('Error fetching EGX dividends (TV):', error);
        return NextResponse.json({ error: 'Failed to fetch dividends' }, { status: 500 });
    }
}
