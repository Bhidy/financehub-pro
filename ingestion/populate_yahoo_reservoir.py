import asyncio
import os
import time
import json
import logging
import yfinance as yf
import pandas as pd
import asyncpg
from dotenv import load_dotenv

# Setup
load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("yahoo_ingestion_yf.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

# Robust Session Factory (Chrome Impersonation)
def get_yahoo_session():
    try:
        from curl_cffi import requests as crequests
        # Impersonate Chrome 120+ to look exactly like a real user
        session = crequests.Session(impersonate="chrome")
        session.headers.update({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Upgrade-Insecure-Requests': '1',
        })
        return session
    except ImportError:
        logger.error("curl_cffi not installed. Falling back to simple requests (High Risk of Block).")
        import requests
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        return session

def fetch_yfinance_data(symbol):
    """
    Fetched data using yfinance with Smart Session (Chrome Impersonation).
    Captures ALL available data points.
    """
    y_sym = symbol
    if not y_sym.endswith(".CA") and not y_sym.endswith(".SR"):
        y_sym = f"{y_sym}.CA"
        
    logger.info(f"Fetching {y_sym} via Smart-Agent...")
    
    try:
        # 1. Initialize Ticker with Chrome Session
        session = get_yahoo_session()
        t = yf.Ticker(y_sym, session=session)
        
        # 2. History Fetch (Primary Source for Price/Volume reliability)
        y_hist = []
        try:
             # Fetch 1 year of daily history
             df = t.history(period="1y", interval="1d")
             if isinstance(df, pd.DataFrame) and not df.empty:
                 df = df.reset_index()
                 df.columns = [c.lower() for c in df.columns]
                 
                 for _, row in df.iterrows():
                     if 'date' in row:
                         dt = row['date']
                         if hasattr(dt, 'strftime'):
                             dt_str = dt.strftime('%Y-%m-%dT%H:%M:%S+00:00')
                         else:
                             dt_str = str(dt)
                         
                         # Basic OHLCV
                         item = {
                             "date": dt_str,
                             "open": row.get('open'),
                             "high": row.get('high'),
                             "low": row.get('low'),
                             "close": row.get('close'),
                             "volume": row.get('volume')
                         }
                         y_hist.append(item)
        except Exception as eh:
            logger.warning(f"History fetch error for {y_sym}: {eh}")

        # 3. Info Fetch (Deep Metadata)
        # We capture everything to ensure NO data point is lost
        info = t.info
        
        # We start with the full raw info dump
        y_prof = info.copy()
        
        # Add standardized keys for frontend compatibility
        # (This ensures existing UI components still work while new ones use the raw keys)
        std_prof = {
            "sector": info.get('sector'),
            "industry": info.get('industry'),
            "description": info.get('longBusinessSummary') or info.get('description'),
            "market_cap": info.get('marketCap'),
            "price": info.get('currentPrice') or info.get('regularMarketPrice'),
            "volume": info.get('volume'),
            "prev_close": info.get('previousClose'),
            "year_high": info.get('fiftyTwoWeekHigh'),
            "year_low": info.get('fiftyTwoWeekLow'),
        }
        y_prof.update(std_prof) # Overlay standardized keys
        
        # Same for fundamentals - dump everything
        y_fund = info.copy()
        std_fund = {
             "pe_ratio": info.get('trailingPE') or info.get('forwardPE'),
             "dividend_yield": (info.get('dividendYield') or 0) * 100 if info.get('dividendYield') else None,
        }
        y_fund.update(std_fund)

        return y_prof, y_fund, y_hist

    except Exception as e:
        logger.error(f"EXCEPTION {y_sym}: {e}")
        return None

async def main():
    if not DATABASE_URL:
        logger.error("No DATABASE_URL")
        return

    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    # Get symbols
    rows = await conn.fetch("SELECT symbol FROM market_tickers WHERE market_code='EGX' OR symbol LIKE '%.CA' OR symbol LIKE '%.SR'")
    symbols = [r['symbol'] for r in rows]
    # Fallback
    if not symbols:
        symbols = ["COMI", "SWDY", "ETEL", "EAST", "HRHO", "MNHD", "TMGH", "EKHO", "ADIB", "HDBK"]
        
    logger.info(f"Starting ingestion for {len(symbols)} symbols...")
    
    for sym in symbols:
        clean_sym = sym.replace(".CA", "")
        
        # Check if recently updated (prevent spamming if re-running)
        # cache_row = await conn.fetchrow("SELECT last_updated FROM yahoo_cache WHERE symbol=$1", clean_sym)
        # if cache_row:
        #    ... logic to skip ...
        
        start_t = time.time()
        res = await asyncio.to_thread(fetch_yfinance_data, clean_sym)
        
        if res:
            prof, fund, hist = res
            
            # MERGE LOGIC: Read existing to prevent overwriting StockAnalysis data
            existing = await conn.fetchrow("SELECT profile_data, financial_data, history_data FROM yahoo_cache WHERE symbol=$1", clean_sym)
            
            final_prof = prof
            final_fund = fund
            final_hist = hist
            
            if existing:
                # Merge Profile
                if existing['profile_data']:
                    existing_prof = json.loads(existing['profile_data'])
                    # We prefer Yahoo for Price/Vol, but StockAnalysis for Desc/Sector if Yahoo is missing
                    # Actually, let's overlay Yahoo ON TOP of valid existing data, but don't overwrite valid data with None
                    for k, v in existing_prof.items():
                        if k not in final_prof or final_prof[k] is None:
                            final_prof[k] = v
                            
                # Merge Financials
                if existing['financial_data']:
                    existing_fund = json.loads(existing['financial_data'])
                    for k, v in existing_fund.items():
                        # Preserve StockAnalysis margins if Yahoo is None
                        if k not in final_fund or final_fund[k] is None:
                            final_fund[k] = v
                
                # History: Yahoo is usually the source of truth for history, so we overwrite or append?
                # Overwriting history is usually safer to avoid gaps/dupes, assuming Yahoo fetch was successful.
                # If Yahoo fetch failed (hist empty), keep existing.
                if not final_hist and existing['history_data']:
                    final_hist = json.loads(existing['history_data'])

            # Upsert
            await conn.execute("""
                INSERT INTO yahoo_cache (symbol, profile_data, financial_data, history_data, last_updated)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (symbol) DO UPDATE 
                SET profile_data=$2, financial_data=$3, history_data=$4, last_updated=NOW()
            """, clean_sym, json.dumps(final_prof), json.dumps(final_fund), json.dumps(final_hist))
            
            logger.info(f"SAVED {clean_sym} in {time.time()-start_t:.2f}s")
        else:
            logger.warning(f"FAILED {clean_sym}")
        
        # Respectful Sleep
        time.sleep(1.5) 

    await conn.close()
    logger.info("Ingestion Complete.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--test-symbol", help="Run in debug mode for a single symbol (No DB write)")
    args = parser.parse_args()

    if args.test_symbol:
        # DEBUG MODE: Fetch and Dump
        print(f"--- DEBUG MODE: Fetching {args.test_symbol} ---")
        res = fetch_yfinance_data(args.test_symbol)
        if res:
            prof, fund, hist = res
            print("\n[SUCCESS] Data Extracted!")
            print(f"Profile Keys: {len(prof)} extracted")
            print(f"Financial Keys: {len(fund)} extracted")
            print(f"History Rows: {len(hist)}")
            
            print("\n--- SAMPLE PROFILE DATA (Full Dump) ---")
            print(json.dumps(prof, indent=2, default=str))
            
            print("\n--- SAMPLE HISTORY (Last 1) ---")
            if hist:
                print(hist[-1])
        else:
            print("[FAIL] No data returned.")
    else:
        # PRODUCTION MODE
        asyncio.run(main())
