import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    try {
        // market_breadth table exists with 30 records
        const result = await db.query(
            `SELECT date, market_code, total_stocks, advancing, declining, unchanged,
                    new_highs, new_lows, advance_volume, decline_volume
             FROM market_breadth 
             ORDER BY date DESC 
             LIMIT 30`
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
