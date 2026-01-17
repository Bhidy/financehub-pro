
import asyncio
import os
import asyncpg

async def main():
    db_url = os.environ.get("DATABASE_URL")
    print(f"Connecting to {db_url}...")
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    
    new_columns = [
        ("debt_ebitda", "NUMERIC"),
        ("debt_fcf", "NUMERIC"),
        ("asset_turnover", "NUMERIC"),
        ("inventory_turnover", "NUMERIC"),
        ("quick_ratio", "NUMERIC"),
        ("current_ratio", "NUMERIC"),
        ("roce", "NUMERIC"),
        ("earnings_yield", "NUMERIC"),
        ("fcf_yield", "NUMERIC")
    ]
    
    try:
        for col, dtype in new_columns:
            try:
                print(f"Adding column {col}...")
                await conn.execute(f"ALTER TABLE financial_ratios_history ADD COLUMN IF NOT EXISTS {col} {dtype}")
                print(f"Added {col}.")
            except Exception as e:
                print(f"Error adding {col}: {e}")
                
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
