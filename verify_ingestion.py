
import asyncio
import asyncpg
import os

async def verify_ingestion_stats():
    print("--- VERIFYING INGESTION STATS ---")
    conn = await asyncpg.connect(os.environ["DATABASE_URL"], statement_cache_size=0)
    
    # 1. Total Tickers Backfilled
    tickers_count = await conn.fetchval("SELECT COUNT(*) FROM market_tickers")
    print(f"Total Tickers: {tickers_count}")
    
    # 2. Financial Metrics Depth
    # Check a few random stocks for key newly added metrics
    metrics_check = await conn.fetch("""
        SELECT symbol, debt_ebitda, asset_turnover, quick_ratio 
        FROM financial_ratios_history 
        WHERE period_type = 'TTM' AND period_ending >= '2024-01-01'
        LIMIT 5
    """)
    print("\nSample Financial Metrics (TTM):")
    for row in metrics_check:
        print(dict(row))
        
    # 3. Income Statement Depth
    income_check = await conn.fetchval("""
        SELECT COUNT(*) FROM income_statements WHERE ebitda IS NOT NULL
    """)
    print(f"\nRows with EBITDA populated: {income_check}")
    
    # 4. OHLC Data Depth
    ohlc_count = await conn.fetchval("SELECT COUNT(*) FROM ohlc_data")
    print(f"\nTotal Price Candles (OHLC): {ohlc_count}")
    
    # 5. Last Update Timestamps
    last_updates = await conn.fetch("""
        SELECT symbol, last_updated 
        FROM market_tickers 
        ORDER BY last_updated DESC 
        LIMIT 5
    """)
    print("\nMost Recently Updated Tickers:")
    for row in last_updates:
        print(f"{row['symbol']}: {row['last_updated']}")

    await conn.close()
    print("\n--- VERIFICATION COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(verify_ingestion_stats())
