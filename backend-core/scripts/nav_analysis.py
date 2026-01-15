
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def main():
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    print("=" * 60)
    print("🔍 DEEP NAV ANALYSIS")
    print("=" * 60)
    
    # Check NAV distribution
    nav_dist = await conn.fetch("""
        SELECT 
            CASE 
                WHEN latest_nav IS NULL THEN 'NULL'
                WHEN latest_nav = 0 THEN 'ZERO'
                WHEN latest_nav > 0 AND latest_nav < 1 THEN '0-1'
                WHEN latest_nav >= 1 AND latest_nav < 10 THEN '1-10'
                WHEN latest_nav >= 10 AND latest_nav < 100 THEN '10-100'
                WHEN latest_nav >= 100 THEN '100+'
            END as range,
            count(*) as cnt
        FROM mutual_funds
        GROUP BY 1
        ORDER BY 2 DESC
    """)
    
    print("\n📊 NAV Distribution:")
    for r in nav_dist:
        print(f"  {r['range']}: {r['cnt']} funds")
    
    # Sample funds with NAV > 0
    has_nav = await conn.fetch("""
        SELECT symbol, fund_name_en, latest_nav, as_of_date
        FROM mutual_funds
        WHERE latest_nav > 0
        ORDER BY latest_nav DESC
        LIMIT 10
    """)
    
    print("\n✅ Funds WITH NAV (sample):")
    for f in has_nav:
        print(f"  {f['symbol']}: {f['latest_nav']} ({f['as_of_date']})")
    
    # Sample funds with NAV = 0 or NULL
    no_nav = await conn.fetch("""
        SELECT symbol, fund_name_en
        FROM mutual_funds
        WHERE latest_nav = 0 OR latest_nav IS NULL
        LIMIT 15
    """)
    
    print("\n❌ Funds WITHOUT NAV (sample - need to verify on Decypha):")
    for f in no_nav:
        print(f"  {f['symbol']}: {f['fund_name_en'] or 'N/A'}")
    
    # Check if we have funds updated recently
    recent = await conn.fetch("""
        SELECT symbol, latest_nav, as_of_date
        FROM mutual_funds
        WHERE as_of_date IS NOT NULL
        ORDER BY as_of_date DESC
        LIMIT 5
    """)
    
    print("\n📅 Most Recently Updated Funds:")
    for f in recent:
        print(f"  {f['symbol']}: NAV={f['latest_nav']}, Date={f['as_of_date']}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
