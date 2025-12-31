import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        // Fetch all funds list (List View)
        // MUST RETURN AN ARRAY for frontend useQuery default
        const result = await db.query(
            `SELECT * FROM mutual_funds 
                ORDER BY fund_name ASC 
                LIMIT 500`
        );

        // Return the array directly (No wrapper object)
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
