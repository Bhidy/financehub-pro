
import asyncio
import asyncpg
import os
import json
from app.chat.handlers.financials_handler import handle_financials

# Database URL
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres")


async def main():
    db_url = os.environ.get("DATABASE_URL")
    print(f"DEBUG ENV DB_URL: {db_url}")
    
    if not db_url:
        db_url = "postgresql://postgres:postgres@localhost:54322/postgres"
        print(f"Using default: {db_url}")

    print("Connecting to database...")
    try:
        pool = await asyncpg.create_pool(
            db_url,
            min_size=2,
            max_size=10,
            statement_cache_size=0,
            command_timeout=60
        )
        conn = await pool.acquire()
        print("Connected.")
    except Exception as e:
        print(f"Connection failed to {db_url}: {e}")
        # Try port 5432 fallback
        try:
             db_url = "postgresql://postgres:postgres@localhost:5432/postgres"
             print(f"Retrying with 5432: {db_url}")
             pool = await asyncpg.create_pool(
                db_url,
                min_size=2,
                max_size=10,
                statement_cache_size=0,
                command_timeout=60
            )
             conn = await pool.acquire()
             print("Connected to 5432.")
        except Exception as e2:
             print(f"Connection failed to 5432: {e2}")
             return

    symbol = "COMI"
    print(f"Testing handle_financials for {symbol}...")

    # Test Income Statement
    print("\n--- Income Statement ---")
    result = await handle_financials(conn, symbol, statement_type='income')
    print(json.dumps(result, indent=2, default=str))

    # Test Balance Sheet
    print("\n--- Balance Sheet ---")
    result = await handle_financials(conn, symbol, statement_type='balance')
    print(json.dumps(result, indent=2, default=str))

    # Test Ratios
    print("\n--- Ratios ---")
    # Note: Ratios logic in handle_financials currently pulls from market_tickers + raw_data, 
    # but let's see what it returns.
    # Actually handle_financials returns a response with cards.
    # The 'ratios' card is appended if data exists.
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
