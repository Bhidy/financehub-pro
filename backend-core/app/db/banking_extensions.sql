-- Banking Data Extension for COMI and others
-- Adds granular fields identified in Gap Analysis

-- 1. Income Statement Extensions
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS revenues_before_loan_losses DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS salaries_and_benefits DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS amortization_of_goodwill DECIMAL(20, 2);
ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS other_unusual_items DECIMAL(20, 2);

-- 2. Balance Sheet Extensions
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS restricted_cash DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS accrued_interest_receivable DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS interest_bearing_deposits DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS non_interest_bearing_deposits DECIMAL(20, 2);
ALTER TABLE balance_sheets ADD COLUMN IF NOT EXISTS other_real_estate_owned DECIMAL(20, 2);

-- 3. Cash Flow Extensions
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS cash_income_tax_paid DECIMAL(20, 2);
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS net_increase_deposits DECIMAL(20, 2);
