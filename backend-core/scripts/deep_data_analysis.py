
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def run_analysis():
    print("🔬 STARTING DEEP DATA FORENSICS 🔬")
    print("=" * 50)
    
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # 1. DATA FRESHNESS (Last updated dates from source)
        print("\n[1] DATA FRESHNESS (as_of_date distribution)")
        rows = await conn.fetch('''
            SELECT as_of_date, COUNT(*) 
            FROM mutual_funds 
            GROUP BY as_of_date 
            ORDER BY as_of_date DESC 
            LIMIT 10
        ''')
        for r in rows:
            print(f"   Date: {r['as_of_date']} | Count: {r['count']}")
            
        # 2. NAV QUALITY
        print("\n[2] NAV QUALITY CHECK")
        total = await conn.fetchval('SELECT COUNT(*) FROM mutual_funds')
        null_nav = await conn.fetchval('SELECT COUNT(*) FROM mutual_funds WHERE latest_nav IS NULL')
        zero_nav = await conn.fetchval('SELECT COUNT(*) FROM mutual_funds WHERE latest_nav = 0')
        valid_nav = total - null_nav - zero_nav
        
        print(f"   Total Funds: {total}")
        print(f"   Valid NAV (>0): {valid_nav} ({valid_nav/total*100:.1f}%)")
        print(f"   Null NAV: {null_nav}")
        print(f"   Zero NAV: {zero_nav}")
        
        # 3. PERFORMANCE DATA INTEGRITY
        print("\n[3] PERFORMANCE METRICS INTEGRITY")
        metrics = ['one_year_return', 'ytd_return', 'returns_5y', 'sharpe_ratio']
        for m in metrics:
            val_count = await conn.fetchval(f'SELECT COUNT(*) FROM mutual_funds WHERE {m} IS NOT NULL AND {m} != 0')
            print(f"   {m}: {val_count} populated non-zero records")

        # 4. DEEP DATA CROSS-REFERENCE
        print("\n[4] DEEP DATA STRUCTURE")
        disc_count = await conn.fetchval('SELECT COUNT(*) FROM fund_disclosures')
        print(f"   Total Disclosures: {disc_count}")
        
        inv_count = await conn.fetchval('SELECT COUNT(*) FROM fund_investments')
        print(f"   Total Investment Records: {inv_count}")
        
        peers_count = await conn.fetchval('SELECT COUNT(*) FROM fund_peers')
        print(f"   Total Peer Records: {peers_count}")
        
        actions_count = await conn.fetchval('SELECT COUNT(*) FROM fund_actions')
        print(f"   Total Action Records: {actions_count}")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_analysis())
