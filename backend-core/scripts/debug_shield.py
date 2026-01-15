import asyncio
import os
from dotenv import load_dotenv
import asyncpg
from app.chat.symbol_resolver import SymbolResolver, normalize_text

load_dotenv()

async def main():
    db_url = os.getenv("DATABASE_URL")
    conn = await asyncpg.connect(db_url)
    resolver = SymbolResolver(conn)
    
    query = "shield"
    normalized = normalize_text(query).normalized
    print(f"Query: {query} -> {normalized}")
    
    # Check Ticker Aliases
    print("\n--- Checking Ticker Aliases ---")
    row = await conn.fetchrow("SELECT * FROM ticker_aliases WHERE alias_text_norm = $1", normalized)
    if row:
        print(f"FOUND in ticker_aliases: {row}")
    else:
        print("NOT FOUND in ticker_aliases")

    # Check Fund Aliases
    print("\n--- Checking Fund Aliases ---")
    row = await conn.fetchrow("SELECT * FROM fund_aliases WHERE alias_text_norm = $1", normalized)
    if row:
        print(f"FOUND in fund_aliases: {row}")
    else:
        print("NOT FOUND in fund_aliases")
        
    # Check Resolver Methods
    print("\n--- Checking Resolver Methods ---")
    
    res = await resolver._match_exact_ticker(normalized, None)
    print(f"1. Exact Ticker: {res.symbol if res else 'None'} ({res.entity_type if res else ''})")
    
    res = await resolver._match_alias(normalized, None)
    print(f"2. Alias: {res.symbol if res else 'None'} ({res.entity_type if res else ''})")
    
    res = await resolver._match_name(normalized, None)
    print(f"3. Name: {res.symbol if res else 'None'} ({res.entity_type if res else ''})")
    
    res = await resolver._match_fuzzy(normalized, None)
    print(f"4. Fuzzy: {res.symbol if res else 'None'} ({res.entity_type if res else ''})")
    
    res = await resolver._match_fund(normalized)
    print(f"5. Fund: {res.symbol if res else 'None'} ({res.entity_type if res else ''})")
    
    # Full Resolve
    print("\n--- Full Resolve ---")
    res = await resolver.resolve(query)
    if res:
        print(f"RESOLVED TO: {res.symbol} ({res.entity_type})")
    else:
        print("FAILED TO RESOLVE")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
