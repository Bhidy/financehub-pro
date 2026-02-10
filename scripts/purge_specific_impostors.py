
import asyncio
import os
import sys
from dotenv import load_dotenv
import asyncpg

async def main():
    load_dotenv()
    dsn = os.getenv("DATABASE_URL")
    pool = await asyncpg.create_pool(dsn, statement_cache_size=0)
    
    print("🚀 Purging Specific Saudi Impostors...")
    
    # 1. Delete 1120 and 4340 specifically (with CASCADE simulation)
    print("Deleting '1120', '4340' and dependencies...")
    dirty_symbols = ['1120', '4340']
    
    # Get any other dirty symbols (numeric in EGX)
    rows = await pool.fetch("SELECT symbol FROM market_tickers WHERE market_code = 'EGX' AND symbol ~ '^[0-9]+$'")
    dirty_symbols.extend([r['symbol'] for r in rows])
    
    # Get any TDWL symbols
    rows = await pool.fetch("SELECT symbol FROM market_tickers WHERE market_code = 'TDWL'")
    dirty_symbols.extend([r['symbol'] for r in rows])
    
    # Also get .SR symbols
    rows = await pool.fetch("SELECT symbol FROM market_tickers WHERE symbol LIKE '%.SR'")
    dirty_symbols.extend([r['symbol'] for r in rows])
    
    # Deduplicate
    dirty_symbols = list(set(dirty_symbols))
    
    if dirty_symbols:
        print(f"Targeting {len(dirty_symbols)} symbols: {dirty_symbols}")
        # Helper function to delete from table safely
        async def safely_delete(table_name):
            try:
                # print(f"Deleting from {table_name}...")
                await pool.execute(f"DELETE FROM {table_name} WHERE symbol = ANY($1::text[])", dirty_symbols)
            except Exception as e:
                print(f"⚠️ Failed to delete from {table_name}: {e}")

        # Delete from deep dependencies first (Order doesn't matter much if we catch them all, but reverse topo sort is safer)
        # List derived from find_fks.py
        tables_to_purge = [
            'company_profiles',
            'earnings_calendar',
            'fair_values',
            'financial_ratios_extended',
            'financial_ratios',
            'financial_statements',
            'ipo_history', # Note: verify if it's ipo_calendar or ipo_history. find_fks said ipo_history.
            'major_shareholders',
            'market_news',
            'ohlc_history',
            'portfolio_holdings',
            'sector_classification',
            'technical_levels',
            'volume_statistics',
            'stock_statistics', # Added previously, maybe not in FK list but useful
            'technical_indicators', # Added previously 
            'consensus_estimates', # Added previously
            'price_history', # Added previously
            'dividends', # Added previously
            'ipo_calendar' # Added previously
        ]
        
        for table in tables_to_purge:
            await safely_delete(table)
            
        # Finally delete from market_tickers
        print("Deleting from market_tickers...")
        await pool.execute("DELETE FROM market_tickers WHERE symbol = ANY($1::text[])", dirty_symbols)
    else:
        print("No dirty symbols found to delete.")
    
    # 4. Delete bad aliases
    print("Deleting bad aliases (Rajhi, Aramco)...")
    await pool.execute("DELETE FROM ticker_aliases WHERE alias_text ILIKE '%Rajhi%' OR alias_text ILIKE '%Aramco%' OR alias_text ILIKE '%Saudi%'")
    
    print("✅ Purge Complete.")
    await pool.close()

if __name__ == "__main__":
    asyncio.run(main())
