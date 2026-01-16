import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect('postgresql://home@localhost/mubasher_db')
    
    insider = await conn.fetchval('SELECT count(*) FROM insider_trading')
    corp = await conn.fetchval('SELECT count(*) FROM corporate_actions')
    
    print(f"Insider Trades: {insider}")
    print(f"Corporate Actions: {corp}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
