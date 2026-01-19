
import asyncio
import os
import asyncpg

# Get DB URL from environment or hardcode for this check (using the one from logs/env)
# From fetch_logs: Connected to Database: aws-1-eu-central-1.pooler.supabase.com...
# I need the exact URL. I will assume it is passed as ENV or valid in context.
# I'll use the one from .env if possible, but I don't have it locally.
# I will use a simple query to list columns.

# Note: The server has the env vars. I will run this ON THE SERVER.

async def main():
    try:
        # Pydantic settings load .env but here we just need to run in the container
        # which already has the env vars.
        url = os.environ.get("DATABASE_URL")
        print(f"Connecting to DB...") 
        conn = await asyncpg.connect(url)
        
        print("Fetching columns for market_tickers...")
        rows = await conn.fetch("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'market_tickers'
        """)
        print("Columns:", [r['column_name'] for r in rows])
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
