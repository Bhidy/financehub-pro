
import asyncio
import sys
import os
import re

# Add backend-core to path
sys.path.append(os.path.join(os.getcwd(), 'backend-core'))

from app.chat.text_normalizer import extract_potential_symbols
from app.chat.chat_service import ChatService

# Mock Connection
class MockConn:
    def __init__(self):
        self._pool = None
    async def fetch(self, query, *args): return []
    async def fetchval(self, query, *args): return None
    async def fetchrow(self, query, *args): return None

async def reproduction():
    print("--- REPRODUCTION: 'Compare JUFO to its competitors' ---")
    query = "Compare JUFO to its competitors"
    
    # 1. Test Regex Extraction
    print(f"Query: '{query}'")
    symbols = extract_potential_symbols(query)
    print(f"Extracted Symbols (Regex): {symbols}")
    
    if "ITS" in symbols:
        print("❌ CRITICAL FAIL: 'ITS' extracted as symbol.")
    else:
        print("✅ Regex PASS: 'ITS' ignored.")

    # 2. Test specific ChatService logic (if possible without full DB)
    # The logic in ChatService._is_symbol_like_token might be relevant
    
    # 3. Test Stopwords List (if accessible)
    # Checking if 'its' is in common exclusion entries
    
if __name__ == "__main__":
    asyncio.run(reproduction())
