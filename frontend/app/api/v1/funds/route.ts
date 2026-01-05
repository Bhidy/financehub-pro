import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market');

    try {
        // Filter by market_code if provided (EGX or TDWL)
        let query = `SELECT * FROM mutual_funds`;
        let params: string[] = [];

        if (market) {
            query += ` WHERE market_code = $1`;
            params.push(market);
        }

        query += ` ORDER BY fund_name ASC LIMIT 500`;

        const result = await db.query(query, params);

        // Return the array directly (No wrapper object)
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
