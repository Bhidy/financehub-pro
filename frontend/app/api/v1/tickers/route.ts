import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

export async function GET() {
    try {
        // CRITICAL: Only return stocks with actual price data
        const result = await db.query(
            `SELECT symbol, name_en, last_price, change, change_percent, volume, sector_name, market_code 
             FROM market_tickers 
             WHERE last_price IS NOT NULL 
             ORDER BY volume::numeric DESC NULLS LAST 
             LIMIT 500`
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('[API /tickers ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
