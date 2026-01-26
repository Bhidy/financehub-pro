
-- Migration: Add sector_specific_data and missing growth metrics
-- Date: 2026-01-26
-- Author: FinanceHub Chief Expert

-- 1. INCOME STATEMENTS
ALTER TABLE income_statements 
ADD COLUMN IF NOT EXISTS sector_specific_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS eps_growth NUMERIC,
ADD COLUMN IF NOT EXISTS dividend_growth NUMERIC,
ADD COLUMN IF NOT EXISTS dividend_per_share NUMERIC,
ADD COLUMN IF NOT EXISTS non_interest_income_growth NUMERIC,
ADD COLUMN IF NOT EXISTS shares_change NUMERIC;

-- 2. BALANCE SHEETS
ALTER TABLE balance_sheets 
ADD COLUMN IF NOT EXISTS sector_specific_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS book_value_per_share NUMERIC,
ADD COLUMN IF NOT EXISTS net_cash_per_share NUMERIC,
ADD COLUMN IF NOT EXISTS total_debt NUMERIC,
ADD COLUMN IF NOT EXISTS net_cash NUMERIC,
ADD COLUMN IF NOT EXISTS net_cash_growth NUMERIC;

-- 3. CASHFLOW STATEMENTS
ALTER TABLE cashflow_statements 
ADD COLUMN IF NOT EXISTS sector_specific_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS free_cash_flow_growth NUMERIC,
ADD COLUMN IF NOT EXISTS operating_cash_flow_growth NUMERIC,
ADD COLUMN IF NOT EXISTS free_cash_flow_margin NUMERIC,
ADD COLUMN IF NOT EXISTS free_cash_flow_per_share NUMERIC;

-- Create indexes on the new JSONB columns for faster querying of specific keys
CREATE INDEX IF NOT EXISTS idx_income_sector_data ON income_statements USING gin (sector_specific_data);
CREATE INDEX IF NOT EXISTS idx_balance_sector_data ON balance_sheets USING gin (sector_specific_data);
CREATE INDEX IF NOT EXISTS idx_cashflow_sector_data ON cashflow_statements USING gin (sector_specific_data);
