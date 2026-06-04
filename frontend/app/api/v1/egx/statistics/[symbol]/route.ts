import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

// Single source of truth: read stock_statistics + market_tickers directly from
// Supabase (was proxying to the Hetzner backend). Same query/output as the backend.
export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const sym = symbol?.toUpperCase();
    if (!sym) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

    try {
        const result = await db.query(
            `SELECT ss.*, mt.name_en, mt.name_ar, mt.last_price, mt.currency, mt.market_cap, mt.sector_name
             FROM stock_statistics ss
             LEFT JOIN market_tickers mt ON ss.symbol = mt.symbol AND mt.market_code = 'EGX'
             WHERE ss.symbol = $1`,
            [sym]
        );
        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Statistics not found' }, { status: 404 });
        }
        return NextResponse.json(result.rows[0]);
    } catch (error: any) {
        console.error('[API] /egx/statistics error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
