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
                        revenue, cost_of_revenue, gross_profit, operating_income, net_income, eps, ebitda,
                        provision_credit_losses, interest_expense, total_interest_income, interest_income_loans, 
                        interest_income_investments, net_interest_income, trading_income, fee_income, 
                        total_noninterest_income, operating_expenses, rd_expense, sga_expense, depreciation, 
                        pretax_income, income_tax, effective_tax_rate, net_margin, gross_margin, operating_margin, 
                        ebitda_margin, ebit, ebit_margin, eps_diluted, shares_outstanding
                 FROM income_statements 
                 WHERE symbol = $1 OR symbol = $2
                 ORDER BY fiscal_year DESC, period_ending DESC
                 LIMIT 40`,
                [cleanSym, `${cleanSym}.CA`]
            ),
            db.query(
                `SELECT fiscal_year, period_type, period_ending,
                        total_assets, total_liabilities, total_equity, book_value_per_share,
                        cash_equivalents, short_term_investments, accounts_receivable, inventory, total_current_assets, 
                        trading_assets, investment_securities, total_investments, gross_loans, allowance_loan_losses, 
                        net_loans, property_plant_equipment, goodwill, intangible_assets, accounts_payable, 
                        short_term_debt, total_current_liabilities, deposits, long_term_debt, total_noncurrent_liabilities
                 FROM balance_sheets 
                 WHERE symbol = $1 OR symbol = $2
                 ORDER BY fiscal_year DESC, period_ending DESC
                 LIMIT 40`,
                [cleanSym, `${cleanSym}.CA`]
            ),
            db.query(
                `SELECT fiscal_year, period_type, period_ending,
                        cash_from_operating, cash_from_investing, cash_from_financing, free_cashflow,
                        depreciation_amortization, stock_based_compensation, capex, share_repurchases, 
                        dividends_paid, debt_issued, debt_repaid
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
                ebitda: row.ebitda,
                provision_credit_losses: row.provision_credit_losses,
                interest_expense: row.interest_expense,
                total_interest_income: row.total_interest_income,
                interest_income_loans: row.interest_income_loans,
                interest_income_investments: row.interest_income_investments,
                net_interest_income: row.net_interest_income,
                trading_income: row.trading_income,
                fee_income: row.fee_income,
                total_noninterest_income: row.total_noninterest_income,
                operating_expenses: row.operating_expenses,
                rd_expense: row.rd_expense,
                sga_expense: row.sga_expense,
                depreciation: row.depreciation,
                pretax_income: row.pretax_income,
                income_tax: row.income_tax,
                effective_tax_rate: row.effective_tax_rate,
                net_margin: row.net_margin,
                gross_margin: row.gross_margin,
                operating_margin: row.operating_margin,
                ebitda_margin: row.ebitda_margin,
                ebit: row.ebit,
                ebit_margin: row.ebit_margin,
                eps_diluted: row.eps_diluted,
                shares_outstanding: row.shares_outstanding
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
            financialsMap[key].cash_equivalents = row.cash_equivalents;
            financialsMap[key].short_term_investments = row.short_term_investments;
            financialsMap[key].accounts_receivable = row.accounts_receivable;
            financialsMap[key].inventory = row.inventory;
            financialsMap[key].total_current_assets = row.total_current_assets;
            financialsMap[key].trading_assets = row.trading_assets;
            financialsMap[key].investment_securities = row.investment_securities;
            financialsMap[key].total_investments = row.total_investments;
            financialsMap[key].gross_loans = row.gross_loans;
            financialsMap[key].allowance_loan_losses = row.allowance_loan_losses;
            financialsMap[key].net_loans = row.net_loans;
            financialsMap[key].property_plant_equipment = row.property_plant_equipment;
            financialsMap[key].goodwill = row.goodwill;
            financialsMap[key].intangible_assets = row.intangible_assets;
            financialsMap[key].accounts_payable = row.accounts_payable;
            financialsMap[key].short_term_debt = row.short_term_debt;
            financialsMap[key].total_current_liabilities = row.total_current_liabilities;
            financialsMap[key].deposits = row.deposits;
            financialsMap[key].long_term_debt = row.long_term_debt;
            financialsMap[key].total_noncurrent_liabilities = row.total_noncurrent_liabilities;
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
            financialsMap[key].depreciation_amortization = row.depreciation_amortization;
            financialsMap[key].stock_based_compensation = row.stock_based_compensation;
            financialsMap[key].capex = row.capex;
            financialsMap[key].share_repurchases = row.share_repurchases;
            financialsMap[key].dividends_paid = row.dividends_paid;
            financialsMap[key].debt_issued = row.debt_issued;
            financialsMap[key].debt_repaid = row.debt_repaid;
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

