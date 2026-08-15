import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { db } from '@/lib/db-server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const cleanSym = symbol.toUpperCase().replace(".CA", "");

    try {
        // Try querying ohlc_data first (audited, rich EGX data in date column)
        try {
            const resultData = await db.query(
                `SELECT date, open, high, low, close, volume 
                 FROM ohlc_data 
                 WHERE symbol = $1 OR symbol = $2
                 ORDER BY date DESC
                 LIMIT 365`,
                [cleanSym, `${cleanSym}.CA`]
            );
            if (resultData && resultData.rows && resultData.rows.length > 0) {
                return NextResponse.json(resultData.rows);
            }
        } catch (error: any) {
            console.warn('[ohlc_data query warning in history]', error.message);
        }

        // Fallback to ohlc_history (Saudi market or legacy)
        const resultHistory = await db.query(
            `SELECT time as date, open, high, low, close, volume 
             FROM ohlc_history 
             WHERE symbol = $1 OR symbol = $2
             ORDER BY time DESC
             LIMIT 365`,
            [cleanSym, `${cleanSym}.CA`]
        );
        return NextResponse.json(resultHistory.rows);
    } catch (error: any) {
        console.error('[API /history ERROR]', error.message);
        return apiError('/v1/history/[symbol]', error);
    }
}
