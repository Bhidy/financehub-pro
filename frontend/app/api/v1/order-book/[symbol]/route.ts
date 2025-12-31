import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;

    try {
        // Order book is typically real-time data
        // Return sample structure if table doesn't exist
        const result = await db.query(
            `SELECT * FROM order_book WHERE symbol = $1 ORDER BY price DESC`,
            [symbol]
        );

        if (result.rows.length === 0) {
            // Return empty order book structure
            return NextResponse.json({
                bids: [],
                asks: [],
                symbol: symbol
            });
        }

        const bids = result.rows.filter(r => r.side === 'BUY');
        const asks = result.rows.filter(r => r.side === 'SELL');

        return NextResponse.json({ bids, asks, symbol });
    } catch (error: any) {
        return NextResponse.json({ bids: [], asks: [], symbol }, { status: 200 });
    }
}
