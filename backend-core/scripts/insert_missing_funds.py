#!/usr/bin/env python3
"""
Insert missing Egypt funds from Decypha list into database
"""

import asyncio
import os
import json
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')


async def main():
    print("🚀 Inserting Missing Egypt Funds")
    print("=" * 50)
    
    # Load fund list
    json_path = os.path.join(os.path.dirname(__file__), '..', 'decypha_funds_list.json')
    with open(json_path, 'r') as f:
        decypha_funds = json.load(f)
    
    print(f"📋 Decypha list has {len(decypha_funds)} funds")
    
    # Connect to database
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    # Get existing symbols
    rows = await conn.fetch('SELECT symbol FROM mutual_funds')
    existing_symbols = set(r['symbol'] for r in rows)
    print(f"📊 Database has {len(existing_symbols)} existing funds")
    
    # Find missing funds
    missing = []
    for fund in decypha_funds:
        if fund['symbol'] not in existing_symbols:
            missing.append(fund)
    
    print(f"➕ Need to insert {len(missing)} missing funds")
    
    # Insert missing funds
    inserted = 0
    for fund in missing:
        try:
            await conn.execute('''
                INSERT INTO mutual_funds (fund_id, symbol, fund_name, fund_name_en, market_code, currency)
                VALUES ($1, $2, $3, $4, 'EGX', 'EGP')
            ''', fund['symbol'], fund['symbol'], fund['name'], fund['name'])
            inserted += 1
            if inserted % 20 == 0:
                print(f"   ✅ Inserted {inserted} funds...")
        except Exception as e:
            print(f"   ❌ Error inserting {fund['symbol']}: {e}")
    
    print(f"\n🏁 Inserted {inserted}/{len(missing)} funds")
    
    # Verify final count
    count = await conn.fetchval('SELECT COUNT(*) FROM mutual_funds')
    print(f"📊 Database now has {count} total funds")
    
    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
