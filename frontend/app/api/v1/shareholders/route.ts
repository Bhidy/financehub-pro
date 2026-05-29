import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = parseInt(searchParams.get('limit') || '100');

    try {
        if (symbol) {
            // Query major_shareholders table
            const result = await db.query(
                `SELECT id, symbol, shareholder_name_en, shareholder_name AS shareholder_name_ar, 
                        shareholder_type, ownership_percent, shares_held, report_date
                 FROM major_shareholders 
                 WHERE symbol = $1 OR symbol = $2
                 ORDER BY ownership_percent DESC NULLS LAST
                 LIMIT $3`,
                [symbol, `${symbol}.CA`, limit]
            );

            if (result.rows.length > 0) {
                return NextResponse.json(result.rows);
            }
        }

        // All shareholders (no symbol filter)
        const result = await db.query(
            `SELECT id, symbol, shareholder_name_en, shareholder_name AS shareholder_name_ar, 
                    shareholder_type, ownership_percent, shares_held, report_date
             FROM major_shareholders 
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
