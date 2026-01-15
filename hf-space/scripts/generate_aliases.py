"""
Enterprise Alias Generator - Auto-generate 15-60 aliases per stock.

This script:
1. Loops through all stocks in market_tickers
2. Generates Arabic + English aliases from names
3. Extracts keyphrases (2-word, 3-word combinations)
4. Injects curated nicknames with high priority
5. Populates ticker_aliases with proper metadata

Run: PYTHONPATH=. python3 scripts/generate_aliases.py
"""

import asyncio
import os
import re
from typing import List, Set, Dict
from dotenv import load_dotenv
import asyncpg

load_dotenv()

# Import from app
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.chat.text_normalizer import normalize_text
from app.chat.nickname_dict import (
    NICKNAME_AR, NICKNAME_EN, AR_STOPWORDS, EN_STOPWORDS, 
    get_popularity, POPULARITY_SCORES
)

# Stats
stats = {
    'stocks_processed': 0,
    'aliases_generated': 0,
    'aliases_injected': 0,
    'duplicates_skipped': 0,
    'errors': 0,
}


def extract_keyphrases(name: str, stopwords: Set[str]) -> List[str]:
    """Extract 2-word and 3-word keyphrases from a name."""
    tokens = name.split()
    clean_tokens = [t for t in tokens if t.lower() not in stopwords and len(t) >= 2]
    
    keyphrases = []
    
    # 2-word combinations
    for i in range(len(clean_tokens) - 1):
        phrase = ' '.join(clean_tokens[i:i+2])
        if len(phrase) >= 4:  # Minimum length
            keyphrases.append(phrase)
    
    # 3-word combinations
    for i in range(len(clean_tokens) - 2):
        phrase = ' '.join(clean_tokens[i:i+3])
        keyphrases.append(phrase)
    
    return keyphrases


def generate_stock_aliases(
    symbol: str, 
    name_en: str, 
    name_ar: str
) -> List[Dict]:
    """Generate aliases for a single stock."""
    aliases = []
    
    # 1. Full English name (if exists)
    if name_en:
        # Original name
        aliases.append({
            'text': name_en,
            'lang': 'en',
            'type': 'official',
            'priority': 8
        })
        
        # Lowercase version
        aliases.append({
            'text': name_en.lower(),
            'lang': 'en',
            'type': 'official',
            'priority': 7
        })
        
        # Extract keyphrases
        for phrase in extract_keyphrases(name_en.lower(), EN_STOPWORDS):
            aliases.append({
                'text': phrase,
                'lang': 'en',
                'type': 'auto',
                'priority': 4
            })
        
        # First word if distinctive (>=4 chars, not stopword)
        first_word = name_en.split()[0].lower() if name_en.split() else None
        if first_word and len(first_word) >= 4 and first_word not in EN_STOPWORDS:
            aliases.append({
                'text': first_word,
                'lang': 'en',
                'type': 'short',
                'priority': 5
            })
    
    # 2. Full Arabic name (if exists)
    if name_ar:
        # Original name
        aliases.append({
            'text': name_ar,
            'lang': 'ar',
            'type': 'official',
            'priority': 8
        })
        
        # Normalized version
        normalized = normalize_text(name_ar).normalized
        if normalized != name_ar.lower():
            aliases.append({
                'text': normalized,
                'lang': 'ar',
                'type': 'official',
                'priority': 7
            })
        
        # Extract keyphrases
        for phrase in extract_keyphrases(normalized, AR_STOPWORDS):
            aliases.append({
                'text': phrase,
                'lang': 'ar',
                'type': 'auto',
                'priority': 4
            })
        
        # First word if distinctive
        first_word = normalized.split()[0] if normalized.split() else None
        if first_word and len(first_word) >= 3 and first_word not in AR_STOPWORDS:
            aliases.append({
                'text': first_word,
                'lang': 'ar',
                'type': 'short',
                'priority': 5
            })
    
    # 3. Symbol variations
    aliases.append({
        'text': symbol,
        'lang': 'en',
        'type': 'official',
        'priority': 10  # Highest for exact symbol
    })
    aliases.append({
        'text': symbol.lower(),
        'lang': 'en',
        'type': 'official',
        'priority': 9
    })
    
    # 4. Common variations (e.g., hyphenated, with spaces)
    # Skip for now - can add more rules
    
    return aliases


async def inject_alias(
    conn: asyncpg.Connection,
    symbol: str,
    market_code: str,
    alias_text: str,
    alias_norm: str,
    lang: str,
    alias_type: str,
    priority: int,
    popularity: int
) -> bool:
    """Inject a single alias into ticker_aliases."""
    try:
        # Check if exists (using normalized text for dedup)
        existing = await conn.fetchval(
            "SELECT 1 FROM ticker_aliases WHERE alias_text_norm = $1 AND market_code = $2",
            alias_norm, market_code
        )
        
        if existing:
            stats['duplicates_skipped'] += 1
            return False
        
        # Insert with new schema fields
        await conn.execute("""
            INSERT INTO ticker_aliases 
            (alias_text, alias_text_norm, symbol, market_code, priority, 
             alias_lang, alias_type, popularity_score, auto_generated)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """, alias_text, alias_norm, symbol, market_code, priority,
             lang, alias_type, popularity, True)
        
        stats['aliases_injected'] += 1
        return True
        
    except Exception as e:
        stats['errors'] += 1
        return False


async def inject_nicknames(conn: asyncpg.Connection) -> None:
    """Inject curated nicknames with highest priority."""
    print("\n=== Injecting Curated Nicknames ===")
    
    # Arabic nicknames
    for name, symbol in NICKNAME_AR.items():
        normalized = normalize_text(name).normalized
        popularity = get_popularity(symbol)
        
        await inject_alias(
            conn, symbol, 'EGX', name, normalized,
            'ar', 'nickname', 10, popularity
        )
    
    # English nicknames
    for name, symbol in NICKNAME_EN.items():
        normalized = name.lower()
        popularity = get_popularity(symbol)
        
        await inject_alias(
            conn, symbol, 'EGX', name, normalized,
            'en', 'nickname', 10, popularity
        )
    
    print(f"  Injected {len(NICKNAME_AR) + len(NICKNAME_EN)} curated nicknames")


async def process_all_stocks(conn: asyncpg.Connection) -> None:
    """Generate and inject aliases for all EGX stocks."""
    print("\n=== Processing All EGX Stocks ===")
    
    stocks = await conn.fetch("""
        SELECT symbol, name_en, name_ar 
        FROM market_tickers 
        WHERE market_code = 'EGX'
        ORDER BY symbol
    """)
    
    print(f"  Found {len(stocks)} stocks to process")
    
    for stock in stocks:
        symbol = stock['symbol']
        name_en = stock['name_en'] or ''
        name_ar = stock['name_ar'] or ''
        
        popularity = get_popularity(symbol)
        aliases = generate_stock_aliases(symbol, name_en, name_ar)
        
        stats['stocks_processed'] += 1
        stats['aliases_generated'] += len(aliases)
        
        for alias in aliases:
            normalized = normalize_text(alias['text']).normalized
            
            # Skip if too short or is a stopword
            if len(normalized) < 2:
                continue
            if normalized in AR_STOPWORDS or normalized in EN_STOPWORDS:
                continue
            
            await inject_alias(
                conn, symbol, 'EGX',
                alias['text'], normalized,
                alias['lang'], alias['type'],
                alias['priority'], popularity
            )
        
        if stats['stocks_processed'] % 50 == 0:
            print(f"  Processed {stats['stocks_processed']} stocks...")
    
    print(f"  Completed processing {stats['stocks_processed']} stocks")


async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL not set")
        return
    
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    
    try:
        print("=" * 60)
        print("  ENTERPRISE ALIAS GENERATOR")
        print("=" * 60)
        
        # Step 1: Inject curated nicknames first
        await inject_nicknames(conn)
        
        # Step 2: Process all stocks
        await process_all_stocks(conn)
        
        # Summary
        print("\n" + "=" * 60)
        print("  SUMMARY")
        print("=" * 60)
        print(f"  Stocks Processed:   {stats['stocks_processed']}")
        print(f"  Aliases Generated:  {stats['aliases_generated']}")
        print(f"  Aliases Injected:   {stats['aliases_injected']}")
        print(f"  Duplicates Skipped: {stats['duplicates_skipped']}")
        print(f"  Errors:             {stats['errors']}")
        
        # Verify final count
        total = await conn.fetchval("SELECT COUNT(*) FROM ticker_aliases WHERE market_code = 'EGX'")
        print(f"\n  Total EGX Aliases in DB: {total}")
        
    finally:
        await conn.close()
    
    print("\n✅ Alias generation complete!")


if __name__ == "__main__":
    asyncio.run(main())
