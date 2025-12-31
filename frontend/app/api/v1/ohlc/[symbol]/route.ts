import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '1y';

    try {
        // Calculate date range based on period
        let days = 30; // default 1m
        switch (period) {
            case '1w': days = 7; break;
            case '1m': days = 30; break;
            case '3m': days = 90; break;
            case '6m': days = 180; break;
            case '1y': days = 365; break;
            case '5y': days = 1825; break;
        }

        // CRITICAL: Column is 'time' not 'date' based on ai-service.ts
        const result = await db.query(
            `SELECT time, open, high, low, close, volume 
             FROM ohlc_history 
             WHERE symbol = $1 
               AND time >= NOW() - INTERVAL '${days} days'
             ORDER BY time ASC`,
            [symbol]
        );

        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('[API /ohlc ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
