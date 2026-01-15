
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def main():
    try:
        conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
        
        print("=" * 60)
        print("📊 EGYPT MUTUAL FUNDS - FULL DATABASE REPORT")
        print("=" * 60)
        
        # Core counts
        funds = await conn.fetchval("SELECT count(*) FROM mutual_funds")
        disclosures = await conn.fetchval("SELECT count(*) FROM fund_disclosures")
        investments = await conn.fetchval("SELECT count(*) FROM fund_investments")
        peers = await conn.fetchval("SELECT count(*) FROM fund_peers")
        actions = await conn.fetchval("SELECT count(*) FROM fund_actions")
        
        print("\n📈 TABLE RECORD COUNTS")
        print("-" * 40)
        print(f"  mutual_funds:      {funds}")
        print(f"  fund_disclosures:  {disclosures}")
        print(f"  fund_investments:  {investments}")
        print(f"  fund_peers:        {peers}")
        print(f"  fund_actions:      {actions}")
        
        # NAV stats
        nav_stats = await conn.fetchrow("""
            SELECT 
                count(*) as total,
                count(*) FILTER (WHERE latest_nav > 0) as with_nav,
                count(*) FILTER (WHERE latest_nav = 0 OR latest_nav IS NULL) as no_nav
            FROM mutual_funds
        """)
        print("\n💰 NAV DATA QUALITY")
        print("-" * 40)
        print(f"  Funds with NAV > 0:  {nav_stats['with_nav']}")
        print(f"  Funds with NAV = 0:  {nav_stats['no_nav']}")
        
        # Return stats
        return_stats = await conn.fetchrow("""
            SELECT 
                count(*) FILTER (WHERE return_1y IS NOT NULL AND return_1y != 0) as with_1y,
                count(*) FILTER (WHERE return_ytd IS NOT NULL AND return_ytd != 0) as with_ytd,
                count(*) FILTER (WHERE one_year_return IS NOT NULL AND one_year_return != 0) as with_1y_alt
            FROM mutual_funds
        """)
        print("\n📊 RETURNS DATA QUALITY")
        print("-" * 40)
        print(f"  Funds with return_1y:       {return_stats['with_1y']}")
        print(f"  Funds with return_ytd:      {return_stats['with_ytd']}")
        print(f"  Funds with one_year_return: {return_stats['with_1y_alt']}")
        
        # Disclosures by fund
        disc_stats = await conn.fetchrow("""
            SELECT 
                count(DISTINCT fund_id) as funds_with_disc,
                max(cnt) as max_per_fund,
                round(avg(cnt)::numeric, 1) as avg_per_fund
            FROM (
                SELECT fund_id, count(*) as cnt FROM fund_disclosures GROUP BY fund_id
            ) t
        """)
        print("\n📑 DISCLOSURES BREAKDOWN")
        print("-" * 40)
        print(f"  Funds with disclosures:  {disc_stats['funds_with_disc']}")
        print(f"  Max per fund:            {disc_stats['max_per_fund']}")
        print(f"  Avg per fund:            {disc_stats['avg_per_fund']}")
        
        # Sample funds with good data
        good_funds = await conn.fetch("""
            SELECT symbol, fund_name_en, latest_nav, return_1y 
            FROM mutual_funds 
            WHERE latest_nav > 0 AND return_1y IS NOT NULL AND return_1y != 0
            ORDER BY return_1y DESC
            LIMIT 5
        """)
        print("\n🏆 TOP 5 FUNDS BY 1Y RETURN (with data)")
        print("-" * 40)
        for f in good_funds:
            print(f"  {f['symbol']}: NAV={f['latest_nav']}, 1Y={f['return_1y']}%")
        
        # Funds with zero NAV (issue with source)
        zero_nav = await conn.fetch("""
            SELECT symbol, fund_name_en
            FROM mutual_funds 
            WHERE latest_nav = 0 OR latest_nav IS NULL
            LIMIT 10
        """)
        print("\n⚠️ SAMPLE FUNDS WITH ZERO/NULL NAV (source issue)")
        print("-" * 40)
        for f in zero_nav:
            print(f"  {f['symbol']}: {f['fund_name_en'] or 'N/A'}")
        
        print("\n" + "=" * 60)
        await conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
