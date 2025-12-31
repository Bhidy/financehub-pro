import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const result = await db.query(
            `SELECT * FROM mutual_funds WHERE fund_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Fund not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
