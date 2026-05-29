import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const cleanSym = symbol.toUpperCase().replace(".CA", "");

    try {
        // Query income_statements, balance_sheets, and cashflow_statements in parallel
        const [incRes, balRes, cfRes] = await Promise.all([
            db.query(
                `SELECT fiscal_year, period_type, period_ending, currency,
                        revenue, cost_of_revenue, gross_profit, operating_income, net_income, eps, ebitda
                 FROM income_statements 
                 WHERE symbol = $1 OR symbol = $2
                 ORDER BY fiscal_year DESC, period_ending DESC
                 LIMIT 40`,
                [cleanSym, `${cleanSym}.CA`]
            ),
            db.query(
                `SELECT fiscal_year, period_type, period_ending,
                        total_assets, total_liabilities, total_equity, book_value_per_share
                 FROM balance_sheets 
                 WHERE symbol = $1 OR symbol = $2
                 ORDER BY fiscal_year DESC, period_ending DESC
                 LIMIT 40`,
                [cleanSym, `${cleanSym}.CA`]
            ),
            db.query(
                `SELECT fiscal_year, period_type, period_ending,
                        cash_from_operating, cash_from_investing, cash_from_financing, free_cashflow
                 FROM cashflow_statements 
                 WHERE symbol = $1 OR symbol = $2
                 ORDER BY fiscal_year DESC, period_ending DESC
                 LIMIT 40`,
                [cleanSym, `${cleanSym}.CA`]
            )
        ]);

        // Map them by a key: `${fiscal_year}_${period_type}`
        const financialsMap: Record<string, any> = {};

        // Merge income_statements
        for (const row of incRes.rows) {
            const key = `${row.fiscal_year}_${row.period_type}`;
            financialsMap[key] = {
                fiscal_year: row.fiscal_year,
                period_type: row.period_type,
                period_ending: row.period_ending,
                currency: row.currency || 'EGP',
                revenue: row.revenue,
                cost_of_revenue: row.cost_of_revenue,
                gross_profit: row.gross_profit,
                operating_income: row.operating_income,
                net_income: row.net_income,
                eps: row.eps,
                ebitda: row.ebitda
            };
        }

        // Merge balance_sheets
        for (const row of balRes.rows) {
            const key = `${row.fiscal_year}_${row.period_type}`;
            if (!financialsMap[key]) {
                financialsMap[key] = {
                    fiscal_year: row.fiscal_year,
                    period_type: row.period_type,
                    period_ending: row.period_ending,
                    currency: 'EGP'
                };
            }
            financialsMap[key].total_assets = row.total_assets;
            financialsMap[key].total_liabilities = row.total_liabilities;
            financialsMap[key].total_equity = row.total_equity;
            financialsMap[key].book_value_per_share = row.book_value_per_share;
        }

        // Merge cashflow_statements
        for (const row of cfRes.rows) {
            const key = `${row.fiscal_year}_${row.period_type}`;
            if (!financialsMap[key]) {
                financialsMap[key] = {
                    fiscal_year: row.fiscal_year,
                    period_type: row.period_type,
                    period_ending: row.period_ending,
                    currency: 'EGP'
                };
            }
            financialsMap[key].cash_flow_operating = row.cash_from_operating;
            financialsMap[key].operating_cashflow = row.cash_from_operating;
            financialsMap[key].cash_from_investing = row.cash_from_investing;
            financialsMap[key].cash_from_financing = row.cash_from_financing;
            financialsMap[key].free_cashflow = row.free_cashflow;
        }

        // Also query the legacy financial_statements table to fetch the raw_data ratios as fallback
        try {
            const legacyRes = await db.query(
                `SELECT fiscal_year, period_type, raw_data 
                 FROM financial_statements 
                 WHERE symbol = $1 OR symbol = $2
                 ORDER BY fiscal_year DESC 
                 LIMIT 40`,
                [cleanSym, `${cleanSym}.CA`]
            );
            
            for (const row of legacyRes.rows) {
                const key = `${row.fiscal_year}_${row.period_type}`;
                if (financialsMap[key] && row.raw_data) {
                    financialsMap[key].raw_data = row.raw_data;
                }
            }
        } catch (err) {
            console.warn('[legacyRes query warning]', err);
        }

        // Convert the map to a sorted array (descending by year)
        const financialsList = Object.values(financialsMap).sort((a: any, b: any) => {
            if (b.fiscal_year !== a.fiscal_year) {
                return b.fiscal_year - a.fiscal_year;
            }
            return b.period_type.localeCompare(a.period_type);
        });

        return NextResponse.json(financialsList);
    } catch (error: any) {
        console.error('[API /financials ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
