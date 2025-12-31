import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    try {
        // fair_values table exists with 6 records
        let query = `SELECT id, symbol, valuation_model, fair_value, current_price,
                            upside_percent, upside, rating, valuation_date
                     FROM fair_values 
                     ORDER BY valuation_date DESC 
                     LIMIT 100`;
        let params: any[] = [];

        if (symbol) {
            query = `SELECT id, symbol, valuation_model, fair_value, current_price,
                            upside_percent, upside, rating, valuation_date
                     FROM fair_values 
                     WHERE symbol = $1
                     ORDER BY valuation_date DESC`;
            params = [symbol];
        }

        const result = await db.query(query, params);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
