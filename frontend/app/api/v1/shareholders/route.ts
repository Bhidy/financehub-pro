import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

// Per-holder ownership endpoint.
// June-2026 audit: the old route fell through to a no-filter "all shareholders"
// query whenever a symbol had zero rows — the 6 fabricated demo rows seeded in
// January then rendered on EVERY stock page (web + mobile). A symbol with no
// rows now returns [] — NEVER another symbol's holders, NEVER the whole table.
// The demo rows were deleted; this stays empty until a real, verified holder
// source is ingested.
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!symbol) {
        return NextResponse.json([]);
    }

    try {
        const result = await db.query(
            `SELECT id, symbol, shareholder_name_en, shareholder_name AS shareholder_name_ar,
                    shareholder_type, ownership_percent, shares_held, as_of_date AS report_date
             FROM major_shareholders
             WHERE symbol = $1 OR symbol = $2
             ORDER BY ownership_percent DESC NULLS LAST
             LIMIT $3`,
            [symbol, `${symbol}.CA`, limit]
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('[API /shareholders ERROR]', error.message);
        // Return empty array instead of error to prevent frontend crash
        return NextResponse.json([]);
    }
}
