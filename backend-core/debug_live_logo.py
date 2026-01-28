import asyncio
import os
from app.db.session import get_db_pool
from app.chat.handlers.price_handler import handle_stock_price

# Mock the data needed for the handler
async def test_handler():
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # 1. Direct DB Check
            row = await conn.fetchrow("SELECT logo_url FROM market_tickers WHERE symbol = 'COMI'")
            print(f"DEBUG: DB logo_url for COMI: {row['logo_url']}")
            
            # 2. Handler Check
            # Simulate params for handle_stock_price
            result = await handle_stock_price(
                conn=conn,
                symbol='COMI',
                market_code='EGX',
                language='en'
            )
            
            # Check the cards
            cards = result.get('cards', [])
            header = next((c for c in cards if c['type'] == 'stock_header'), None)
            
            if header:
                print(f"DEBUG: Handler Header Data: {header.get('data')}")
                print(f"DEBUG: Handler logo_url: {header['data'].get('logo_url')}")
            else:
                print("DEBUG: No stock_header card found")

    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    # Setup env for DB connection if needed, but we rely on .env usually loaded by config
    # We might need to manually load env if running as standalone script
    from dotenv import load_dotenv
    load_dotenv()
    
    asyncio.run(test_handler())
