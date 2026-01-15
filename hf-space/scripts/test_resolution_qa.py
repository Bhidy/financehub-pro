"""
Enterprise Resolution Verification Test.

Tests the new ranked multi-candidate resolver against
a comprehensive set of Arabic + English queries.
"""

import asyncio
import os
from dotenv import load_dotenv
import asyncpg
from app.chat.symbol_resolver import SymbolResolver

load_dotenv()


# Test cases: (query, expected_symbol, expected_entity_type, description)
TEST_CASES = [
    # Arabic Nicknames
    ("التجاري", "COMI", "stock", "Arabic short nickname"),
    ("التجاري الدولي", "COMI", "stock", "Arabic full nickname"),
    ("البنك التجاري الدولي", "COMI", "stock", "Arabic with prefix"),
    ("بالم هيلز", "PHDC", "stock", "Palm Hills Arabic"),
    ("طلعت مصطفى", "TMGH", "stock", "Talaat Mostafa"),
    ("حديد عز", "ESRS", "stock", "Ezz Steel"),
    ("هيرميس", "HRHO", "stock", "Hermes"),
    ("السويدي", "SWDY", "stock", "Sewedy"),
    ("فوري", "FWRY", "stock", "Fawry"),
    ("المصرية للاتصالات", "ETEL", "stock", "Telecom Egypt AR"),
    
    # English Nicknames
    ("CIB", "COMI", "stock", "English abbreviation"),
    ("Palm Hills", "PHDC", "stock", "Palm Hills EN"),
    ("Ezz Steel", "ESRS", "stock", "Ezz Steel EN"),
    ("EFG Hermes", "HRHO", "stock", "EFG Hermes"),
    ("Fawry", "FWRY", "stock", "Fawry EN"),
    ("Sewedy", "SWDY", "stock", "Sewedy EN"),
    
    # Exact Tickers
    ("COMI", "COMI", "stock", "Exact ticker"),
    ("SWDY", "SWDY", "stock", "Exact ticker"),
    ("TMGH", "TMGH", "stock", "Exact ticker"),
    
    # With Prefixes
    ("سعر التجاري", "COMI", "stock", "With price prefix"),
    ("سهم بالم هيلز", "PHDC", "stock", "With stock prefix"),
    ("شركة طلعت مصطفى", "TMGH", "stock", "With company prefix"),
    
    # Partial/Fuzzy
    ("commercial international", "COMI", "stock", "Partial name EN"),
    ("eastern tobacco", "EAST", "stock", "Eastern Tobacco"),
    
    # Funds (should resolve with fund entity type)
    ("Shield", "2664", "fund", "Shield fund nickname"),
    ("Tawazon", "2673", "fund", "Tawazon fund"),
]


async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL not set")
        return
    
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    resolver = SymbolResolver(conn)
    
    print("=" * 70)
    print("  ENTERPRISE RESOLUTION VERIFICATION")
    print("=" * 70)
    
    passed = 0
    failed = 0
    
    for query, expected_symbol, expected_type, description in TEST_CASES:
        result = await resolver.resolve(query)
        
        if result:
            symbol_ok = result.symbol == expected_symbol
            type_ok = result.entity_type == expected_type
            score = result.confidence * 100
            
            if symbol_ok and type_ok:
                print(f"✅ {description}")
                print(f"   Query: '{query}' → {result.symbol} ({result.entity_type}, score: {score:.0f}%)")
                passed += 1
            else:
                print(f"❌ {description}")
                print(f"   Query: '{query}'")
                print(f"   Expected: {expected_symbol} ({expected_type})")
                print(f"   Got:      {result.symbol} ({result.entity_type}, score: {score:.0f}%)")
                failed += 1
        else:
            print(f"❌ {description}")
            print(f"   Query: '{query}' → NO MATCH")
            print(f"   Expected: {expected_symbol} ({expected_type})")
            failed += 1
        print()
    
    await conn.close()
    
    print("=" * 70)
    print(f"  RESULTS: {passed} passed, {failed} failed")
    print(f"  Success Rate: {passed / (passed + failed) * 100:.1f}%")
    print("=" * 70)
    
    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
