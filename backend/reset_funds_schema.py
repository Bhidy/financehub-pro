import asyncio
import asyncpg

async def reset_schema():
    conn = await asyncpg.connect('postgresql://home@localhost/mubasher_db')
    
    print("Dropping old tables...")
    await conn.execute("DROP TABLE IF EXISTS mutual_funds CASCADE")
    await conn.execute("DROP TABLE IF EXISTS nav_history CASCADE")
    await conn.execute("DROP TABLE IF EXISTS fund_nav_history CASCADE") # Old name
    
    print("Recreating tables...")
    await conn.execute("""
        CREATE TABLE mutual_funds (
            fund_id VARCHAR(50) PRIMARY KEY,
            fund_name TEXT NOT NULL,
            manager_name TEXT,
            inception_date DATE,
            currency VARCHAR(5) DEFAULT 'SAR',
            latest_nav DECIMAL(12, 4),
            aum DECIMAL(18, 4),
            ytd_return DECIMAL(10, 4),
            one_year_return DECIMAL(10, 4),
            three_year_return DECIMAL(10, 4),
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE TABLE nav_history (
            fund_id VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            nav DECIMAL(12, 4) NOT NULL,
            PRIMARY KEY (fund_id, date),
            FOREIGN KEY (fund_id) REFERENCES mutual_funds(fund_id)
        );
        
        CREATE INDEX idx_nav_fund_date ON nav_history(fund_id, date DESC);
    """)
    
    print("✅ Schema Reset Complete")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(reset_schema())
