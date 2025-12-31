import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '90';

    try {
        const result = await db.query(
            `SELECT date, nav FROM nav_history 
             WHERE fund_id = $1 
             ORDER BY date DESC 
             LIMIT $2`,
            [id, limit]
        );

        // Return array of { date, nav }
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
