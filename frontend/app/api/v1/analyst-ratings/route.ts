import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    try {
        // analyst_ratings table exists with 68 records
        let query = `SELECT id, symbol, analyst_firm, rating, target_price, 
                            current_price, target_upside, rating_date
                     FROM analyst_ratings 
                     ORDER BY rating_date DESC 
                     LIMIT 100`;
        let params: any[] = [];

        if (symbol) {
            query = `SELECT id, symbol, analyst_firm, rating, target_price, 
                            current_price, target_upside, rating_date
                     FROM analyst_ratings 
                     WHERE symbol = $1
                     ORDER BY rating_date DESC 
                     LIMIT 20`;
            params = [symbol];
        }

        const result = await db.query(query, params);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
