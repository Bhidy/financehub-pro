import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

// Single source of truth: read dividend_history directly from Supabase
// (was proxying to the Hetzner backend). Same query/output as the backend.
export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const sym = symbol?.toUpperCase();
    if (!sym) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

    try {
        const result = await db.query(
            `SELECT * FROM dividend_history WHERE symbol = $1 ORDER BY ex_date DESC`,
            [sym]
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('[API] /egx/dividends error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
