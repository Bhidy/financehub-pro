import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '1y';

    const cleanSym = symbol.toUpperCase().replace(".CA", "");

    try {
        // Calculate date range based on period
        let days = 365; // default 1y
        switch (period) {
            case '1w': days = 7; break;
            case '1m': days = 30; break;
            case '3m': days = 90; break;
            case '6m': days = 180; break;
            case '1y': days = 365; break;
            case '3y': days = 1095; break;
            case '5y': days = 1825; break;
            case 'max': days = 10000; break;
        }

        // Try querying ohlc_data first (audited, rich EGX data in date column)
        try {
            const resultData = await db.query(
                `SELECT date as time, open, high, low, close, volume 
                 FROM ohlc_data 
                 WHERE (symbol = $1 OR symbol = $2)
                   AND date >= NOW() - INTERVAL '${days} days'
                 ORDER BY date ASC`,
                [cleanSym, `${cleanSym}.CA`]
            );
            if (resultData && resultData.rows && resultData.rows.length > 0) {
                return NextResponse.json(resultData.rows);
            }
        } catch (err: any) {
            console.warn('[ohlc_data query warning in ohlc]', err.message);
        }

        // Fallback to ohlc_history (Saudi market or legacy)
        const resultHistory = await db.query(
            `SELECT time, open, high, low, close, volume 
             FROM ohlc_history 
             WHERE (symbol = $1 OR symbol = $2)
               AND time >= NOW() - INTERVAL '${days} days'
             ORDER BY time ASC`,
            [cleanSym, `${cleanSym}.CA`]
        );

        return NextResponse.json(resultHistory.rows);
    } catch (error: any) {
        console.error('[API /ohlc ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
