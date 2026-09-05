import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-server';
import { EGX_ONLY } from '@/lib/public-data';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    try {
        const { symbol } = await params;

        // Get stock from market_tickers table (live data)
        const result = await db.query(
            `SELECT 
                symbol,
                name_en,
                name_ar,
                last_price,
                change,
                change_percent,
                volume,
                market_cap,
                pe_ratio,
                dividend_yield,
                sector_name,
                market_code,
                currency,
                isin,
                logo_url,
                source,
                last_updated
             FROM market_tickers
             WHERE symbol = $1 AND ${EGX_ONLY}`,
            [symbol.toUpperCase()]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching EGX stock:', error);
        return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
    }
}
