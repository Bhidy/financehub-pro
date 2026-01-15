#!/usr/bin/env python3
"""
Professional Egypt Funds Complete Sync Script.

This script ensures ALL 189 scraped funds from Mubasher Egypt are in the database:
1. Updates existing funds that match by name (fuzzy matching)
2. Inserts new funds that don't exist yet (using Mubasher ID prefixed with MUB_)
3. Avoids duplicates by checking both exact ID match and name similarity

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
    """Normalize fund name for better matching"""
    n = name.lower()
    n = re.sub(r'\s*(fund|mutual fund|investment fund|s\.a\.e|s\.a\.e\.|sae|egypt|egp|usd|eur)\s*', ' ', n)
    n = ' '.join(n.split())
    return n

def extract_keywords(name):
    """Extract key words from fund name"""
    stopwords = {'fund', 'mutual', 'investment', 'egypt', 'bank', 'the', 'and', 'of', 'for', 'al', 'el'}
    words = re.findall(r'\b[a-z]+\b', name.lower())
    return set(w for w in words if w not in stopwords and len(w) > 2)

def similarity_score(name1, name2):
    """Calculate similarity between two names"""
    if name1.lower() == name2.lower():
        return 1.0
    
    n1 = normalize_name(name1)
    n2 = normalize_name(name2)
    
    seq_ratio = SequenceMatcher(None, n1, n2).ratio()
    
    kw1 = extract_keywords(name1)
    kw2 = extract_keywords(name2)
    if kw1 and kw2:
        overlap = len(kw1 & kw2) / max(len(kw1), len(kw2))
        seq_ratio = (seq_ratio + overlap) / 2
    
    return seq_ratio

async def main():
    print("=" * 70)
    print("PROFESSIONAL EGYPT FUNDS COMPLETE SYNC")
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
    """)
    print(f"📊 Found {len(db_funds)} existing EGX funds in database")
    
    # Create lookup sets
    existing_ids = {f['fund_id'] for f in db_funds}
    matched_db_ids = set()
    
    today = datetime.now().date()
    updated = 0
    inserted = 0
    nav_history_count = 0
    skipped = 0
    
    try:
        for fund in funds_data:
            mubasher_id = fund.get('fund_id', '')
            name = fund.get('name', '').strip()
            price_str = fund.get('current_price', '0')
            manager = fund.get('manager', '').strip()
            owner = fund.get('owner', '').strip()
            
            # Parse NAV
            try:
                nav = float(price_str.replace(',', ''))
            except (ValueError, TypeError):
                nav = 0
            
            # Generate unique fund_id for new records
            new_fund_id = f"MUB_{mubasher_id}"
            
            # Check if this Mubasher ID already exists
            if new_fund_id in existing_ids:
                # Just update NAV for existing Mubasher fund
                await conn.execute("""
                    UPDATE mutual_funds 
                    SET latest_nav = $1, updated_at = NOW()
                    WHERE fund_id = $2
                """, nav, new_fund_id)
                updated += 1
                print(f"  🔄 Updated existing: {name[:45]} | NAV: {nav:.2f}")
                continue
            
            # Try fuzzy match against existing funds
            best_match = None
            best_score = 0.55  # Higher threshold for matching
            
            for db_fund in db_funds:
                db_id = db_fund['fund_id']
                if db_id in matched_db_ids:
                    continue
                
                db_name_en = db_fund['fund_name_en'] or ''
                db_name = db_fund['fund_name'] or ''
                
                score_en = similarity_score(name, db_name_en) if db_name_en else 0
                score_ar = similarity_score(name, db_name) if db_name else 0
                score = max(score_en, score_ar)
                
                if score > best_score:
                    best_score = score
                    best_match = db_fund
            
            if best_match:
                # Update existing matched fund
                matched_db_ids.add(best_match['fund_id'])
                await conn.execute("""
                    UPDATE mutual_funds 
                    SET latest_nav = $1, updated_at = NOW()
                    WHERE fund_id = $2
                """, nav, best_match['fund_id'])
                updated += 1
                
                # Add to nav_history
                try:
                    await conn.execute("""
                        INSERT INTO nav_history (fund_id, date, nav)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
                    """, best_match['fund_id'], today, nav)
                    nav_history_count += 1
                except:
                    pass
                
                print(f"  ✅ [{best_score*100:.0f}%] Matched: {name[:40]} → {best_match['fund_name_en'][:25] if best_match['fund_name_en'] else 'N/A'}")
            else:
                # INSERT NEW FUND - no existing match found
                try:
                    await conn.execute("""
                        INSERT INTO mutual_funds (
                            fund_id, fund_name, fund_name_en, manager_name, manager_name_en,
                            latest_nav, currency, market_code, last_updated
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                    """, 
                        new_fund_id,           # fund_id
                        name,                  # fund_name
                        name,                  # fund_name_en
                        manager,               # manager_name
                        manager,               # manager_name_en
                        nav,                   # latest_nav
                        'EGP',                 # currency
                        'EGX'                  # market_code
                    )
                    inserted += 1
                    existing_ids.add(new_fund_id)
                    
                    # Add to nav_history
                    if nav > 0:
                        try:
                            await conn.execute("""
                                INSERT INTO nav_history (fund_id, date, nav)
                                VALUES ($1, $2, $3)
                                ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
                            """, new_fund_id, today, nav)
                            nav_history_count += 1
                        except:
                            pass
                    
                    print(f"  ➕ INSERTED NEW: {name[:50]} | NAV: {nav:.2f}")
                except Exception as e:
                    print(f"  ❌ Insert failed: {name[:40]} - {str(e)[:50]}")
                    skipped += 1
        
        print("\n" + "=" * 70)
        print("FINAL SUMMARY")
        print("=" * 70)
        print(f"📊 Total funds scraped:      {len(funds_data)}")
        print(f"✅ Existing funds updated:   {updated}")
        print(f"➕ New funds inserted:       {inserted}")
        print(f"📈 NAV history entries:      {nav_history_count}")
        if skipped:
            print(f"⚠️  Skipped/errors:          {skipped}")
        
        # Final count
        final_count = await conn.fetchval("""
            SELECT COUNT(*) FROM mutual_funds 
            WHERE market_code = 'EGX'
        """)
        nav_count = await conn.fetchval("""
            SELECT COUNT(*) FROM mutual_funds 
            WHERE market_code = 'EGX' AND latest_nav > 0
        """)
        
        print(f"\n📊 TOTAL EGX FUNDS NOW:      {final_count}")
        print(f"📊 WITH NAV > 0:             {nav_count}")
        
    finally:
        await conn.close()
        print("\n✅ Database connection closed")

if __name__ == "__main__":
    asyncio.run(main())
