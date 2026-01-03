import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL') or 'postgresql://home@localhost:5432/mubasher_db'

async def setup_db():
    print(f"Connecting to {DATABASE_URL}...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    # 1. Ensure Dividend History Table
    print("Checking dividend_history table...")
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS dividend_history (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20) REFERENCES market_tickers(symbol),
            ex_date DATE,
            payment_date DATE,
            record_date DATE,
            amount DECIMAL(12, 4),
            dividend_yield DECIMAL(8, 4),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(symbol, ex_date)
        );
        CREATE INDEX IF NOT EXISTS idx_dividends_symbol ON dividend_history (symbol, ex_date DESC);
    """)
    
    # 2. Ensure Financial Statements Table
    print("Checking financial_statements table...")
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS financial_statements (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
            period_type VARCHAR(10) NOT NULL, -- 'Q1', 'Q2', 'Q3', 'Q4', 'FY'
            fiscal_year INT NOT NULL,
            end_date DATE,
            
            -- Core Metrics
            revenue DECIMAL(18, 4),
            gross_profit DECIMAL(18, 4),
            operating_income DECIMAL(18, 4),
            net_income DECIMAL(18, 4),
            eps DECIMAL(10, 4),
            
            total_assets DECIMAL(18, 4),
            total_liabilities DECIMAL(18, 4),
            total_equity DECIMAL(18, 4),
            cash_flow_operating DECIMAL(18, 4),
            
            raw_data JSONB,
            
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(symbol, fiscal_year, period_type)
        );
    """)

    # 3. Ensure Company Profiles Table
    print("Checking company_profiles table...")
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS company_profiles (
            symbol VARCHAR(20) PRIMARY KEY REFERENCES market_tickers(symbol),
            description TEXT,
            website VARCHAR(255),
            industry TEXT,
            sector TEXT,
            employees VARCHAR(50),
            
            officers JSONB DEFAULT '[]',
            peers JSONB DEFAULT '[]',
            
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)
    
    # 4. Ensure Financial Ratios Extended Table (for Statistics)
    print("Checking financial_ratios_extended table...")
    await conn.execute("""
         CREATE TABLE IF NOT EXISTS financial_ratios_extended (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
            fiscal_year INT, -- Nullable for current stats
            period_type VARCHAR(10) DEFAULT 'FY',
            
            -- Valuation
            pe_ratio DECIMAL(10, 4),
            pb_ratio DECIMAL(10, 4),
            ps_ratio DECIMAL(10, 4),
            
            -- Profitability
            gross_margin DECIMAL(8, 4),
            operating_margin DECIMAL(8, 4),
            net_margin DECIMAL(8, 4),
            roe DECIMAL(8, 4),
            
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(symbol, fiscal_year, period_type)
        );
    """)

    print("✅ Schema setup complete for EGX.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(setup_db())
