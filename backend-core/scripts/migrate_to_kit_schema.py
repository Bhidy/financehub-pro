
import asyncio
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import db
from app.core.config import settings

async def migrate():
    print("🚀 Starting Starta Kit Schema Migration...")
    try:
        await db.connect()
        async with db._pool.acquire() as conn:
            
            # 1. Macro Data Table
            print("Creating/Checking macro_data...")
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS macro_data (
                    id SERIAL PRIMARY KEY,
                    market_code VARCHAR(20) DEFAULT 'EGX',
                    as_of DATE DEFAULT CURRENT_DATE,
                    
                    -- Growth
                    gdp_forecast NUMERIC(10, 2),
                    gdp_actual NUMERIC(10, 2),
                    pmi NUMERIC(10, 2),
                    
                    -- Inflation
                    inflation_yoy NUMERIC(10, 4),
                    inflation_historical_avg NUMERIC(10, 4),
                    inflation_trend VARCHAR(20),
                    
                    -- Currency Flows
                    fx_reserves_3m_change_pct NUMERIC(10, 2),
                    tourism_revenues_yoy_change NUMERIC(10, 2),
                    suez_revenues_yoy_change NUMERIC(10, 2),
                    remittances_yoy_change NUMERIC(10, 2),
                    
                    -- USD/EGP
                    dxy_3m_change_pct NUMERIC(10, 2),
                    egp_3m_volatility NUMERIC(10, 2),
                    
                    -- Earnings
                    earnings_beat_rate_pct NUMERIC(10, 2),
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    year INTEGER, 
                    quarter INTEGER
                );
            """)
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_macro_market ON macro_data(market_code, as_of DESC);")

            # 2. Sector Averages Table
            print("Creating/Checking sector_averages...")
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS sector_averages (
                    id SERIAL PRIMARY KEY,
                    sector VARCHAR(100) NOT NULL,
                    market VARCHAR(20) DEFAULT 'EGX',
                    as_of_date DATE DEFAULT CURRENT_DATE,
                    
                    avg_pe_ratio NUMERIC(10, 4),
                    avg_pb_ratio NUMERIC(10, 4),
                    avg_roe NUMERIC(10, 4),
                    avg_debt_to_equity NUMERIC(10, 4),
                    avg_gross_margin NUMERIC(10, 4),
                    avg_operating_margin NUMERIC(10, 4),
                    
                    num_companies INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(sector, market, as_of_date)
                );
            """)
            
            # 3. Macro Insights Table (Expert Knowledge)
            print("Creating/Checking macro_insights...")
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS macro_insights (
                    id SERIAL PRIMARY KEY,
                    ticker VARCHAR(20), -- Nullable if general market insight
                    insight_type VARCHAR(50) NOT NULL, -- 'seasonality', 'business_cycle'
                    insight_text TEXT NOT NULL,
                    supporting_data JSONB,
                    valid_from DATE,
                    valid_until DATE,
                    created_by VARCHAR(100) DEFAULT 'system',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_insights_ticker ON macro_insights(ticker);")

            print("✅ Migration Complete!")
            
    except Exception as e:
        print(f"❌ Migration Failed: {e}")
    finally:
        await db.close()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate())
