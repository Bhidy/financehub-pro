import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://starta.46-224-223-172.sslip.io';

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

        // 2. Fallback: Proxy to yfinance FastAPI backend
        console.warn(`[EGX History] Symbol ${symbol} not found in ohlc_data, falling back to yfinance backend...`);
        const response = await fetch(`${BACKEND_URL}/api/v1/egx/history/${symbol}?period=${period}`, {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            return NextResponse.json([], { status: 200 }); // Return empty array gracefully
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('[API /egx/history ERROR]', error.message);
        return NextResponse.json([], { status: 200 }); // Return empty array gracefully
    }
}
