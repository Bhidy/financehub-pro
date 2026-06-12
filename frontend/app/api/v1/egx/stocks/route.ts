import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, numerify } from '@/lib/db-server';

// Single source of truth: read EGX stocks straight from Supabase (market_tickers,
// the live TradingView-updated quote table) — same as every other stock/fund read.
// Previously this route proxied to the Hetzner backend, the one stock endpoint that
// did, leaving the stock list on a different read path than tickers/ohlc/etc.
const SORTABLE = new Set(['symbol', 'name_en', 'change_percent', 'volume', 'market_cap', 'last_price']);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '500', 10) || 500, 1), 1000);
    const sector = searchParams.get('sector');
    const sortByRaw = searchParams.get('sort_by') || 'symbol';
    const sortBy = SORTABLE.has(sortByRaw) ? sortByRaw : 'symbol';
    const order = (searchParams.get('order') || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    try {
        const params: string[] = [];
        let whereClause = `WHERE market_code = 'EGX'`;
        if (sector) {
            params.push(sector);
            whereClause += ` AND sector_name = $${params.length}`;
        }

        const query = `
            SELECT symbol, name_en, name_ar, sector_name, last_price, change, change_percent,
                   volume, market_cap, pe_ratio, pb_ratio, high, low, open_price, prev_close,
                   high_52w, low_52w
            FROM market_tickers
            ${whereClause}
            ORDER BY ${sortBy} ${order} NULLS LAST
            LIMIT ${limit}
        `;

        const NUM = ['last_price', 'change', 'change_percent', 'volume', 'market_cap',
            'pe_ratio', 'pb_ratio', 'high', 'low', 'open_price', 'prev_close',
            'high_52w', 'low_52w'];
        const result = await db.query(query, params);
        return NextResponse.json(result.rows.map((r: Record<string, unknown>) => numerify(r, NUM)), {
            headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
        });
    } catch (error: any) {
        console.error('[API] /egx/stocks error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
