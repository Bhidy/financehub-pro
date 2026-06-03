import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

// TradingView analyst estimates / price targets for an EGX symbol.
// Populated only for covered names (~46 of the EGX universe).
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    try {
        const { symbol } = await params;
        const result = await db.query(
            `SELECT symbol, target_average, target_high, target_low, target_median,
                    rec_buy, rec_over, rec_hold, rec_under, rec_sell, rec_total,
                    eps_fcst_next_fq, rev_fcst_next_fq, eps_fcst_next_fy, updated_at
             FROM egx_estimates
             WHERE UPPER(symbol) = $1`,
            [symbol.toUpperCase()]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ symbol: symbol.toUpperCase(), covered: false });
        }
        return NextResponse.json({ ...result.rows[0], covered: true, source: 'tradingview' });
    } catch (error) {
        console.error('Error fetching EGX estimates:', error);
        return NextResponse.json({ error: 'Failed to fetch estimates' }, { status: 500 });
    }
}
