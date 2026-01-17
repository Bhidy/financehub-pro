
import asyncio
import os
import asyncpg

async def main():
    db_url = os.environ.get("DATABASE_URL")
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    
    new_columns = [
        ("ebitda", "NUMERIC"),
        ("ebitda_margin", "NUMERIC"),
        ("ebit", "NUMERIC"),
        ("ebit_margin", "NUMERIC")
    ]
    
    try:
        for col, dtype in new_columns:
            try:
                print(f"Adding column {col}...")
                await conn.execute(f"ALTER TABLE income_statements ADD COLUMN IF NOT EXISTS {col} {dtype}")
                print(f"Added {col}.")
            except Exception as e:
                print(f"Error adding {col}: {e}")
                
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
