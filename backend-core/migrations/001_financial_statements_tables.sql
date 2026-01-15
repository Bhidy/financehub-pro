-- ============================================================
-- Enterprise Financial Data Enhancement - Database Migration
-- Creates detailed financial statement tables for StockAnalysis-level coverage
-- ============================================================

-- 1. Detailed Income Statement
CREATE TABLE IF NOT EXISTS income_statements (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    fiscal_year INT NOT NULL,
    fiscal_quarter INT,
    period_type VARCHAR(20) DEFAULT 'annual', -- annual/quarterly/ttm
    period_ending DATE,
    currency VARCHAR(10) DEFAULT 'EGP',
    
    -- Revenue/Income (Banking-specific for EGX banks)
    interest_income_loans DECIMAL(20,2),
    interest_income_investments DECIMAL(20,2),
    total_interest_income DECIMAL(20,2),
    interest_expense DECIMAL(20,2),
    net_interest_income DECIMAL(20,2),
    net_interest_income_growth DECIMAL(10,4),
    
    -- Non-Interest Income
    trading_income DECIMAL(20,2),
    fee_income DECIMAL(20,2),
    gain_loss_assets DECIMAL(20,2),
    gain_loss_investments DECIMAL(20,2),
    other_noninterest_income DECIMAL(20,2),
    total_noninterest_income DECIMAL(20,2),
    
    -- General Revenue (for non-banks)
    revenue DECIMAL(20,2),
    revenue_growth DECIMAL(10,4),
    cost_of_revenue DECIMAL(20,2),
    gross_profit DECIMAL(20,2),
    gross_margin DECIMAL(10,4),
    
    -- Expenses
    operating_expenses DECIMAL(20,2),
    rd_expense DECIMAL(20,2),
    sga_expense DECIMAL(20,2),
    depreciation DECIMAL(20,2),
    provision_credit_losses DECIMAL(20,2),
    
    -- Profit Lines
    operating_income DECIMAL(20,2),
    operating_margin DECIMAL(10,4),
    interest_expense_nonop DECIMAL(20,2),
    pretax_income DECIMAL(20,2),
    income_tax DECIMAL(20,2),
    effective_tax_rate DECIMAL(10,4),
    net_income DECIMAL(20,2),
    net_income_growth DECIMAL(10,4),
    net_margin DECIMAL(10,4),
    
    -- Per Share
    eps DECIMAL(10,4),
    eps_diluted DECIMAL(10,4),
    shares_outstanding BIGINT,
    shares_diluted BIGINT,
    
    -- Metadata
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(symbol, fiscal_year, fiscal_quarter, period_type)
);

-- 2. Detailed Balance Sheet
CREATE TABLE IF NOT EXISTS balance_sheets (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    fiscal_year INT NOT NULL,
    fiscal_quarter INT,
    period_type VARCHAR(20) DEFAULT 'annual',
    period_ending DATE,
    currency VARCHAR(10) DEFAULT 'EGP',
    
    -- Current Assets
    cash_equivalents DECIMAL(20,2),
    short_term_investments DECIMAL(20,2),
    accounts_receivable DECIMAL(20,2),
    inventory DECIMAL(20,2),
    other_current_assets DECIMAL(20,2),
    total_current_assets DECIMAL(20,2),
    
    -- Banking-specific Assets
    investment_securities DECIMAL(20,2),
    trading_assets DECIMAL(20,2),
    total_investments DECIMAL(20,2),
    gross_loans DECIMAL(20,2),
    allowance_loan_losses DECIMAL(20,2),
    net_loans DECIMAL(20,2),
    
    -- Non-Current Assets
    property_plant_equipment DECIMAL(20,2),
    ppe_net DECIMAL(20,2),
    goodwill DECIMAL(20,2),
    intangible_assets DECIMAL(20,2),
    other_noncurrent_assets DECIMAL(20,2),
    total_noncurrent_assets DECIMAL(20,2),
    
    total_assets DECIMAL(20,2),
    
    -- Current Liabilities
    accounts_payable DECIMAL(20,2),
    short_term_debt DECIMAL(20,2),
    current_portion_ltd DECIMAL(20,2),
    accrued_liabilities DECIMAL(20,2),
    deferred_revenue DECIMAL(20,2),
    other_current_liabilities DECIMAL(20,2),
    total_current_liabilities DECIMAL(20,2),
    
    -- Banking-specific Liabilities
    deposits DECIMAL(20,2),
    
    -- Non-Current Liabilities
    long_term_debt DECIMAL(20,2),
    deferred_tax_liabilities DECIMAL(20,2),
    other_noncurrent_liabilities DECIMAL(20,2),
    total_noncurrent_liabilities DECIMAL(20,2),
    
    total_liabilities DECIMAL(20,2),
    
    -- Equity
    common_stock DECIMAL(20,2),
    additional_paid_in_capital DECIMAL(20,2),
    retained_earnings DECIMAL(20,2),
    treasury_stock DECIMAL(20,2),
    accumulated_other_comprehensive_income DECIMAL(20,2),
    minority_interest DECIMAL(20,2),
    total_equity DECIMAL(20,2),
    
    -- Metadata
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(symbol, fiscal_year, fiscal_quarter, period_type)
);

-- 3. Detailed Cash Flow Statement
CREATE TABLE IF NOT EXISTS cashflow_statements (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    fiscal_year INT NOT NULL,
    fiscal_quarter INT,
    period_type VARCHAR(20) DEFAULT 'annual',
    period_ending DATE,
    currency VARCHAR(10) DEFAULT 'EGP',
    
    -- Operating Activities
    net_income DECIMAL(20,2),
    depreciation_amortization DECIMAL(20,2),
    stock_based_compensation DECIMAL(20,2),
    deferred_taxes DECIMAL(20,2),
    gain_loss_assets DECIMAL(20,2),
    gain_loss_investments DECIMAL(20,2),
    provision_credit_losses DECIMAL(20,2),
    change_in_trading_assets DECIMAL(20,2),
    change_in_receivables DECIMAL(20,2),
    change_in_inventory DECIMAL(20,2),
    change_in_payables DECIMAL(20,2),
    change_in_other_working_capital DECIMAL(20,2),
    other_operating_activities DECIMAL(20,2),
    cash_from_operating DECIMAL(20,2),
    
    -- Investing Activities
    capex DECIMAL(20,2),
    acquisitions DECIMAL(20,2),
    investment_purchases DECIMAL(20,2),
    investment_sales DECIMAL(20,2),
    other_investing_activities DECIMAL(20,2),
    cash_from_investing DECIMAL(20,2),
    
    -- Financing Activities
    dividends_paid DECIMAL(20,2),
    share_repurchases DECIMAL(20,2),
    share_issuances DECIMAL(20,2),
    debt_issued DECIMAL(20,2),
    debt_repaid DECIMAL(20,2),
    other_financing_activities DECIMAL(20,2),
    cash_from_financing DECIMAL(20,2),
    
    -- Summary
    fx_effect DECIMAL(20,2),
    net_change_cash DECIMAL(20,2),
    beginning_cash DECIMAL(20,2),
    ending_cash DECIMAL(20,2),
    free_cashflow DECIMAL(20,2),
    
    -- Metadata
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(symbol, fiscal_year, fiscal_quarter, period_type)
);

-- 4. Historical Financial Ratios
CREATE TABLE IF NOT EXISTS financial_ratios_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    fiscal_year INT NOT NULL,
    period_ending DATE,
    currency VARCHAR(10) DEFAULT 'EGP',
    
    -- Price & Market Cap
    last_close_price DECIMAL(15,4),
    market_cap DECIMAL(20,2),
    market_cap_growth DECIMAL(10,4),
    
    -- Valuation Ratios
    pe_ratio DECIMAL(10,4),
    pe_forward DECIMAL(10,4),
    peg_ratio DECIMAL(10,4),
    ps_ratio DECIMAL(10,4),
    pb_ratio DECIMAL(10,4),
    ptbv_ratio DECIMAL(10,4),
    pfcf_ratio DECIMAL(10,4),
    pocf_ratio DECIMAL(10,4),
    ev_ebitda DECIMAL(10,4),
    ev_sales DECIMAL(10,4),
    
    -- Profitability
    roe DECIMAL(10,4),
    roa DECIMAL(10,4),
    roic DECIMAL(10,4),
    gross_margin DECIMAL(10,4),
    operating_margin DECIMAL(10,4),
    net_margin DECIMAL(10,4),
    
    -- Leverage
    debt_equity DECIMAL(10,4),
    debt_assets DECIMAL(10,4),
    debt_fcf DECIMAL(10,4),
    interest_coverage DECIMAL(10,4),
    
    -- Liquidity
    current_ratio DECIMAL(10,4),
    quick_ratio DECIMAL(10,4),
    
    -- Efficiency
    asset_turnover DECIMAL(10,4),
    inventory_turnover DECIMAL(10,4),
    receivables_turnover DECIMAL(10,4),
    
    -- Dividends
    dividend_yield DECIMAL(10,4),
    payout_ratio DECIMAL(10,4),
    
    -- Per Share
    revenue_per_share DECIMAL(15,4),
    earnings_per_share DECIMAL(15,4),
    book_value_per_share DECIMAL(15,4),
    fcf_per_share DECIMAL(15,4),
    
    -- Metadata
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(symbol, fiscal_year)
);

-- 5. Segment/KPI Revenue Breakdown
CREATE TABLE IF NOT EXISTS segment_revenue (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    fiscal_year INT NOT NULL,
    segment_name VARCHAR(100) NOT NULL,
    segment_type VARCHAR(50), -- product/geography/business_unit
    
    revenue DECIMAL(20,2),
    revenue_growth DECIMAL(10,4),
    operating_income DECIMAL(20,2),
    operating_margin DECIMAL(10,4),
    
    -- Metadata
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(symbol, fiscal_year, segment_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_income_statements_symbol ON income_statements(symbol);
CREATE INDEX IF NOT EXISTS idx_income_statements_year ON income_statements(fiscal_year DESC);
CREATE INDEX IF NOT EXISTS idx_balance_sheets_symbol ON balance_sheets(symbol);
CREATE INDEX IF NOT EXISTS idx_balance_sheets_year ON balance_sheets(fiscal_year DESC);
CREATE INDEX IF NOT EXISTS idx_cashflow_statements_symbol ON cashflow_statements(symbol);
CREATE INDEX IF NOT EXISTS idx_cashflow_statements_year ON cashflow_statements(fiscal_year DESC);
CREATE INDEX IF NOT EXISTS idx_financial_ratios_symbol ON financial_ratios_history(symbol);
CREATE INDEX IF NOT EXISTS idx_financial_ratios_year ON financial_ratios_history(fiscal_year DESC);
CREATE INDEX IF NOT EXISTS idx_segment_revenue_symbol ON segment_revenue(symbol);
