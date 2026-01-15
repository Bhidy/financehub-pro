"""
Debug script to identify stocks that would be incorrectly matched
as "Banking" sector due to overly broad pattern matching.
"""

import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv()


BANKING_TERMS = ["%bank%", "%finan%", "%insur%", "%broker%", "%invest%"]

# True banking sector keywords that should be exact
TRUE_BANKING_SECTORS = ['banks', 'banking', 'bank']


async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL not set")
        return
    
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    
    print("=" * 80)
    print("  SECTOR CLASSIFICATION ANALYSIS")
    print("=" * 80)
    
    # Query all stocks that would match the current banking pattern
    sql = """
        SELECT symbol, name_en, sector_name, industry
        FROM market_tickers
        WHERE (LOWER(sector_name) LIKE ANY($1) OR LOWER(industry) LIKE ANY($1))
        ORDER BY market_cap DESC NULLS LAST
    """
    
    rows = await conn.fetch(sql, BANKING_TERMS)
    
    true_banks = []
    misclassified = []
    
    for row in rows:
        symbol = row['symbol']
        name = row['name_en'] or ''
        sector = (row['sector_name'] or '').lower()
        industry = (row['industry'] or '').lower()
        
        # Check if it's truly a bank
        is_true_bank = (
            'bank' in sector or
            'bank' in industry or
            'bank' in name.lower()
        )
        
        if is_true_bank:
            true_banks.append({
                'symbol': symbol,
                'name': name,
                'sector': row['sector_name'],
                'industry': row['industry']
            })
        else:
            misclassified.append({
                'symbol': symbol,
                'name': name,
                'sector': row['sector_name'],
                'industry': row['industry'],
                'reason': 'Matched by %invest% or %finan% but not a bank'
            })
    
    print(f"\n✅ TRUE BANKING STOCKS ({len(true_banks)}):")
    print("-" * 80)
    for stock in true_banks[:20]:
        print(f"  {stock['symbol']:8} | {stock['name'][:40]:<40} | {stock['sector'] or 'N/A'}")
    
    print(f"\n⚠️  MISCLASSIFIED STOCKS ({len(misclassified)}):")
    print("-" * 80)
    for stock in misclassified:
        print(f"  {stock['symbol']:8} | {stock['name'][:40]:<40} | Sector: {stock['sector'] or 'N/A'}")
        print(f"           Industry: {stock['industry'] or 'N/A'}")
        print()
    
    await conn.close()
    
    print("=" * 80)
    print(f"  SUMMARY: {len(true_banks)} true banks, {len(misclassified)} misclassified")
    print("=" * 80)
    
    return misclassified


if __name__ == "__main__":
    asyncio.run(main())
