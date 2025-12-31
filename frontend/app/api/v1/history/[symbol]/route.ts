import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;

    try {
        // CRITICAL: Column is 'time' not 'date' based on ai-service.ts
        const result = await db.query(
            `SELECT time as date, open, high, low, close, volume 
             FROM ohlc_history 
             WHERE symbol = $1 
             ORDER BY time DESC
             LIMIT 365`,
            [symbol]
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('[API /history ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
