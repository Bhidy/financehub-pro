
import asyncio
import os
import sys
from app.db.session import db
from app.chat.handlers.fund_handler import handle_fund_search, handle_fund_nav

# Set env for DB connection if needed (it should be set in space)
# But db.session uses env vars.

async def debug_funcs():
    print("Connecting to DB...")
    await db.connect()
    
    print("\n--- Testing handle_fund_search ---")
    try:
        if db._pool:
            async with db._pool.acquire() as conn:
                res = await handle_fund_search(conn, language="en")
                print("Result:", res.get("success"), str(res)[:100])
    except Exception as e:
        print(f"ERROR in search: {e}")
        import traceback
        traceback.print_exc()

    print("\n--- Testing handle_fund_nav (2742) ---")
    try:
        if db._pool:
            async with db._pool.acquire() as conn:
                res = await handle_fund_nav(conn, "2742", language="en")
                print("Result:", res.get("success"), str(res)[:100])
    except Exception as e:
        print(f"ERROR in nav: {e}")
        traceback.print_exc()

    await db.close()

if __name__ == "__main__":
    asyncio.run(debug_funcs())
