import { NextResponse } from 'next/server';
import { apiError, clampLimit } from '@/lib/api-error';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = clampLimit(new URL(request.url).searchParams.get('limit'), 90, 10000);

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
        return apiError('/funds/[id]/nav', error);
    }
}
