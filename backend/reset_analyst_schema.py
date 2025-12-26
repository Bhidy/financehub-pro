import asyncio
import asyncpg
import logging

logging.basicConfig(level=logging.INFO)

async def reset_schema():
    conn = await asyncpg.connect('postgresql://home@localhost/mubasher_db')
    
    logging.info("Dropping old table...")
    await conn.execute("DROP TABLE IF EXISTS analyst_ratings CASCADE")
    
    logging.info("Creating new table...")
    await conn.execute("""
        CREATE TABLE analyst_ratings (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20) NOT NULL,
            analyst_firm TEXT NOT NULL,
            rating VARCHAR(20),
            target_price DECIMAL(12, 4),
            current_price DECIMAL(12, 4),
            target_upside DECIMAL(10, 4),
            rating_date DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)
    logging.info("Done.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(reset_schema())
