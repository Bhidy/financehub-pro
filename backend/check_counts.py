import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect('postgresql://home@localhost/mubasher_db')
    count = await conn.fetchval('SELECT count(*) FROM mutual_funds')
    print(f"Mutual Funds Count: {count}")
    
    # Check history count too
    hist = await conn.fetchval('SELECT count(*) FROM nav_history')
    print(f"NAV History Count: {hist}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
