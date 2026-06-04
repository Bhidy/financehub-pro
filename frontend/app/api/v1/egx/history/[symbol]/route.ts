import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    try {
        const { symbol: rawSymbol } = await params;
        const symbol = rawSymbol.toUpperCase();

        const url = new URL(request.url);
        const period = url.searchParams.get('period') || 'max';

        // 1. Try fetching from the persistent ohlc_data table
        const result = await db.query(
            `SELECT 
                date::text as date,
                open,
                high,
                low,
                close,
                adj_close,
                volume
             FROM ohlc_data 
             WHERE UPPER(symbol) = $1
             ORDER BY date ASC`,
            [symbol]
        );

        if (result.rows.length > 0) {
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
        }

        // ohlc_data is the single source of truth for charts (100% EGX coverage).
        // No rows -> empty (the yfinance reservoir backfills new listings); no
        // backend fallback, so chart reads never leave Supabase.
        return NextResponse.json([]);

    } catch (error: any) {
        console.error('[API /egx/history ERROR]', error.message);
        return NextResponse.json([], { status: 200 }); // Return empty array gracefully
    }
}
