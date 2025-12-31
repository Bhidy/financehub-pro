import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    try {
        // etfs table exists with 4 records
        const result = await db.query(
            `SELECT etf_id, etf_name, tracking_index, inception_date, 
                    expense_ratio, average_spread
             FROM etfs 
             ORDER BY etf_name`
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
