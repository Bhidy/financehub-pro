import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

// Demo Portfolio for Paper Trading
export async function GET() {
    try {
        // Return demo portfolio data (no auth required)
        const result = await db.query(
            `SELECT * FROM demo_portfolio ORDER BY symbol ASC`
        );

        // If no demo portfolio exists, return sample structure
        if (result.rows.length === 0) {
            return NextResponse.json({
                cash: 100000,
                positions: [],
                total_value: 100000
            });
        }

        return NextResponse.json({
            cash: 100000,
            positions: result.rows,
            total_value: result.rows.reduce((sum, p) => sum + Number(p.value || 0), 100000)
        });
    } catch (error: any) {
        // If table doesn't exist, return empty portfolio
        return NextResponse.json({
            cash: 100000,
            positions: [],
            total_value: 100000
        });
    }
}
