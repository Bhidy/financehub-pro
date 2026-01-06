import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    try {
        const { params: resolvedParams } = { params: await params };
        const symbol = resolvedParams.symbol.toUpperCase();

        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '365');

        // Get OHLC data from database
        const result = await db.query(
            `SELECT 
                date,
                open,
                high,
                low,
                close,
                adj_close,
                volume
             FROM ohlc_data 
             WHERE UPPER(symbol) = $1
             ORDER BY date DESC
             LIMIT $2`,
            [symbol, limit]
        );

        // Format data for frontend charts
        const formattedData = result.rows.map((row: any) => ({
            date: row.date,
            open: parseFloat(row.open) || 0,
            high: parseFloat(row.high) || 0,
            low: parseFloat(row.low) || 0,
            close: parseFloat(row.close) || 0,
            adj_close: parseFloat(row.adj_close) || parseFloat(row.close) || 0,
            volume: parseInt(row.volume) || 0
        }));

        return NextResponse.json(formattedData);
    } catch (error) {
        console.error('Error fetching OHLC data:', error);
        return NextResponse.json({ error: 'Failed to fetch OHLC data' }, { status: 500 });
    }
}
