import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def migrate_schema():
    print("🚀 Starting Decypha Schema Migration...")
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    try:
        # 1. Add new columns to mutual_funds
        print("1️⃣  Adding new columns to mutual_funds...")
        
        # Overview Section
        await conn.execute("""
            ALTER TABLE mutual_funds 
            ADD COLUMN IF NOT EXISTS fund_classification VARCHAR(50),
            ADD COLUMN IF NOT EXISTS geographic_focus VARCHAR(50),
            ADD COLUMN IF NOT EXISTS domicile VARCHAR(50),
            ADD COLUMN IF NOT EXISTS eligibility VARCHAR(100),
            ADD COLUMN IF NOT EXISTS benchmark VARCHAR(200),
            ADD COLUMN IF NOT EXISTS nav_frequency VARCHAR(20),
            ADD COLUMN IF NOT EXISTS fund_type VARCHAR(20),
            ADD COLUMN IF NOT EXISTS certificates VARCHAR(100),
            ADD COLUMN IF NOT EXISTS duration_years INTEGER,
            ADD COLUMN IF NOT EXISTS par_value DECIMAL(15,2),
            ADD COLUMN IF NOT EXISTS fy_start VARCHAR(10),
            ADD COLUMN IF NOT EXISTS fy_end VARCHAR(10),
            ADD COLUMN IF NOT EXISTS objective TEXT,
            ADD COLUMN IF NOT EXISTS dividend_policy TEXT,
            ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20);
        """)
        
        # Performance Section
        await conn.execute("""
            ALTER TABLE mutual_funds 
            ADD COLUMN IF NOT EXISTS return_1m DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS return_3m DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS return_ytd DECIMAL(10,4), -- May already exist as ytd_return
            ADD COLUMN IF NOT EXISTS return_1y DECIMAL(10,4), -- May already exist as one_year_return
            ADD COLUMN IF NOT EXISTS return_3y DECIMAL(10,4), -- May already exist as three_year_return
            ADD COLUMN IF NOT EXISTS return_5y DECIMAL(10,4), -- May already exist as five_year_return
            ADD COLUMN IF NOT EXISTS nav_52w_high DECIMAL(15,4),
            ADD COLUMN IF NOT EXISTS nav_52w_low DECIMAL(15,4),
            ADD COLUMN IF NOT EXISTS aum DECIMAL(20,2), -- May already exist
            ADD COLUMN IF NOT EXISTS aum_date DATE;
        """)

        # Management Section
        await conn.execute("""
            ALTER TABLE mutual_funds 
            ADD COLUMN IF NOT EXISTS manager_name_en VARCHAR(200), -- May already exist
            ADD COLUMN IF NOT EXISTS issuer VARCHAR(200),
            ADD COLUMN IF NOT EXISTS ipo_receiver VARCHAR(200);
        """)

        # Fees Section
        await conn.execute("""
            ALTER TABLE mutual_funds 
            ADD COLUMN IF NOT EXISTS fee_subscription DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS fee_redemption DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS fee_management DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS fee_administration DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS fee_custodian DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS fee_performance DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS min_subscription DECIMAL(15,2),
            ADD COLUMN IF NOT EXISTS subsequent_sub DECIMAL(15,2),
            ADD COLUMN IF NOT EXISTS other_expenses TEXT;
        """)

        # Ratios Section
        await conn.execute("""
            ALTER TABLE mutual_funds 
            ADD COLUMN IF NOT EXISTS alpha DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS beta DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS r_squared DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS correlation DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS treynor_ratio DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS information_ratio DECIMAL(10,4);
            -- sharpe_ratio and standard_deviation (std_deviation) likely exist or need check
        """)

        print("2️⃣  Creating new tables...")

        # fund_nav_history
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS fund_nav_history (
                id SERIAL PRIMARY KEY,
                fund_id VARCHAR(20) REFERENCES mutual_funds(fund_id) ON DELETE CASCADE,
                nav_date DATE NOT NULL,
                nav_value DECIMAL(15,4) NOT NULL,
                UNIQUE(fund_id, nav_date)
            );
        """)
        
        # fund_disclosures
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS fund_disclosures (
                id SERIAL PRIMARY KEY,
                fund_id VARCHAR(20) REFERENCES mutual_funds(fund_id) ON DELETE CASCADE,
                report_date DATE,
                title VARCHAR(500),
                report_type VARCHAR(100),
                file_url TEXT,
                UNIQUE(fund_id, report_date, title) 
            );
        """)

        # fund_investments
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS fund_investments (
                id SERIAL PRIMARY KEY,
                fund_id VARCHAR(20) REFERENCES mutual_funds(fund_id) ON DELETE CASCADE,
                as_of_date DATE DEFAULT CURRENT_DATE,
                asset_type VARCHAR(50),
                percentage DECIMAL(10,4),
                UNIQUE(fund_id, asset_type, as_of_date)
            );
        """)

        print("✅ Schema migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(migrate_schema())
