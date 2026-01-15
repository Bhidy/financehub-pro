"""
NLU Enhancement - Data Enrichment Module v2.0 (Fixed)
Phase 1: Arabic Name Population + Comprehensive Alias Generation

FIXES:
- Uses existing nickname_dict.py as Arabic name source
- Better connection handling with retry logic
- Batched alias insertion
"""

import asyncio
import asyncpg
import re
from typing import List, Tuple, Optional, Dict
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import existing nickname dictionaries
from app.chat.nickname_dict import NICKNAME_AR, NICKNAME_EN, POPULARITY_SCORES

# Stopwords for filtering
AR_STOPWORDS = {
    'شركة', 'شركه', 'مساهمة', 'مساهمه', 'مصرية', 'مصريه',
    'القابضة', 'القابضه', 'للتنمية', 'للتنميه', 'للاستثمار',
    'ش.م.م', 'ش.م', 'شمم', 'مصر', 'مصري', 'ال',
    'السعودية', 'السعوديه', 'العربية', 'العربيه', 'المتحدة', 'المتحده',
}

EN_STOPWORDS = {
    'company', 'co', 'ltd', 'limited', 'sae', 'inc', 'incorporated',
    'corp', 'corporation', 'group', 'holding', 'holdings', 'egypt',
    'egyptian', 'arab', 'arabian', 'international', 'national', 'united',
    'for', 'and', 'the', 'of', 'development', 'investment', 'investments',
    's.a.e', 's.a.e.', 'plc', 'llc',
}

# Manually curated Arabic names for top EGX stocks
CURATED_ARABIC_NAMES = {
    'ETEL': 'الشركة المصرية للاتصالات',
    'COMI': 'البنك التجاري الدولي',
    'SWDY': 'السويدي إلكتريك',
    'TMGH': 'مجموعة طلعت مصطفى القابضة',
    'HRHO': 'هيرميس القابضة',
    'PHDC': 'بالم هيلز للتعمير',
    'ESRS': 'حديد عز',
    'FWRY': 'فوري',
    'EAST': 'الشرقية للدخان',
    'QNBA': 'بنك قطر الوطني الأهلي',
    'AMOC': 'الإسكندرية للزيوت المعدنية',
    'ABUK': 'أبوقير للأسمدة',
    'MNHD': 'مدينة نصر للإسكان والتعمير',
    'HELI': 'مصر الجديدة للإسكان والتعمير',
    'ORAS': 'أوراسكوم للإنشاء والصناعة',
    'CCAP': 'القلعة للاستشارات المالية',
    'OCDI': 'السادس من أكتوبر للتنمية والاستثمار',
    'MOPH': 'موبكو',
    'ISPH': 'ابن سينا فارما',
    'CIEB': 'كريدي أجريكول مصر',
    'BTFH': 'بلتون المالية القابضة',
    'AMER': 'عامر جروب',
    'MTIE': 'إم إم جروب',
    'JUFO': 'جهينة للصناعات الغذائية',
    'DOMT': 'دومتي',
    'OLFI': 'عبور لاند',
    'ORHD': 'أوراسكوم للفنادق',
    'EFIH': 'إي فاينانس',
    'VALU': 'فاليو',
    'PIOH': 'بايونيرز القابضة',
    'ADIB': 'مصرف أبوظبي الإسلامي مصر',
    'FAIT': 'بنك فيصل الإسلامي',
    'ARAB': 'البنك العربي الأفريقي',
    'SKPC': 'سيدي كرير للبتروكيماويات',
    'ARCC': 'العربية للأسمنت',
    'SUCE': 'السويس للأسمنت',
    'SCEM': 'سيناء للأسمنت',
    'ORWE': 'أوريانتال ويفرز',
    'CLHO': 'مستشفيات كليوباترا',
    'RMDA': 'راميدا',
    'RAYA': 'راية القابضة',
    'ALCN': 'الإسكندرية للحاويات',
    'IRON': 'الحديد والصلب المصرية',
    'EKHO': 'مصر الكويت القابضة',
    'MICH': 'مصر للكيماويات',
}


def normalize_arabic(text: str) -> str:
    """Normalize Arabic text for matching."""
    if not text:
        return ''
    text = re.sub(r'[\u064B-\u065F\u0670]', '', text)
    text = re.sub(r'[أإآ]', 'ا', text)
    text = text.replace('ة', 'ه')
    text = text.replace('ى', 'ي')
    text = text.replace('\u0640', '')
    return text.strip()


def generate_aliases(symbol: str, name_ar: Optional[str], name_en: Optional[str]) -> List[Tuple[str, str, str, int]]:
    """Generate comprehensive aliases for a stock."""
    aliases = []
    
    # ARABIC ALIASES
    if name_ar:
        name_ar_clean = name_ar.strip()
        name_ar_norm = normalize_arabic(name_ar_clean)
        
        # Full official Arabic name
        aliases.append((name_ar_clean, name_ar_norm, 'official', 10))
        
        # Without ال prefix
        if name_ar_clean.startswith('ال'):
            no_al = name_ar_clean[2:]
            aliases.append((no_al, normalize_arabic(no_al), 'short', 8))
        
        # Each significant word
        words = [w for w in name_ar_clean.split() if len(w) > 2]
        significant_words = [w for w in words if w not in AR_STOPWORDS and (not w.startswith('ال') or len(w) > 4)]
        
        for word in significant_words:
            aliases.append((word, normalize_arabic(word), 'partial', 6))
            if word.startswith('ال'):
                word_no_al = word[2:]
                aliases.append((word_no_al, normalize_arabic(word_no_al), 'partial', 5))
        
        # Two-word combinations
        if len(words) >= 2:
            for i in range(len(words) - 1):
                phrase = f"{words[i]} {words[i+1]}"
                aliases.append((phrase, normalize_arabic(phrase), 'short', 8))
        
        # Three-word combinations
        if len(words) >= 3:
            for i in range(len(words) - 2):
                phrase = f"{words[i]} {words[i+1]} {words[i+2]}"
                aliases.append((phrase, normalize_arabic(phrase), 'short', 7))
    
    # ENGLISH ALIASES
    if name_en:
        name_en_clean = name_en.strip()
        aliases.append((name_en_clean, name_en_clean.lower(), 'official', 10))
        
        # Without corporate suffixes
        short_en = re.sub(r'\s*(S\.?A\.?E\.?|Co\.?|Ltd\.?|Company|Corporation|Group|Holding|Holdings|Inc\.?|PLC|LLC)\.?\s*', ' ', name_en_clean, flags=re.IGNORECASE)
        short_en = re.sub(r'\s+', ' ', short_en).strip()
        if short_en != name_en_clean:
            aliases.append((short_en, short_en.lower(), 'short', 9))
        
        # Each significant word
        words = [w for w in short_en.split() if len(w) > 2]
        significant_words = [w for w in words if w.lower() not in EN_STOPWORDS]
        
        for word in significant_words:
            if len(word) >= 4:
                aliases.append((word, word.lower(), 'partial', 5))
        
        # Acronym
        if len(significant_words) >= 2:
            acronym = ''.join(w[0].upper() for w in significant_words if w[0].isalpha())
            if len(acronym) >= 2 and acronym != symbol:
                aliases.append((acronym, acronym.lower(), 'acronym', 7))
        
        # Two-word combinations
        if len(words) >= 2:
            for i in range(len(words) - 1):
                phrase = f"{words[i]} {words[i+1]}"
                if phrase.lower() not in EN_STOPWORDS:
                    aliases.append((phrase, phrase.lower(), 'short', 7))
    
    # SYMBOL ITSELF
    aliases.append((symbol, symbol.lower(), 'ticker', 10))
    aliases.append((symbol.lower(), symbol.lower(), 'ticker', 9))
    
    # Deduplicate
    seen = set()
    unique_aliases = []
    for alias_text, alias_norm, alias_type, priority in aliases:
        if alias_norm and alias_norm not in seen and len(alias_norm) >= 2:
            seen.add(alias_norm)
            unique_aliases.append((alias_text, alias_norm, alias_type, priority))
    
    return unique_aliases


async def get_db_connection():
    """Get database connection with retry."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            conn = await asyncpg.connect(
                os.environ.get('DATABASE_URL'),
                statement_cache_size=0,
                command_timeout=60
            )
            return conn
        except Exception as e:
            print(f"Connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2)
    raise Exception("Failed to connect to database after retries")


async def populate_arabic_names(conn: asyncpg.Connection):
    """Populate Arabic names from curated dictionary."""
    print("=== Phase 1.1: Populating Arabic Names ===")
    
    updated = 0
    for symbol, name_ar in CURATED_ARABIC_NAMES.items():
        try:
            result = await conn.execute("""
                UPDATE market_tickers SET name_ar = $1 
                WHERE symbol = $2 AND (name_ar IS NULL OR name_ar = '')
            """, name_ar, symbol)
            if 'UPDATE 1' in result:
                print(f"✓ {symbol}: {name_ar}")
                updated += 1
        except Exception as e:
            print(f"✗ {symbol}: {e}")
    
    print(f"\nUpdated {updated} stocks with Arabic names")
    
    # Also add Arabic names from nickname_dict reverse lookup
    print("\n=== Adding names from nickname dictionary ===")
    nickname_updates = 0
    # Reverse the NICKNAME_AR dictionary to get symbol -> names
    symbol_nicknames = {}
    for nickname, symbol in NICKNAME_AR.items():
        if symbol not in symbol_nicknames:
            symbol_nicknames[symbol] = []
        symbol_nicknames[symbol].append(nickname)
    
    for symbol, nicknames in symbol_nicknames.items():
        # Find the longest nickname as it's likely the most complete name
        best_name = max(nicknames, key=len)
        try:
            result = await conn.execute("""
                UPDATE market_tickers SET name_ar = $1 
                WHERE symbol = $2 AND (name_ar IS NULL OR name_ar = '')
            """, best_name, symbol)
            if 'UPDATE 1' in result:
                print(f"✓ {symbol}: {best_name}")
                nickname_updates += 1
        except:
            pass
    
    print(f"Updated {nickname_updates} additional stocks from nickname dictionary")


async def generate_all_aliases(conn: asyncpg.Connection):
    """Generate comprehensive aliases for all EGX stocks."""
    print("\n=== Phase 1.2: Generating Comprehensive Aliases ===")
    
    stocks = await conn.fetch("""
        SELECT symbol, name_en, name_ar FROM market_tickers 
        WHERE market_code = 'EGX'
    """)
    
    print(f"Generating aliases for {len(stocks)} stocks")
    
    total_aliases = 0
    for stock in stocks:
        symbol = stock['symbol']
        name_en = stock['name_en']
        name_ar = stock['name_ar']
        
        aliases = generate_aliases(symbol, name_ar, name_en)
        stock_aliases = 0
        
        for alias_text, alias_norm, alias_type, priority in aliases:
            try:
                await conn.execute("""
                    INSERT INTO ticker_aliases 
                    (alias_text, alias_text_norm, symbol, market_code, alias_type, alias_lang, priority, auto_generated)
                    VALUES ($1, $2, $3, 'EGX', $4, $5, $6, TRUE)
                    ON CONFLICT (alias_text_norm, symbol, market_code) 
                    DO UPDATE SET priority = GREATEST(ticker_aliases.priority, EXCLUDED.priority)
                """, 
                    alias_text, 
                    alias_norm, 
                    symbol, 
                    alias_type,
                    'ar' if any('\u0600' <= c <= '\u06FF' for c in alias_text) else 'en',
                    priority
                )
                stock_aliases += 1
                total_aliases += 1
            except Exception as e:
                pass  # Skip duplicates
        
        print(f"✓ {symbol}: {stock_aliases} aliases")
    
    print(f"\nGenerated {total_aliases} total aliases")


async def inject_nickname_aliases(conn: asyncpg.Connection):
    """Inject all nicknames from nickname_dict as high-priority aliases."""
    print("\n=== Phase 1.3: Injecting Curated Nicknames ===")
    
    injected = 0
    
    # Arabic nicknames
    for nickname, symbol in NICKNAME_AR.items():
        try:
            await conn.execute("""
                INSERT INTO ticker_aliases 
                (alias_text, alias_text_norm, symbol, market_code, alias_type, alias_lang, priority, popularity_score, auto_generated)
                VALUES ($1, $2, $3, 'EGX', 'nickname', 'ar', 10, $4, FALSE)
                ON CONFLICT (alias_text_norm, symbol, market_code) 
                DO UPDATE SET priority = 10, alias_type = 'nickname', popularity_score = EXCLUDED.popularity_score
            """, nickname, normalize_arabic(nickname), symbol, POPULARITY_SCORES.get(symbol, 50))
            injected += 1
        except:
            pass
    
    # English nicknames
    for nickname, symbol in NICKNAME_EN.items():
        try:
            await conn.execute("""
                INSERT INTO ticker_aliases 
                (alias_text, alias_text_norm, symbol, market_code, alias_type, alias_lang, priority, popularity_score, auto_generated)
                VALUES ($1, $2, $3, 'EGX', 'nickname', 'en', 10, $4, FALSE)
                ON CONFLICT (alias_text_norm, symbol, market_code) 
                DO UPDATE SET priority = 10, alias_type = 'nickname', popularity_score = EXCLUDED.popularity_score
            """, nickname, nickname.lower(), symbol, POPULARITY_SCORES.get(symbol, 50))
            injected += 1
        except:
            pass
    
    print(f"Injected {injected} curated nicknames")


async def setup_fuzzy_search(conn: asyncpg.Connection):
    """Set up PostgreSQL extensions for fuzzy search."""
    print("\n=== Phase 1.4: Setting Up Fuzzy Search ===")
    
    try:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        print("✓ pg_trgm extension enabled")
    except Exception as e:
        print(f"⚠ pg_trgm: {e}")
    
    try:
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_ticker_aliases_trgm 
            ON ticker_aliases USING gin (alias_text_norm gin_trgm_ops)
        """)
        print("✓ Trigram index created")
    except Exception as e:
        print(f"⚠ Trigram index: {e}")


async def run_data_enrichment():
    """Main function to run all data enrichment tasks."""
    print("=" * 60)
    print("NLU ENHANCEMENT - PHASE 1: DATA ENRICHMENT v2.0")
    print("=" * 60)
    
    conn = await get_db_connection()
    
    try:
        # Step 1: Populate Arabic names from curated list
        await populate_arabic_names(conn)
        
        # Step 2: Inject curated nicknames
        await inject_nickname_aliases(conn)
        
        # Step 3: Generate comprehensive aliases from names
        await generate_all_aliases(conn)
        
        # Step 4: Set up fuzzy search
        await setup_fuzzy_search(conn)
        
        # Final stats
        print("\n" + "=" * 60)
        print("FINAL STATISTICS")
        print("=" * 60)
        total_stocks = await conn.fetchval("SELECT COUNT(*) FROM market_tickers WHERE market_code = 'EGX'")
        with_ar = await conn.fetchval("SELECT COUNT(*) FROM market_tickers WHERE market_code = 'EGX' AND name_ar IS NOT NULL AND name_ar != ''")
        total_aliases = await conn.fetchval("SELECT COUNT(*) FROM ticker_aliases WHERE market_code = 'EGX'")
        
        print(f"Total EGX stocks: {total_stocks}")
        print(f"With Arabic names: {with_ar} ({with_ar*100//total_stocks}%)")
        print(f"Total aliases: {total_aliases}")
        print(f"Avg aliases per stock: {total_aliases // max(total_stocks, 1)}")
        
    finally:
        await conn.close()
    
    print("\n✅ Phase 1 Complete!")


if __name__ == "__main__":
    asyncio.run(run_data_enrichment())
