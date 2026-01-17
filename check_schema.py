
import asyncio
import asyncpg
import os

async def main():
    db_url = os.environ.get("DATABASE_URL")
    # Disable statement cache for PgBouncer transaction mode compatibility
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        print("--- income_statements columns ---")
        rows = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'income_statements'")
        for r in rows:
            print(f"{r['column_name']} ({r['data_type']})")

        print("\n--- financial_ratios_history columns ---")
        rows = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'financial_ratios_history'")
        for r in rows:
            print(f"{r['column_name']} ({r['data_type']})")
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
