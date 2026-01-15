#!/usr/bin/env python3
"""
Batch update Egypt fund NAV data from scraped Mubasher data.
Uses the JSON file containing all 191 funds from 10 pages.
"""
import json
import asyncio
import asyncpg
import os
from datetime import datetime

DATABASE_URL = os.environ.get("DATABASE_URL", "postgres://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require")

async def main():
    print("=" * 60)
    print("EGYPT FUNDS NAV BATCH UPDATE")
    print("=" * 60)
    
    # Load the scraped data
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "egypt_funds_data.json")
    
    with open(json_path, 'r') as f:
        funds_data = json.load(f)
    
    print(f"\n📊 Loaded {len(funds_data)} funds from JSON file")
    
    # Connect to database
    conn = await asyncpg.connect(DATABASE_URL)
    print("✅ Connected to database")
    
    today = datetime.now().date()
    updated = 0
    nav_inserted = 0
    matched = 0
    errors = []
    
    try:
        for fund in funds_data:
            fund_id_mubasher = fund.get('fund_id', '')
            name = fund.get('name', '')
            price_str = fund.get('current_price', '0')
            manager = fund.get('manager', '')
            owner = fund.get('owner', '')
            
            # Parse price - handle commas
            try:
                nav = float(price_str.replace(',', ''))
            except (ValueError, TypeError):
                # Skip funds with non-numeric prices (like "Odin Investments")
                continue
            
            if nav <= 0:
                continue
            
            # Try to match by name similarity
            result = await conn.fetchrow("""
                SELECT fund_id, fund_name_en, latest_nav 
                FROM mutual_funds 
                WHERE market_code = 'EGX'
                  AND (
                      fund_name_en ILIKE '%' || $1 || '%'
                      OR fund_name ILIKE '%' || $1 || '%'
                  )
                ORDER BY 
                    CASE WHEN fund_name_en = $1 THEN 0 ELSE 1 END,
                    LENGTH(fund_name_en)
                LIMIT 1
            """, name[:40])
            
            if result:
                matched += 1
                db_fund_id = result['fund_id']
                old_nav = result['latest_nav'] or 0
                
                # Update latest_nav in mutual_funds
                await conn.execute("""
                    UPDATE mutual_funds 
                    SET latest_nav = $1, updated_at = NOW()
                    WHERE fund_id = $2
                """, nav, db_fund_id)
                updated += 1
                
                # Insert into nav_history
                try:
                    await conn.execute("""
                        INSERT INTO nav_history (fund_id, date, nav)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
                    """, db_fund_id, today, nav)
                    nav_inserted += 1
                except Exception as e:
                    errors.append(f"NAV insert error for {db_fund_id}: {e}")
                
                print(f"  ✅ Updated: {name[:50]} | NAV: {old_nav:.2f} → {nav:.2f}")
            else:
                print(f"  ⚠️  No match: {name[:50]}")
        
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"📊 Total funds in JSON:    {len(funds_data)}")
        print(f"✅ Matched in database:    {matched}")
        print(f"📝 NAV values updated:     {updated}")
        print(f"📈 NAV history inserted:   {nav_inserted}")
        
        if errors:
            print(f"⚠️  Errors: {len(errors)}")
            for err in errors[:5]:
                print(f"   - {err}")
        
        # Also show count of EGX funds with NAV > 0
        nav_count = await conn.fetchval("""
            SELECT COUNT(*) FROM mutual_funds 
            WHERE market_code = 'EGX' AND latest_nav > 0
        """)
        print(f"\n📊 EGX funds with NAV > 0: {nav_count}")
        
    finally:
        await conn.close()
        print("\n✅ Database connection closed")

if __name__ == "__main__":
    asyncio.run(main())
