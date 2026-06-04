import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

// Single source of truth: read financial_statements directly from Supabase
// (was proxying to the Hetzner backend). Mirrors the backend behaviour
// (annual statements, newest first, capped at 10 years).
export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const sym = symbol?.toUpperCase();
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'annual').toLowerCase() === 'quarterly'
        ? 'quarterly' : 'annual';
    if (!sym) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

    try {
        const result = await db.query(
            `SELECT * FROM financial_statements
             WHERE symbol = $1 AND period_type = $2
             ORDER BY fiscal_year DESC
             LIMIT 10`,
            [sym, period]
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('[API] /egx/financials-data error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
