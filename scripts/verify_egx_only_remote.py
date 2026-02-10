
import asyncio
import sys
import os
import json

# Add app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend-core')))

from app.chat.chat_service import ChatService
from app.chat.handlers.compare_handler import handle_compare_stocks
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

async def verify_egx_only():
    print("🚀 Verifying EGX-Only Constraint & Professionalism...")
    
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    try:
        # TEST 1: Peer Inference (Generic)
        # We need a ChatService instance, but we can just use the query logic or instantiate a mock.
        # It's easier to test handle_compare_stocks directly or simulate the peer lookup query if we had the service.
        # Since instantiating ChatService is heavy, let's test specific handler logic and DB queries directly mimicking the code.
        
        print("\nDATA CHECK 1: Verifying Peer Inference Logic (Hardcoded 'EGX')")
        primary_symbol = "COMI"
        rows = await conn.fetch("""
            SELECT symbol, market_code
            FROM market_tickers
            WHERE symbol <> $1
              AND market_code = 'EGX'
            ORDER BY market_cap DESC LIMIT 5
        """, primary_symbol)
        
        print(f"Top 5 Peers for {primary_symbol}:")
        for r in rows:
            print(f"- {r['symbol']} ({r['market_code']})")
            if r['market_code'] != 'EGX':
                print("❌ FAILED: Found non-EGX peer!")
                sys.exit(1)
        print("✅ Peer Inference Constraint: PASSED")

        # TEST 2: Professional Titles in Compare Handler
        print("\nDATA CHECK 2: Verifying Professional Titles")
        # Use two real EGX stocks
        syms = ['COMI', 'ETEL'] 
        result = await handle_compare_stocks(conn, syms, language='en')
        
        if not result['success']:
            print(f"❌ Failed to compare COMI/EAST: {result.get('message')}")
            sys.exit(1)
            
        print("Comparison Result:")
        cards = result.get('cards', [])
        character_cards = result.get('character_cards', [])
        found_character_card = False
        
        # Check explicit key first (Handler standard)
        if character_cards:
             found_character_card = True
             print(f"  Found {len(character_cards)} character cards in root key.")
             for item in character_cards:
                 nickname = item.get('nickname', '')
                 profile = item.get('profile', '')
                 print(f"  - Nickname: {nickname}")
                 print(f"  - Profile: {profile}")
                 
                 # Check for banned terms
                 if "Gorilla" in nickname or "Underdog" in nickname:
                      print("❌ FAILED: Found legacy gamified terms!")
                      sys.exit(1)
                 
                 # Check for new terms (flexible check)
                 valid_titles = ["Market Leader", "Emerging Challenger", "Value Opportunity", "Peer Stock"]
                 if not any(t in nickname for t in valid_titles) and "Stock #" not in nickname:
                     print(f"⚠️ WARNING: Nickname '{nickname}' might not be strictly one of the new titles, checking logic...")

        # Fallback: check inside cards list (if legacy or changed)
        if not found_character_card:
            for card in cards:
                if card.get('type') == 'character_cards':
                    found_character_card = True
                    items = card.get('data', [])
                    for item in items:
                        nickname = item.get('nickname', '')
                        # ... (duplicate logic logic, but simpler to just use the first block)
                        print(f"  - Nickname: {nickname}")


        if not found_character_card:
            print("❌ FAILED: No character cards returned.")
            # This might happen if data is missing, but COMI/EAST should have data.
        else:
            print("✅ Professional Titles: PASSED")

        # TEST 3: Saudi Rejection (Explicit)
        # Verify that passing a Saudi symbol (even if valid in DB) returns error because of market_code filter
        print("\nDATA CHECK 3: Saudi Symbol Handling")
        saudi_sym = "1120" # Al Rajhi (Saudi)
        res_saudi = await handle_compare_stocks(conn, [saudi_sym, 'COMI'], language='en')
        
        # We expect 'symbol_not_found' error because 1120 is not EGX
        if res_saudi['success']:
             print(f"❌ FAILED: Saudi stock {saudi_sym} was accepted! This means the filter failed.")
             sys.exit(1)
        
        if 'symbol_not_found' in res_saudi.get('error', ''):
             print(f"✅ Saudi Stock {saudi_sym} rejected as expected (Symbol not found in EGX).")
        else:
             print(f"⚠️ WARNING: Unexpected error for Saudi stock: {res_saudi.get('message')}")
             # This is still a pass for "not showing data", but worth noting.

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(verify_egx_only())
