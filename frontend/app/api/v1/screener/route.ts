import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

// Force dynamic to prevent Vercel caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    // Filters
    const sector = searchParams.get('sector');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const sortBy = searchParams.get('sort_by') || 'volume';
    const order = searchParams.get('order') || 'desc';

    try {
        // CRITICAL: Start with stocks that have price data
        let query = `
            SELECT * FROM market_tickers 
            WHERE last_price IS NOT NULL
        `;
        const params: any[] = [];
        let paramIndex = 1;

        // Sector Filter
        if (sector && sector !== 'All' && sector !== 'All Sectors') {
            query += ` AND sector_name = $${paramIndex}`;
            params.push(sector);
            paramIndex++;
        }

        // Price Filter (Cast to numeric for correct comparison)
        if (minPrice && Number(minPrice) > 0) {
            query += ` AND last_price::numeric >= $${paramIndex}`;
            params.push(minPrice);
            paramIndex++;
        }
        if (maxPrice && Number(maxPrice) < 9999) {
            query += ` AND last_price::numeric <= $${paramIndex}`;
            params.push(maxPrice);
            paramIndex++;
        }

        // Safe Sorting (prevent SQL injection)
        const validSorts = ['volume', 'last_price', 'change_percent', 'pe_ratio', 'market_cap'];
        let sortCol = validSorts.includes(sortBy) ? sortBy : 'volume';
        const sortDir = order === 'asc' ? 'ASC' : 'DESC';

        // Cast sort column to numeric
        query += ` ORDER BY ${sortCol}::numeric ${sortDir} NULLS LAST LIMIT 100`;

        const result = await db.query(query, params);

        // Map for frontend compatibility
        const mapped = result.rows.map(row => ({
            ...row,
            market_cap_b: row.market_cap ? (Number(row.market_cap) / 1e9).toFixed(2) + 'B' : null
        }));

        return NextResponse.json(mapped);
    } catch (error: any) {
        console.error('[API /screener ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
