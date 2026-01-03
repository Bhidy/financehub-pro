#!/usr/bin/env python3
"""
Seed ticker_aliases with common Arabic and English aliases for stocks.
Covers EGX (Egyptian) and Saudi (Tadawul) markets.
"""

import asyncio
import asyncpg
import os
import re
import unicodedata
from dotenv import load_dotenv

load_dotenv()

def normalize_arabic(text: str) -> str:
    """Normalize Arabic text for matching."""
    if not text:
        return ""
    
    # Remove diacritics (tashkeel)
    arabic_diacritics = re.compile(r'[\u064B-\u065F\u0670]')
    text = arabic_diacritics.sub('', text)
    
    # Normalize alef variants (أإآا → ا)
    text = re.sub(r'[أإآ]', 'ا', text)
    
    # Normalize taa marbuta (ة → ه)
    text = text.replace('ة', 'ه')
    
    # Normalize yaa (ى → ي)
    text = text.replace('ى', 'ي')
    
    # Convert Arabic numerals to Western
    arabic_nums = '٠١٢٣٤٥٦٧٨٩'
    western_nums = '0123456789'
    for a, w in zip(arabic_nums, western_nums):
        text = text.replace(a, w)
    
    return text.strip().lower()

def normalize_text(text: str) -> str:
    """Normalize text for matching (Arabic + English)."""
    if not text:
        return ""
    
    # First apply Arabic normalization
    text = normalize_arabic(text)
    
    # Then apply general normalization
    text = text.lower().strip()
    
    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text)
    
    return text

# Alias data: (alias_text, symbol, market_code, priority)
# Higher priority = preferred match
ALIASES = [
    # ========== EGX (Egyptian) STOCKS ==========
    
    # COMI - Commercial International Bank
    ("التجاري الدولي", "COMI", "EGX", 10),
    ("البنك التجاري الدولي", "COMI", "EGX", 9),
    ("CIB", "COMI", "EGX", 10),
    ("Commercial International Bank", "COMI", "EGX", 8),
    ("التجارى الدولى", "COMI", "EGX", 8),
    ("سي آي بي", "COMI", "EGX", 7),
    
    # SWDY - El Sewedy Electric
    ("سويدي", "SWDY", "EGX", 10),
    ("السويدي", "SWDY", "EGX", 9),
    ("السويدي اليكتريك", "SWDY", "EGX", 8),
    ("El Sewedy", "SWDY", "EGX", 8),
    ("Sewedy Electric", "SWDY", "EGX", 7),
    
    # TMGH - Talaat Moustafa Group
    ("طلعت مصطفى", "TMGH", "EGX", 10),
    ("مجموعة طلعت مصطفي", "TMGH", "EGX", 9),
    ("Talaat Moustafa", "TMGH", "EGX", 8),
    ("TMG", "TMGH", "EGX", 7),
    
    # EFIC - Egyptian Financial & Industrial
    ("المالية والصناعية", "EFIC", "EGX", 10),
    ("ايفيك", "EFIC", "EGX", 9),
    ("Egyptian Financial", "EFIC", "EGX", 7),
    
    # HRHO - Hermes Holding
    ("هيرميس", "HRHO", "EGX", 10),
    ("إي إف جي هيرميس", "HRHO", "EGX", 9),
    ("EFG Hermes", "HRHO", "EGX", 8),
    ("Hermes", "HRHO", "EGX", 7),
    
    # ETEL - Telecom Egypt
    ("المصرية للاتصالات", "ETEL", "EGX", 10),
    ("تليكوم مصر", "ETEL", "EGX", 9),
    ("Telecom Egypt", "ETEL", "EGX", 8),
    ("WE", "ETEL", "EGX", 6),
    
    # EKHO - Eastern Company
    ("الشرقية للدخان", "EKHO", "EGX", 10),
    ("الشرقيه للدخان", "EKHO", "EGX", 9),
    ("Eastern Tobacco", "EKHO", "EGX", 7),
    ("Eastern Company", "EKHO", "EGX", 7),
    
    # ORWE - Oriental Weavers
    ("السجاد الشرقية", "ORWE", "EGX", 10),
    ("أوريانتال ويفرز", "ORWE", "EGX", 9),
    ("Oriental Weavers", "ORWE", "EGX", 8),
    
    # PHDC - Palm Hills Development
    ("بالم هيلز", "PHDC", "EGX", 10),
    ("بالم هيلز للتعمير", "PHDC", "EGX", 9),
    ("Palm Hills", "PHDC", "EGX", 8),
    
    # ORAS - Orascom Construction
    ("أوراسكوم", "ORAS", "EGX", 10),
    ("أوراسكوم للانشاء", "ORAS", "EGX", 9),
    ("Orascom Construction", "ORAS", "EGX", 8),
    
    # ========== SAUDI (TADAWUL) STOCKS ==========
    
    # 2222 - Saudi Aramco
    ("ارامكو", "2222", "SAUDI", 10),
    ("أرامكو", "2222", "SAUDI", 10),
    ("ارامكو السعودية", "2222", "SAUDI", 9),
    ("Saudi Aramco", "2222", "SAUDI", 8),
    ("Aramco", "2222", "SAUDI", 8),
    
    # 1120 - Al Rajhi Bank
    ("الراجحي", "1120", "SAUDI", 10),
    ("بنك الراجحي", "1120", "SAUDI", 9),
    ("مصرف الراجحي", "1120", "SAUDI", 9),
    ("Al Rajhi", "1120", "SAUDI", 8),
    ("Al Rajhi Bank", "1120", "SAUDI", 7),
    ("Rajhi", "1120", "SAUDI", 6),
    
    # 2010 - SABIC
    ("سابك", "2010", "SAUDI", 10),
    ("الصناعات الأساسية", "2010", "SAUDI", 8),
    ("SABIC", "2010", "SAUDI", 9),
    ("Saudi Basic Industries", "2010", "SAUDI", 7),
    
    # 1010 - Riyad Bank
    ("بنك الرياض", "1010", "SAUDI", 10),
    ("الرياض", "1010", "SAUDI", 8),
    ("Riyad Bank", "1010", "SAUDI", 8),
    
    # 1180 - Al Inma Bank
    ("الإنماء", "1180", "SAUDI", 10),
    ("بنك الانماء", "1180", "SAUDI", 9),
    ("Al Inma", "1180", "SAUDI", 8),
    ("Alinma Bank", "1180", "SAUDI", 7),
    
    # 2350 - Saudi Kayan
    ("كيان", "2350", "SAUDI", 10),
    ("كيان السعودية", "2350", "SAUDI", 9),
    ("Saudi Kayan", "2350", "SAUDI", 8),
    ("Kayan", "2350", "SAUDI", 7),
    
    # 7010 - STC
    ("الاتصالات السعودية", "7010", "SAUDI", 10),
    ("stc", "7010", "SAUDI", 10),
    ("STC", "7010", "SAUDI", 10),
    ("Saudi Telecom", "7010", "SAUDI", 8),
    
    # 2020 - SAFCO
    ("سافكو", "2020", "SAUDI", 10),
    ("SAFCO", "2020", "SAUDI", 9),
    ("Saudi Arabian Fertilizer", "2020", "SAUDI", 7),
    
    # 4030 - Al Babtain Power
    ("البابطين", "4030", "SAUDI", 10),
    ("Al Babtain", "4030", "SAUDI", 8),
    
    # 2310 - SIIG (Saudi Industrial Investment Group)
    ("المجموعة السعودية", "2310", "SAUDI", 8),
    ("SIIG", "2310", "SAUDI", 9),
]

async def seed_aliases():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not set")
        return False
    
    try:
        conn = await asyncpg.connect(database_url, statement_cache_size=0)
        print("🌱 Seeding ticker_aliases...")
        
        inserted = 0
        skipped = 0
        
        for alias_text, symbol, market_code, priority in ALIASES:
            alias_norm = normalize_text(alias_text)
            
            try:
                await conn.execute("""
                    INSERT INTO ticker_aliases (alias_text, alias_text_norm, symbol, market_code, priority)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (alias_text_norm, market_code) DO UPDATE SET
                        alias_text = EXCLUDED.alias_text,
                        priority = EXCLUDED.priority
                """, alias_text, alias_norm, symbol, market_code, priority)
                inserted += 1
            except Exception as e:
                print(f"  ⚠️ Skipped: {alias_text} ({e})")
                skipped += 1
        
        # Final count
        total = await conn.fetchval("SELECT COUNT(*) FROM ticker_aliases")
        print(f"✅ Seeding complete! Inserted/Updated: {inserted}, Total rows: {total}")
        
        # Show sample
        samples = await conn.fetch("SELECT alias_text, symbol, market_code FROM ticker_aliases ORDER BY priority DESC LIMIT 10")
        print("\n📋 Sample aliases:")
        for s in samples:
            print(f"  '{s['alias_text']}' → {s['symbol']} ({s['market_code']})")
        
        await conn.close()
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(seed_aliases())
