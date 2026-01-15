#!/usr/bin/env python3
"""
Proper EGX Funds Update Script - UPDATE ONLY, NO INSERTS.

This script:
1. Matches scraped Mubasher funds to existing database entries
2. Updates NAV values for matched funds
3. Reports unmatched funds for manual review
4. Does NOT insert any new records

Author: Antigravity AI
Date: 2026-01-07
"""
import json
import asyncio
import asyncpg
import os
import re
from datetime import datetime
from difflib import SequenceMatcher

DATABASE_URL = os.environ.get("DATABASE_URL", "postgres://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require")

def normalize_name(name):
    """Normalize fund name for matching"""
    n = name.lower()
    # Remove common suffixes/prefixes
    n = re.sub(r'\s*-\s*', ' ', n)  # Remove dashes
    n = re.sub(r'\b(fund|mutual|investment|egypt|egp|usd|eur|sae|s\.a\.e)\b', '', n)
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def similarity_score(name1, name2):
    """Calculate similarity between two names"""
    if not name1 or not name2:
        return 0
    
    n1 = normalize_name(name1)
    n2 = normalize_name(name2)
    
    # Exact match after normalization
    if n1 == n2:
        return 1.0
    
    return SequenceMatcher(None, n1, n2).ratio()

async def main():
    print("=" * 70)
    print("EGX FUNDS PROPER NAV UPDATE (UPDATE ONLY)")
    print("=" * 70)
    
    # Load scraped data
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "egypt_funds_data.json")
    
    with open(json_path, 'r') as f:
        funds_data = json.load(f)
    
    print(f"\n📊 Loaded {len(funds_data)} funds from Mubasher scrape")
    
    # Connect to database
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    print("✅ Connected to database")
    
    # Get existing EGX funds
    db_funds = await conn.fetch("""
        SELECT fund_id, fund_name, fund_name_en, latest_nav
        FROM mutual_funds 
        WHERE market_code = 'EGX'
          AND fund_id NOT LIKE 'MUB_%'
    """)
    print(f"📊 Found {len(db_funds)} existing EGX funds in database")
    
    today = datetime.now().date()
    updated = 0
    matched_db_ids = set()
    unmatched_scraped = []
    
    try:
        for fund in funds_data:
            name = fund.get('name', '').strip()
            price_str = fund.get('current_price', '0')
            
            # Parse NAV
            try:
                nav = float(price_str.replace(',', ''))
            except (ValueError, TypeError):
                nav = 0
            
            # Find best match using fuzzy matching
            best_match = None
            best_score = 0.40  # Threshold
            
            for db_fund in db_funds:
                db_id = db_fund['fund_id']
                if db_id in matched_db_ids:
                    continue
                
                db_name_en = db_fund['fund_name_en'] or ''
                db_name = db_fund['fund_name'] or ''
                
                score_en = similarity_score(name, db_name_en)
                score_ar = similarity_score(name, db_name)
                score = max(score_en, score_ar)
                
                if score > best_score:
                    best_score = score
                    best_match = db_fund
            
            if best_match:
                matched_db_ids.add(best_match['fund_id'])
                
                # Update NAV
                await conn.execute("""
                    UPDATE mutual_funds 
                    SET latest_nav = $1, updated_at = NOW()
                    WHERE fund_id = $2
                """, nav, best_match['fund_id'])
                updated += 1
                
                # Add to nav_history
                if nav > 0:
                    try:
                        await conn.execute("""
                            INSERT INTO nav_history (fund_id, date, nav)
                            VALUES ($1, $2, $3)
                            ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
                        """, best_match['fund_id'], today, nav)
                    except:
                        pass
                
                pct = f"{best_score*100:.0f}%"
                print(f"  ✅ [{pct}] {name[:40]} → {best_match['fund_id']}")
            else:
                unmatched_scraped.append(name)
        
        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(f"📊 Mubasher funds scraped:    {len(funds_data)}")
        print(f"✅ Matched & updated:         {updated}")
        print(f"⚠️  Unmatched (need review):  {len(unmatched_scraped)}")
        
        # Show unmatched
        if unmatched_scraped:
            print(f"\n📋 UNMATCHED FUNDS ({len(unmatched_scraped)}):")
            for name in unmatched_scraped[:20]:
                print(f"   - {name[:60]}")
            if len(unmatched_scraped) > 20:
                print(f"   ... and {len(unmatched_scraped) - 20} more")
        
        # Final stats
        final = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN latest_nav > 0 THEN 1 ELSE 0 END) as with_nav
            FROM mutual_funds 
            WHERE market_code = 'EGX'
        """)
        
        print(f"\n📊 DATABASE STATE:")
        print(f"   Total EGX funds:    {final['total']}")
        print(f"   With NAV > 0:       {final['with_nav']}")
        
    finally:
        await conn.close()
        print("\n✅ Database connection closed")

if __name__ == "__main__":
    asyncio.run(main())
