-- ============================================================
-- FINANCIAL EXPLORER EXPANSION - Schema Extension
-- Adds columns needed for 100% stockanalysis.com parity
-- Run this migration on Supabase production
-- ============================================================

-- 1. INCOME STATEMENTS - New Columns
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS noninterest_income_growth DECIMAL(10, 4);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS operating_revenue DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS other_operating_expenses DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS other_noninterest_expense DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS total_noninterest_expense DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS interest_expense_nonop DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS interest_investment_income DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS fx_gain_loss DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS other_nonop_income DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS ebt_excl_unusual DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS earnings_continuing_ops DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS earnings_discontinued_ops DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS minority_interest_earnings DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS preferred_dividends DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS net_income_common DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS shares_change DECIMAL(10, 4);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS eps_growth DECIMAL(10, 4);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS dividend_per_share DECIMAL(10, 4);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS dividend_growth DECIMAL(10, 4);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS free_cashflow DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS fcf_per_share DECIMAL(10, 4);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS fcf_margin DECIMAL(10, 4);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS da_for_ebitda DECIMAL(20, 2);

-- 2. BALANCE SHEETS - New Columns
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS cash_and_st_investments DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS cash_growth DECIMAL(10, 4);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS other_receivables DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS total_receivables DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS prepaid_expenses DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS other_loan_adjustments DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS long_term_investments DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS lt_accounts_receivable DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS lt_deferred_tax_assets DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS accrued_interest_payable DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS current_portion_leases DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS current_taxes_payable DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS long_term_leases DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS total_common_equity DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS total_liabilities_equity DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS total_debt DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS net_cash DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS net_cash_growth DECIMAL(10, 4);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS net_cash_per_share DECIMAL(10, 4);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS filing_shares_outstanding BIGINT;
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS shares_outstanding BIGINT;
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS working_capital DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS book_value_per_share DECIMAL(10, 4);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS tangible_book_value DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS tangible_bv_per_share DECIMAL(10, 4);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS ppe_land DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS ppe_buildings DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS ppe_machinery DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS ppe_construction DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS ppe_leasehold DECIMAL(20, 2);

-- 3. CASH FLOW STATEMENTS - New Columns
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS other_amortization DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS asset_writedown DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS change_in_trading_assets DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS change_in_income_taxes DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS change_in_other_assets DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS change_in_working_capital DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS cash_discontinued_ops DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS ocf_growth DECIMAL(10, 4);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS sale_of_ppe DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS intangibles_purchased DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS equity_investment_income DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS divestitures DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS short_term_debt_issued DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS total_debt_issued DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS short_term_debt_repaid DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS total_debt_repaid DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS net_debt_issued DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS share_issuances DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS fcf_growth DECIMAL(10, 4);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS fcf_margin DECIMAL(10, 4);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS fcf_per_share DECIMAL(10, 4);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS cash_interest_paid DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS levered_fcf DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS unlevered_fcf DECIMAL(20, 2);

-- Confirmation
SELECT 'Schema updates applied successfully!' AS status;
