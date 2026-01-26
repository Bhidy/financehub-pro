-- Migration: Fill Financial Gaps (Comprehensive)
-- Description: Adds all missing fields identified in Gap Analysis for COMI and other Enterprise stocks
-- Date: 2026-01-26

-- 1. INCOME STATEMENTS
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS earnings_from_discontinued_ops DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS earnings_from_continuing_ops DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS preferred_dividends DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS ebt_excl_unusual DECIMAL(20, 2);

-- 2. BALANCE SHEETS
-- Previously targeted in 003, ensuring they exist here
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS tangible_book_value DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS minority_interest DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS deferred_tax_assets DECIMAL(20, 2);

-- New additions from gap analysis
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS long_term_deferred_tax_liabilities DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS comprehensive_income_other DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS current_income_tax_payable DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS accrued_interest_payable DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS accrued_expenses DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS other_receivables DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS other_intangible_assets DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS other_long_term_assets DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS total_common_equity DECIMAL(20, 2);

-- 3. CASH FLOW STATEMENTS
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS issuance_common_stock DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS long_term_debt_issued DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS long_term_debt_repaid DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS change_in_trading_assets DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS change_in_income_tax DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS change_in_working_capital DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS income_loss_equity_investments DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS total_asset_writedown DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS divestitures DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS cash_acquisitions DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS investment_in_securities DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS sale_of_ppe DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS other_amortization DECIMAL(20, 2);

-- Verification
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN ('income_statements', 'balance_sheets', 'cashflow_statements')
ORDER BY table_name, ordinal_position;
