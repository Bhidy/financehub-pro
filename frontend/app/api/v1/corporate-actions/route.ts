import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    try {
        // corporate_actions table exists with 6,658 records
        let query = `SELECT id, symbol, action_type, announcement_date, ex_date,
                            record_date, payment_date, amount, currency, description
                     FROM corporate_actions 
                     ORDER BY ex_date DESC 
                     LIMIT 100`;
        let params: any[] = [];

        if (symbol) {
            query = `SELECT id, symbol, action_type, announcement_date, ex_date,
                            record_date, payment_date, amount, currency, description
                     FROM corporate_actions 
                     WHERE symbol = $1
                     ORDER BY ex_date DESC 
                     LIMIT 20`;
            params = [symbol];
        }

        const result = await db.query(query, params);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
