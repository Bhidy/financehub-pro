import asyncio
import os
import re
from dotenv import load_dotenv
import asyncpg
from app.chat.text_normalizer import normalize_text

load_dotenv()

# Common English -> Arabic translations for company names
TRANSLATION_MAP = {
    "Bank": "بنك",
    "International": "الدولي",
    "Commercial": "التجاري",
    "Development": "للتنمية",
    "Investment": "للاستثمار",
    "Real Estate": "للاستثمار العقاري",
    "Group": "مجموعة",
    "Co": "شركة",
    "Company": "شركة",
    "Holding": "القابضة",
    "Financial": "المالية",
    "Industrial": "الصناعية",
    "Industries": "للصناعات",
    "Egypt": "مصر",
    "Egyptian": "المصرية",
    "Arab": "العربية",
    "General": "العامة",
    "Cement": "اسمنت",
    "Iron": "حديد",
    "Steel": "صلب",
    "Pharma": "للادوية",
    "Pharmaceuticals": "للادوية",
    "Chemicals": "للكيماويات",
    "Petrochemicals": "للبتروكيماويات",
    "Fertilizers": "للاسمدة",
    "Food": "للاغذية",
    "Foods": "للاغذية",
    "Mills": "المطاحن",
    "Housing": " للاسكان",
    "Reconstruction": "والتعمير",
    "Tourism": "للسياحة",
    "Hotels": "للفنادق",
    "Canal": "قناة",
    "Suez": "السويس",
    "Shipping": "للتوكيلات الملاحية",
    "Services": "للخدمات",
    "Medical": "الطبية",
    "Hospital": "مستشفى",
    "Electric": "اليكتريك",
    "Cable": "للكابلات",
    "Port": "ميناء",
    "Telecom": "للاتصالات",
    "Media": "للالعلام",
    "City": "مدينة",
    "Production": "للانتاج",
    "Dyeing": "للصباغة",
    "Processing": "وتجهيز",
    "Textile": "للغزل والنسيج",
    "Mining": "للتعدين",
    "Contracting": "للمقاولات",
    "Construction": "للانشاءات",
    "Engineering": "للهندسة",
    "Automotive": "للسيارات",
    "Insurance": "للتامين",
    "Delta": "الدلتا",
    "Upper": "صعيد",
    "Middle": "وسط",
    "West": "غرب",
    "East": "شرق"
}

STOPWORDS = {'and', 'the', 'for', 'of', '&', 's.a.e', 's.a.e.', 'ltd', 'ltd.'}

def translate_name(name_en: str) -> str:
    """Heuristic translation of company name."""
    words = name_en.replace('(', '').replace(')', '').split()
    ar_words = []
    
    for w in words:
        wl = w.lower()
        if wl in STOPWORDS:
            continue
        
        found = False
        for eng, ar in TRANSLATION_MAP.items():
            if eng.lower() == wl:
                ar_words.append(ar)
                found = True
                break
        
        if not found:
             pass 

    if not ar_words:
        return ""
        
    return " ".join(ar_words)

def extract_fund_nickname(fund_name: str) -> str:
    """Extract 'Shield', 'Tawazon' from end of name."""
    words = fund_name.split()
    if not words:
        return ""
    
    last = words[-1]
    ignored = ['fund', 'equity', 'market', 'daily', 'cumulative', 'return', 'fixed', 'income', 'egp', 'usd', 'euro', 'cash', 'balanced', 'money']
    
    if last.lower() in ignored:
        if len(words) > 1:
            last = words[-2]
            if last.lower() in ignored:
                return ""
    
    if last.lower() in ignored or len(last) < 2:
        return ""
        
    return last

async def inject_stock_alias(conn, symbol, alias, market='EGX', priority=5):
    try:
        norm = normalize_text(alias).normalized
        if len(norm) < 2: return
        
        exists = await conn.fetchval("""
            SELECT 1 FROM ticker_aliases 
            WHERE symbol=$1 AND alias_text_norm=$2 AND market_code=$3
        """, symbol, norm, market)
        
        if not exists:
            await conn.execute("""
                INSERT INTO ticker_aliases (symbol, market_code, alias_text, alias_text_norm, priority)
                VALUES ($1, $2, $3, $4, $5)
            """, symbol, market, alias, norm, priority)
            print(f"  + Injected Stock {symbol}: {alias}")
    except Exception as e:
        print(f"  ! Failed Stock {symbol} -> {alias}: {e}")

async def inject_fund_alias(conn, fund_id, alias, priority=5):
    try:
        norm = normalize_text(alias).normalized
        if len(norm) < 2: return
        
        # Cast fund_id to string!
        fund_str = str(fund_id)
        
        exists = await conn.fetchval("""
            SELECT 1 FROM fund_aliases 
            WHERE fund_id=$1 AND alias_text_norm=$2
        """, fund_str, norm)
        
        if not exists:
            await conn.execute("""
                INSERT INTO fund_aliases (fund_id, alias_text, alias_text_norm, priority)
                VALUES ($1, $2, $3, $4)
            """, fund_str, alias, norm, priority)
            print(f"  + Injected Fund {fund_str}: {alias}")
    except Exception as e:
        print(f"  ! Failed Fund {fund_id} -> {alias}: {e}")

async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url: return
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    
    try:
        # 1. PROCESS STOCKS
        print("\n--- Processing Stocks ---")
        stocks = await conn.fetch("SELECT symbol, name_en, name_ar FROM market_tickers WHERE market_code='EGX'")
        
        for s in stocks:
            symbol = s['symbol']
            name_en = s['name_en'] or ""
            name_ar = s['name_ar']
            
            # A. Generate Arabic Name
            if not name_ar:
                translation = translate_name(name_en)
                if translation:
                     print(f"Generated Arabic for {symbol}: {translation}")
                     await inject_stock_alias(conn, symbol, translation)
            
            # B. Inject English Name parts
            parts = name_en.split()
            if len(parts) > 1:
                first = parts[0]
                if len(first) > 3 and first.lower() not in STOPWORDS and first.lower() not in ['bank', 'company', 'arab', 'egyptian']:
                    await inject_stock_alias(conn, symbol, first)

        # 2. PROCESS FUNDS
        print("\n--- Processing Funds ---")
        funds = await conn.fetch("SELECT fund_id, fund_name FROM mutual_funds WHERE market_code='EGX'")
        
        for f in funds:
            fid = f['fund_id']
            name = f['fund_name'] or ""
            
            # A. Inject Full Name
            await inject_fund_alias(conn, fid, name)
            
            # B. Inject Nickname
            nick = extract_fund_nickname(name)
            if nick:
                await inject_fund_alias(conn, fid, nick, priority=7)
            
            # C. Inject 'Fund + Nickname'
            if nick:
                 await inject_fund_alias(conn, fid, f"Fund {nick}")
                 await inject_fund_alias(conn, fid, f"صندوق {nick}")
                 
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
