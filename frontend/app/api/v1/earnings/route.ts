import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    try {
        // NOTE: 'earnings' table does NOT exist in the database
        // We can derive earnings data from financial_statements table
        if (symbol) {
            const result = await db.query(
                `SELECT symbol, period_type as fiscal_quarter, fiscal_year, 
                        eps as eps_actual, revenue as revenue_actual, net_income
                 FROM financial_statements 
                 WHERE symbol = $1 AND period_type = 'Q'
                 ORDER BY fiscal_year DESC, end_date DESC
                 LIMIT 12`,
                [symbol]
            );
            return NextResponse.json(result.rows);
        }

        // Return recent quarterly earnings from financial_statements
        const result = await db.query(
            `SELECT symbol, period_type as fiscal_quarter, fiscal_year, 
                    eps as eps_actual, revenue as revenue_actual, net_income
             FROM financial_statements 
             WHERE period_type = 'Q'
             ORDER BY end_date DESC
             LIMIT 50`
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
