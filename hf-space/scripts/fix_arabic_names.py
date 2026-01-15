import asyncio
import os
from dotenv import load_dotenv
import asyncpg
from app.chat.text_normalizer import normalize_text

load_dotenv()

# "Big List" of manual overrides/augmentations for popular stocks
MANUAL_ALIASES = {
    "COMI": ["البنك التجاري الدولي", "التجاري الدولي", "سي اي بي", "بنك cib", "سهم cib", "Commercial International Bank", "CIB Bank"],
    "PHDC": ["بالم هيلز", "بالم هيلز للتعمير", "شركة بالم هيلز", "Palm Hills"],
    "HRHO": ["هيرميس", "المجموعة المالية هيرميس", "اي اف جي", "EFG Hermes"],
    "FWRY": ["فوري", "فوري للمدفوعات", "Fawry"],
    "EAST": ["ايسترن كومباني", "الشرقية للدخان", "Eastern Company"],
    "ESRS": ["عز الدخيلة", "حديد عز", "Ezz Steel"],
    "SWDY": ["السويدي", "السويدي اليكتريك", "Elsewedy Electric"],
    "TMGH": ["طلعت مصطفى", "مجموعة طلعت مصطفى", "TMG"],
    "ETEL": ["المصرية للاتصالات", "وي", "Telecom Egypt", "WE"],
    "MNHD": ["مدينة نصر", "مدينة نصر للاسكان", "Madinet Nasr"],
    "HELI": ["مصر الجديدة", "مصر الجديدة للاسكان", "Heliopolis Housing"],
    "EKHO": ["القابضة المصرية الكويتية", "الكويتية", "Egypt Kuwait Holding"],
    "AMOC": ["اموك", "الزيوت المعدنية", "AMOC"],
    "SIDI": ["سيدى كرير", "سيدبك", "Sidi Kerir"],
    "ABUK": ["ابو قير", "ابو قير للاسمدة", "Abu Qir Fertilizers"],
    "ORAS": ["اوراسكوم كونستراكشون", "اوراسكوم للانشاءات", "Orascom Construction"],
    "AUTO": ["جي بي اوتو", "غبور", "GB Auto"],
    "MTIE": ["ام ام جروب", "MM Group"],
    "ISPH": ["ايبكو", "المصرية الدولية للصناعات الدوائية", "EIPICO"],
    "CIEB": ["كريدي اجريكول", "Credit Agricole"]
}

async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("No DATABASE_URL found")
        return

    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        print("--- Fixing name_ar in market_tickers ---")
        
        # 1. Fetch all EGX tickers
        tickers = await conn.fetch("SELECT symbol FROM market_tickers WHERE market_code = 'EGX'")
        
        for row in tickers:
            symbol = row['symbol']
            
            # Find best candidate for name_ar
            best_ar_name = None
            
            # Check manual list first
            if symbol in MANUAL_ALIASES:
                # Use first arabic item as primary name
                for alias in MANUAL_ALIASES[symbol]:
                    if any("\u0600" <= c <= "\u06FF" for c in alias): # Is Arabic
                        best_ar_name = alias
                        break
            
            # If not in manual, check existing aliases in DB
            if not best_ar_name:
                aliases = await conn.fetch("""
                    SELECT alias_text_norm FROM ticker_aliases 
                    WHERE symbol = $1 AND market_code = 'EGX'
                """, symbol)
                for a in aliases:
                    txt = a['alias_text_norm']
                    if any("\u0600" <= c <= "\u06FF" for c in txt):
                         # Pick longer one?
                         if not best_ar_name or len(txt) > len(best_ar_name):
                             best_ar_name = txt
            
            if best_ar_name:
                print(f"Updating {symbol} -> name_ar: {best_ar_name}")
                await conn.execute("""
                    UPDATE market_tickers 
                    SET name_ar = $1 
                    WHERE symbol = $2 AND market_code = 'EGX'
                """, best_ar_name, symbol)
            else:
                print(f"Skipping {symbol} (No Arabic alias found)")

        print("\n--- Injecting Massive Alias List ---")
        for symbol, alias_list in MANUAL_ALIASES.items():
            for alias in alias_list:
                norm = normalize_text(alias).normalized
                try:
                    # Insert if not exists
                    await conn.execute("""
                        INSERT INTO ticker_aliases (symbol, market_code, alias_text, alias_text_norm, priority)
                        VALUES ($1, 'EGX', $2, $3, 5)
                        ON CONFLICT (symbol, market_code, alias_text_norm) DO NOTHING
                    """, symbol, alias, norm)
                    print(f"Injected alias for {symbol}: {alias} -> {norm}")
                except Exception as e:
                     print(f"Error injecting {symbol} -> {norm}: {e}")
                     # Fallback check if constraint missing
                     try:
                         # Attempt check before insert if constraint missing
                         exists = await conn.fetchval("""
                             SELECT 1 FROM ticker_aliases 
                             WHERE symbol=$1 AND alias_text_norm=$2 AND market_code='EGX'
                         """, symbol, norm)
                         if not exists:
                             await conn.execute("""
                                INSERT INTO ticker_aliases (symbol, market_code, alias_text, alias_text_norm, priority)
                                VALUES ($1, 'EGX', $2, $3, 5)
                             """, symbol, alias, norm)
                             print(f"Force Injected alias for {symbol}: {alias}")
                     except Exception as e2:
                         print(f"Failed to force inject {symbol}: {e2}")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
