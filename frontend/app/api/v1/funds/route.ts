import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market');
    const idsParam = searchParams.get('ids');
    const ids = idsParam
        ? idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4)
        : [];

    try {
        const params: string[] = [];
        let p = 1;

        let whereClause = `
            f.fund_name_en NOT IN ('3 Years', '5 Years', '7 Years', '10 Years', '15 Years')
            AND f.fund_name_en NOT LIKE '%Years%'
            AND f.fund_name_en IS NOT NULL
            AND f.fund_name_en != ''
        `;

        if (market) {
            whereClause += ` AND f.market_code = $${p++}`;
            params.push(market);
        }

        if (ids.length > 0) {
            // Compare page: return the exact requested funds regardless of NAV status
            const placeholders = ids.map(() => `$${p++}`).join(', ');
            whereClause += ` AND CAST(f.fund_id AS TEXT) IN (${placeholders})`;
            params.push(...ids);
        } else {
            // Listing page: only show funds with meaningful chart data (>= 10 nav_history entries)
            // This excludes ghost/stub records that have only 1 scraped point and no real history
            whereClause += ` AND (SELECT COUNT(*) FROM nav_history WHERE fund_id = f.fund_id) >= 10`;
        }

        const query = `
            SELECT f.*,
                COALESCE(
                    (SELECT nav FROM nav_history WHERE fund_id = f.fund_id ORDER BY date DESC LIMIT 1),
                    NULLIF(f.latest_nav, 0)
                ) AS latest_nav,
                (SELECT MAX(date) FROM nav_history WHERE fund_id = f.fund_id) AS last_nav_date
            FROM mutual_funds f
            WHERE ${whereClause}
            ORDER BY COALESCE(f.fund_name_en, f.fund_name) ASC
            LIMIT 500
        `;

        const result = await db.query(query, params);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('[API] /funds error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
