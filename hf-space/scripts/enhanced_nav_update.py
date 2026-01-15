#!/usr/bin/env python3
"""
Enhanced batch update with better fuzzy matching for Egypt fund NAV data.
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
    # Convert to lowercase
    n = name.lower()
    # Remove common suffixes/prefixes
    n = re.sub(r'\s*(fund|mutual fund|investment fund|s\.a\.e|s\.a\.e\.|sae|egypt|egp|usd|eur)\s*', ' ', n)
    # Remove extra whitespace
    n = ' '.join(n.split())
    return n

def extract_keywords(name):
    """Extract key words from fund name"""
    stopwords = {'fund', 'mutual', 'investment', 'egypt', 'bank', 'the', 'and', 'of', 'for', 'al', 'el'}
    words = re.findall(r'\b[a-z]+\b', name.lower())
    return set(w for w in words if w not in stopwords and len(w) > 2)

def similarity_score(name1, name2):
    """Calculate similarity between two names"""
    # Direct match check
    if name1.lower() == name2.lower():
        return 1.0
    
    n1 = normalize_name(name1)
    n2 = normalize_name(name2)
    
    # Sequence matcher for overall similarity
    seq_ratio = SequenceMatcher(None, n1, n2).ratio()
    
    # Keyword overlap bonus
    kw1 = extract_keywords(name1)
    kw2 = extract_keywords(name2)
    if kw1 and kw2:
        overlap = len(kw1 & kw2) / max(len(kw1), len(kw2))
        seq_ratio = (seq_ratio + overlap) / 2
    
    return seq_ratio

async def main():
    print("=" * 60)
    print("ENHANCED EGYPT FUNDS NAV UPDATE")
    print("=" * 60)
    
    # Load the scraped data
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "egypt_funds_data.json")
    
    with open(json_path, 'r') as f:
        funds_data = json.load(f)
    
    print(f"\n📊 Loaded {len(funds_data)} funds from JSON file")
    
    # Connect to database (disable statement cache for pgbouncer)
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    print("✅ Connected to database")
    
    # Get all EGX funds from database
    db_funds = await conn.fetch("""
        SELECT fund_id, fund_name, fund_name_en, latest_nav
        FROM mutual_funds 
        WHERE market_code = 'EGX'
    """)
    print(f"📊 Found {len(db_funds)} EGX funds in database")
    
    today = datetime.now().date()
    updated = 0
    nav_inserted = 0
    matched_ids = set()
    
    try:
        for fund in funds_data:
            name = fund.get('name', '')
            price_str = fund.get('current_price', '0')
            
            # Parse price - handle commas
            try:
                nav = float(price_str.replace(',', ''))
            except (ValueError, TypeError):
                continue
            
            if nav <= 0:
                continue
            
            # Find best match using fuzzy matching
            best_match = None
            best_score = 0.4  # Minimum threshold
            
            for db_fund in db_funds:
                db_name_en = db_fund['fund_name_en'] or ''
                db_name = db_fund['fund_name'] or ''
                db_id = db_fund['fund_id']
                
                # Skip if already matched
                if db_id in matched_ids:
                    continue
                
                # Score against both English and Arabic names
                score_en = similarity_score(name, db_name_en) if db_name_en else 0
                score_ar = similarity_score(name, db_name) if db_name else 0
                score = max(score_en, score_ar)
                
                if score > best_score:
                    best_score = score
                    best_match = db_fund
            
            if best_match:
                matched_ids.add(best_match['fund_id'])
                db_fund_id = best_match['fund_id']
                old_nav = best_match['latest_nav'] or 0
                
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
                    pass
                
                match_pct = f"{best_score*100:.0f}%"
                print(f"  ✅ [{match_pct}] {name[:40]} → {best_match['fund_name_en'][:30] if best_match['fund_name_en'] else 'N/A'} | NAV: {nav:.2f}")
            else:
                print(f"  ⚠️  No match: {name[:50]}")
        
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"📊 Total funds in JSON:    {len(funds_data)}")
        print(f"✅ Matched in database:    {len(matched_ids)}")
        print(f"📝 NAV values updated:     {updated}")
        print(f"📈 NAV history inserted:   {nav_inserted}")
        
        # Show final count of EGX funds with NAV > 0
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
