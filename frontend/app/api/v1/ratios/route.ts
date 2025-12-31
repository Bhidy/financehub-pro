import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = searchParams.get('limit') || '1';

    try {
        let query = `SELECT * FROM financial_ratios ORDER BY date DESC LIMIT $1`;
        let params: any[] = [limit];

        if (symbol) {
            query = `SELECT * FROM financial_ratios WHERE symbol = $1 ORDER BY date DESC LIMIT $2`;
            params = [symbol, limit];
        }

        const result = await db.query(query, params);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
