import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;

    try {
        // Query financial_statements table - column names confirmed from schema
        const result = await db.query(
            `SELECT id, symbol, period_type, fiscal_year, end_date,
                    revenue, gross_profit, operating_income, net_income, eps,
                    total_assets, total_liabilities, total_equity,
                    cash_flow_operating, cash, long_term_debt,
                    operating_cashflow, investing_cashflow, financing_cashflow, raw_data
             FROM financial_statements 
             WHERE symbol = $1 
             ORDER BY fiscal_year DESC, end_date DESC
             LIMIT 20`,
            [symbol]
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('[API /financials ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
