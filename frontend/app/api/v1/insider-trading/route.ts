import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    try {
        // insider_trading table exists with 1 record
        let query = `SELECT id, symbol, insider_name, insider_role, transaction_type,
                            shares, price_per_share, value, holdings_after,
                            transaction_date, filing_date
                     FROM insider_trading 
                     ORDER BY transaction_date DESC 
                     LIMIT 100`;
        let params: any[] = [];

        if (symbol) {
            query = `SELECT id, symbol, insider_name, insider_role, transaction_type,
                            shares, price_per_share, value, holdings_after,
                            transaction_date, filing_date
                     FROM insider_trading 
                     WHERE symbol = $1
                     ORDER BY transaction_date DESC 
                     LIMIT 20`;
            params = [symbol];
        }

        const result = await db.query(query, params);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
