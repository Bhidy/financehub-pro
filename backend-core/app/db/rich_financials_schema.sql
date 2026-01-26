-- ============================================================
-- RICH FINANCIALS SCHEMA Extension
-- Supports granular Banking, Insurance, and Corporate Data
-- Matches ingest_stockanalysis.py mappings
-- ============================================================

-- 1. INCOME STATEMENTS (Comprehensive)
CREATE TABLE IF NOT EXISTS income_statements (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    fiscal_year INT NOT NULL,
    fiscal_quarter INT,
    period_type VARCHAR(15) NOT NULL, -- 'annual' or 'quarterly'
    period_ending DATE,
    currency VARCHAR(5) DEFAULT 'EGP',

    -- Banking Specific
    interest_income_loans DECIMAL(20, 2),
    interest_income_investments DECIMAL(20, 2),
    total_interest_income DECIMAL(20, 2),
    interest_expense DECIMAL(20, 2),
    net_interest_income DECIMAL(20, 2),
    net_interest_income_growth DECIMAL(10, 4),
    provision_credit_losses DECIMAL(20, 2), -- Banking provision
    
    -- Non-Interest Income (Banking/Trading)
    trading_income DECIMAL(20, 2),
    fee_income DECIMAL(20, 2),
    gain_loss_assets DECIMAL(20, 2),
    gain_loss_investments DECIMAL(20, 2),
    other_noninterest_income DECIMAL(20, 2),
    total_noninterest_income DECIMAL(20, 2),
    
    -- General Corporate / Shared
    revenue DECIMAL(20, 2),
    revenue_growth DECIMAL(10, 4),
    cost_of_revenue DECIMAL(20, 2),
    gross_profit DECIMAL(20, 2),
    gross_margin DECIMAL(10, 4),
    
    -- Expenses
    operating_expenses DECIMAL(20, 2),
    rd_expense DECIMAL(20, 2),
    sga_expense DECIMAL(20, 2),
    depreciation DECIMAL(20, 2), -- Often part of operating cash flow but sometimes listed in expenses
    
    -- Profitability
    operating_income DECIMAL(20, 2),
    operating_margin DECIMAL(10, 4),
    pretax_income DECIMAL(20, 2),
    income_tax DECIMAL(20, 2),
    effective_tax_rate DECIMAL(10, 4),
    net_income DECIMAL(20, 2),
    net_income_growth DECIMAL(10, 4),
    net_margin DECIMAL(10, 4),
    
    -- Advanced Metrics
    ebitda DECIMAL(20, 2),
    ebitda_margin DECIMAL(10, 4),
    ebit DECIMAL(20, 2),
    ebit_margin DECIMAL(10, 4),

    -- Deep Banking Detail (Added 2026-01-26)
    revenues_before_loan_losses DECIMAL(20, 2),
    salaries_and_benefits DECIMAL(20, 2),
    amortization_of_goodwill DECIMAL(20, 2),
    other_unusual_items DECIMAL(20, 2),
    
    -- Per Share
    eps DECIMAL(10, 4),
    eps_diluted DECIMAL(10, 4),
    shares_outstanding BIGINT,
    shares_diluted BIGINT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, period_type, fiscal_year, fiscal_quarter)
);

CREATE INDEX IF NOT EXISTS idx_income_symbol_year ON income_statements(symbol, fiscal_year DESC);

-- 2. BALANCE SHEETS (Comprehensive)
CREATE TABLE IF NOT EXISTS balance_sheets (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    fiscal_year INT NOT NULL,
    fiscal_quarter INT,
    period_type VARCHAR(15) NOT NULL,
    period_ending DATE,
    currency VARCHAR(5) DEFAULT 'EGP',

    -- Assets (Liquid)
    cash_equivalents DECIMAL(20, 2),
    short_term_investments DECIMAL(20, 2),
    accounts_receivable DECIMAL(20, 2),
    inventory DECIMAL(20, 2),
    other_current_assets DECIMAL(20, 2),
    total_current_assets DECIMAL(20, 2),
    
    -- Banking Assets
    investment_securities DECIMAL(20, 2),
    trading_assets DECIMAL(20, 2),
    total_investments DECIMAL(20, 2),
    gross_loans DECIMAL(20, 2),
    allowance_loan_losses DECIMAL(20, 2),
    net_loans DECIMAL(20, 2),
    
    -- Long Term Assets
    property_plant_equipment DECIMAL(20, 2),
    goodwill DECIMAL(20, 2),
    intangible_assets DECIMAL(20, 2),
    other_noncurrent_assets DECIMAL(20, 2),
    total_assets DECIMAL(20, 2),
    
    -- Liabilities
    accounts_payable DECIMAL(20, 2),
    short_term_debt DECIMAL(20, 2),
    current_portion_ltd DECIMAL(20, 2),
    accrued_liabilities DECIMAL(20, 2),
    deferred_revenue DECIMAL(20, 2),
    total_current_liabilities DECIMAL(20, 2),
    
    -- Deep Banking Detail (Added 2026-01-26)
    restricted_cash DECIMAL(20, 2),
    accrued_interest_receivable DECIMAL(20, 2),
    other_real_estate_owned DECIMAL(20, 2),
    
    -- Banking/Long Term Liabilities
    deposits DECIMAL(20, 2), -- CRITICAL FOR BANKS
    interest_bearing_deposits DECIMAL(20, 2),
    non_interest_bearing_deposits DECIMAL(20, 2),
    long_term_debt DECIMAL(20, 2),
    deferred_tax_liabilities DECIMAL(20, 2),
    total_noncurrent_liabilities DECIMAL(20, 2),
    total_liabilities DECIMAL(20, 2),
    
    -- Equity
    common_stock DECIMAL(20, 2),
    additional_paid_in_capital DECIMAL(20, 2),
    retained_earnings DECIMAL(20, 2),
    treasury_stock DECIMAL(20, 2),
    total_equity DECIMAL(20, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, period_type, fiscal_year, fiscal_quarter)
);

CREATE INDEX IF NOT EXISTS idx_balance_symbol_year ON balance_sheets(symbol, fiscal_year DESC);

-- 3. CASH FLOW STATEMENTS (Detailed)
CREATE TABLE IF NOT EXISTS cashflow_statements (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    fiscal_year INT NOT NULL,
    fiscal_quarter INT,
    period_type VARCHAR(15) NOT NULL,
    period_ending DATE,
    currency VARCHAR(5) DEFAULT 'EGP',

    -- Operating
    net_income DECIMAL(20, 2),
    depreciation_amortization DECIMAL(20, 2),
    stock_based_compensation DECIMAL(20, 2),
    deferred_taxes DECIMAL(20, 2),
    gain_loss_assets DECIMAL(20, 2),
    gain_loss_investments DECIMAL(20, 2),
    provision_credit_losses DECIMAL(20, 2), -- Non-cash adjustment
    change_in_receivables DECIMAL(20, 2),
    change_in_inventory DECIMAL(20, 2),
    change_in_payables DECIMAL(20, 2),
    other_operating_activities DECIMAL(20, 2),
    cash_from_operating DECIMAL(20, 2),
    
    -- Investing
    capex DECIMAL(20, 2),
    acquisitions DECIMAL(20, 2),
    investment_purchases DECIMAL(20, 2),
    investment_sales DECIMAL(20, 2),
    other_investing_activities DECIMAL(20, 2),
    cash_from_investing DECIMAL(20, 2),
    
    -- Financing
    dividends_paid DECIMAL(20, 2),
    share_repurchases DECIMAL(20, 2),
    debt_issued DECIMAL(20, 2),
    debt_repaid DECIMAL(20, 2),
    other_financing_activities DECIMAL(20, 2),
    cash_from_financing DECIMAL(20, 2),
    
    -- Deep Banking Detail (Added 2026-01-26)
    cash_income_tax_paid DECIMAL(20, 2),
    net_increase_deposits DECIMAL(20, 2),
    
    -- Summary
    net_change_cash DECIMAL(20, 2),
    free_cashflow DECIMAL(20, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, period_type, fiscal_year, fiscal_quarter)
);

CREATE INDEX IF NOT EXISTS idx_cashflow_symbol_year ON cashflow_statements(symbol, fiscal_year DESC);

-- 4. FINANCIAL RATIOS HISTORY (Comprehensive)
CREATE TABLE IF NOT EXISTS financial_ratios_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    fiscal_year INT NOT NULL,
    currency VARCHAR(5) DEFAULT 'EGP',
    
    -- Valuation
    market_cap DECIMAL(20, 2),
    market_cap_growth DECIMAL(10, 4),
    enterprise_value DECIMAL(20, 2),
    last_close_price DECIMAL(10, 4),
    pe_ratio DECIMAL(10, 4),
    pe_forward DECIMAL(10, 4),
    peg_ratio DECIMAL(10, 4),
    ps_ratio DECIMAL(10, 4),
    pb_ratio DECIMAL(10, 4),
    ptbv_ratio DECIMAL(10, 4),
    pfcf_ratio DECIMAL(10, 4),
    pocf_ratio DECIMAL(10, 4),
    ev_ebitda DECIMAL(10, 4),
    ev_sales DECIMAL(10, 4),
    earnings_yield DECIMAL(10, 4),
    fcf_yield DECIMAL(10, 4),
    
    -- Financial Health
    debt_equity DECIMAL(10, 4),
    debt_assets DECIMAL(10, 4),
    debt_ebitda DECIMAL(10, 4),
    debt_fcf DECIMAL(10, 4),
    interest_coverage DECIMAL(10, 4),
    quick_ratio DECIMAL(10, 4),
    current_ratio DECIMAL(10, 4),
    
    -- Profitability & Returns
    roe DECIMAL(10, 4),
    roa DECIMAL(10, 4),
    roic DECIMAL(10, 4),
    roce DECIMAL(10, 4),
    gross_margin DECIMAL(10, 4),
    operating_margin DECIMAL(10, 4),
    net_margin DECIMAL(10, 4),
    
    -- Efficiency
    asset_turnover DECIMAL(10, 4),
    inventory_turnover DECIMAL(10, 4),
    receivables_turnover DECIMAL(10, 4),
    
    -- Dividends
    dividend_yield DECIMAL(10, 4),
    payout_ratio DECIMAL(10, 4),
    
    -- Per Share
    revenue_per_share DECIMAL(10, 4),
    fcf_per_share DECIMAL(10, 4),
    book_value_per_share DECIMAL(10, 4),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, fiscal_year)
);

CREATE INDEX IF NOT EXISTS idx_ratios_symbol_year ON financial_ratios_history(symbol, fiscal_year DESC);
