"""
Verify the banking sector fix by simulating the new query logic.
"""

import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv()


async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL not set")
        return
    
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    
    print("=" * 80)
    print("  BANKING SECTOR FIX VERIFICATION")
    print("=" * 80)
    
    # NEW FIXED QUERY - matches only %bank% and excludes non-bank industries
    search_terms = ["%bank%"]
    excluded_industries = [
        'investors, not elsewhere classified',
        'security and commodity brokers, dealers, exchanges, and services',
        'security brokers, dealers, and flotation companies',
        'insurance carriers',
    ]
    
    sql = """
        SELECT symbol, name_en, sector_name, industry
        FROM market_tickers
        WHERE (LOWER(sector_name) LIKE ANY($1) OR LOWER(industry) LIKE ANY($1))
          AND LOWER(COALESCE(industry, '')) != ALL($2)
        ORDER BY market_cap DESC NULLS LAST
        LIMIT 30
    """
    
    rows = await conn.fetch(sql, search_terms, excluded_industries)
    
    print(f"\n✅ BANKING SECTOR RESULTS ({len(rows)} stocks):")
    print("-" * 80)
    
    problem_stocks = ['TMGH', 'VLMRA', 'VLMR', 'HRHO', 'BTFH', 'MOIN', 'OFH']
    found_problems = []
    
    for row in rows:
        symbol = row['symbol']
        name = row['name_en'] or ''
        sector = row['sector_name'] or 'N/A'
        industry = row['industry'] or 'N/A'
        
        if symbol in problem_stocks:
            found_problems.append(symbol)
            print(f"  ❌ {symbol:8} | {name[:40]:<40} | {sector}")
        else:
            print(f"  ✓  {symbol:8} | {name[:40]:<40} | {sector}")
    
    await conn.close()
    
    print("\n" + "=" * 80)
    if found_problems:
        print(f"  ❌ FAILED: Found {len(found_problems)} problem stocks: {', '.join(found_problems)}")
        return False
    else:
        print("  ✅ SUCCESS: No misclassified stocks found in banking results!")
        print("=" * 80)
        return True


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
