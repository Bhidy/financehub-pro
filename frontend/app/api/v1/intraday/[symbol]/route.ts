import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || '1h';
    const limit = parseInt(searchParams.get('limit') || '100');

    try {
        // intraday_data table exists but is empty (0 records)
        // Fallback: Use recent OHLC data as "intraday" approximation
        const result = await db.query(
            `SELECT time as timestamp, open, high, low, close, volume 
             FROM ohlc_history 
             WHERE symbol = $1 
             ORDER BY time DESC
             LIMIT $2`,
            [symbol, limit]
        );

        // Reverse to get chronological order
        return NextResponse.json(result.rows.reverse());
    } catch (error: any) {
        console.error('[API /intraday ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
