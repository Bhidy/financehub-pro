import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = parseInt(searchParams.get('limit') || '100');

    try {
        // Try shareholders table first
        if (symbol) {
            const result = await db.query(
                `SELECT id, symbol, shareholder_name_en, shareholder_name AS shareholder_name_ar, 
                        shareholder_type, ownership_percent, shares_held, change_percent, report_date
                 FROM shareholders 
                 WHERE symbol = $1 
                 ORDER BY ownership_percent DESC NULLS LAST
                 LIMIT $2`,
                [symbol, limit]
            );

            if (result.rows.length > 0) {
                return NextResponse.json(result.rows);
            }

            // Fallback: Try to get from company major holders table if exists
            try {
                const fallback = await db.query(
                    `SELECT * FROM major_holders WHERE symbol = $1 LIMIT $2`,
                    [symbol, limit]
                );
                if (fallback.rows.length > 0) {
                    return NextResponse.json(fallback.rows);
                }
            } catch (e) {
                // major_holders table might not exist
            }
        }

        // All shareholders (no symbol filter)
        const result = await db.query(
            `SELECT id, symbol, shareholder_name_en, shareholder_name AS shareholder_name_ar, 
                    shareholder_type, ownership_percent, shares_held, report_date
             FROM shareholders 
             ORDER BY report_date DESC, ownership_percent DESC NULLS LAST
             LIMIT $1`,
            [limit]
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('[API /shareholders ERROR]', error.message);
        // Return empty array instead of error to prevent frontend crash
        return NextResponse.json([]);
    }
}
