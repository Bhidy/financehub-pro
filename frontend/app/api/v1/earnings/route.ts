import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        // Get quarterly/earnings data from financial_statements
        // period_type includes: Q1, Q2, Q3, Q4, Quarterly, etc.
        if (symbol) {
            const result = await db.query(
                `SELECT symbol, period_type as fiscal_quarter, fiscal_year, 
                        eps as eps_actual, revenue as revenue_actual, net_income,
                        gross_profit, operating_income, end_date
                 FROM financial_statements 
                 WHERE symbol = $1 AND (
                     period_type LIKE 'Q%' OR period_type = 'Quarterly'
                 )
                 ORDER BY fiscal_year DESC, end_date DESC
                 LIMIT $2`,
                [symbol, limit]
            );
            return NextResponse.json(result.rows);
        }

        // Return recent quarterly earnings from all stocks
        const result = await db.query(
            `SELECT symbol, period_type as fiscal_quarter, fiscal_year, 
                    eps as eps_actual, revenue as revenue_actual, net_income,
                    gross_profit, operating_income, end_date
             FROM financial_statements 
             WHERE period_type LIKE 'Q%' OR period_type = 'Quarterly'
             ORDER BY end_date DESC, fiscal_year DESC
             LIMIT $1`,
            [limit]
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('[API /earnings ERROR]', error.message);
        return NextResponse.json([]);
    }
}
