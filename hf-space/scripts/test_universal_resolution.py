import asyncio
import os
from dotenv import load_dotenv
import asyncpg
from app.chat.chat_service import process_message
from app.chat.schemas import Intent

load_dotenv()

async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url: return
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    
    try:
        print("\n--- Universal Resolution Test ---")
        
        test_cases = [
            ("Price of Shield", "Should resolve to Fund 2664 (Shield)"),
            ("سعر صندوق شيلد", "Should resolve to Fund 2664 (Shield)"),
            ("سعر سهم اسمنت", "Should resolve to a Cement Stock (e.g. SCEM/MBSC)"),
            ("Fund 2664", "Should resolve to Fund 2664 directly"),
            ("Price of Tawazon", "Should resolve to Fund Tawazon"),
        ]
        
        for msg, expected in test_cases:
            print(f"\nQuery: '{msg}'")
            print(f"Expect: {expected}")
            
            response = await process_message(conn, msg)
            
            print(f"  Intent: {response.meta.intent}")
            print(f"  Entities: {response.meta.entities}")
            print(f"  Message: {response.message_text[:100]}...")
            
            # Validation
            if "Shield" in msg and response.meta.entities.get('fund_id') == '2664':
                 print("  ✅ SUCCESS: Fund Resolved Correctly")
            elif "Tawazon" in msg and response.meta.entities.get('fund_id') == '2673':
                 print("  ✅ SUCCESS: Fund Resolved Correctly")
            elif "اسمنت" in msg and response.meta.entities.get('symbol'):
                 print(f"  ✅ SUCCESS: Stock Resolved to {response.meta.entities.get('symbol')}")
            elif "Fund 2664" in msg and response.meta.entities.get('fund_id') == '2664':
                 print("  ✅ SUCCESS: Direct ID Resolved")
            else:
                 print("  ❌ WARNING: Resolution Mismatch (check injection status)")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
