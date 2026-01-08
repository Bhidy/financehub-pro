import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market');

    try {
        // Enterprise-grade query - SHOW ALL FUNDS with valid names
        // NAV data is optional - use COALESCE to provide fallback
        let query = `
            SELECT f.*, 
                COALESCE(
                    (SELECT nav FROM nav_history WHERE fund_id = f.fund_id ORDER BY date DESC LIMIT 1),
                    f.latest_nav,
                    0
                ) as latest_nav,
                (SELECT MAX(date) FROM nav_history WHERE fund_id = f.fund_id) as last_nav_date
            FROM mutual_funds f
            WHERE f.fund_name_en NOT IN ('3 Years', '5 Years', '7 Years', '10 Years', '15 Years')
              AND f.fund_name_en NOT LIKE '%Years%'
              AND f.fund_name_en IS NOT NULL
              AND f.fund_name_en != ''
        `;
        let params: string[] = [];
        let paramIndex = 1;

        if (market) {
            query += ` AND f.market_code = $${paramIndex}`;
            params.push(market);
            paramIndex++;
        }

        query += ` ORDER BY COALESCE(f.fund_name_en, f.fund_name) ASC LIMIT 500`;

        const result = await db.query(query, params);

        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('[API] /funds error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
