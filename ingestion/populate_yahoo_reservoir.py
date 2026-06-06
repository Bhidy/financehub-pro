import asyncio
import os
import sys
import math
import time
import json
import logging
import datetime
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


def _sanitize_json(obj):
    """
    Recursively convert values that PostgreSQL JSON rejects into safe ones.
    - NaN / Infinity  -> None   (Postgres: `Token "NaN" is invalid`)
    - numpy scalars   -> native Python int/float (json can't serialize np types)
    A single un-sanitized NaN previously crashed the ENTIRE 227-symbol batch.
    """
    if isinstance(obj, dict):
        return {k: _sanitize_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize_json(v) for v in obj]
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    try:
        import numpy as _np
        if isinstance(obj, _np.floating):
            f = float(obj)
            return None if (math.isnan(f) or math.isinf(f)) else f
        if isinstance(obj, _np.integer):
            return int(obj)
        if isinstance(obj, _np.bool_):
            return bool(obj)
    except Exception:
        pass
    return obj


def _safe_dumps(obj):
    """json.dumps with NaN sanitization + a hard guard (allow_nan=False)."""
    return json.dumps(_sanitize_json(obj), allow_nan=False, default=str)


def _num(x):
    """Coerce to a finite float, else None (drops NaN/Inf/garbage)."""
    if x is None:
        return None
    try:
        f = float(x)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return None


def _hist_to_ohlc_rows(symbol, hist):
    """Build (symbol, date, o, h, l, c, adj_close, volume) rows for the ohlc_data table.
    The Market-Pulse chart reads ohlc_data, NOT yahoo_cache — so the reservoir must
    keep BOTH in sync or charts silently freeze while the cache looks fresh.
    IMPORTANT: asyncpg date codec requires datetime.date objects, NOT strings.
    Passing a raw string raises: 'str' object has no attribute 'toordinal'"""
    rows = []
    for b in hist or []:
        try:
            d_str = str(b.get("date", ""))[:10]
            if not d_str:
                continue
            d = datetime.date.fromisoformat(d_str)  # datetime.date required by asyncpg
            o, h, l, c = _num(b.get("open")), _num(b.get("high")), _num(b.get("low")), _num(b.get("close"))
            if None in (o, h, l, c) or c <= 0:
                continue
            v = int(_num(b.get("volume")) or 0)
            rows.append((symbol, d, o, h, l, c, c, v))
        except Exception:
            continue
    return rows

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
        
    total = len(symbols)
    logger.info(f"Starting ingestion for {total} symbols...")

    saved = 0
    ohlc_written = 0   # symbols where ohlc_data was actually updated
    ohlc_attempted = 0 # symbols that had bars to write
    no_data = []       # Yahoo returned nothing
    failed = []        # raised an exception (isolated, does not abort the run)

    for idx, sym in enumerate(symbols, 1):
        clean_sym = sym.replace(".CA", "")
        start_t = time.time()

        try:
            res = await asyncio.to_thread(fetch_yfinance_data, clean_sym)

            if not res:
                logger.warning(f"[{idx}/{total}] NO DATA {clean_sym}")
                no_data.append(clean_sym)
                continue

            prof, fund, hist = res

            # MERGE LOGIC: Read existing to preserve any prior data that Yahoo omits
            existing = await conn.fetchrow(
                "SELECT profile_data, financial_data, history_data FROM yahoo_cache WHERE symbol=$1",
                clean_sym,
            )

            final_prof = prof
            final_fund = fund
            final_hist = hist

            if existing:
                # Overlay Yahoo on top of existing, but never overwrite valid data with None
                if existing['profile_data']:
                    existing_prof = json.loads(existing['profile_data'])
                    for k, v in existing_prof.items():
                        if k not in final_prof or final_prof[k] is None:
                            final_prof[k] = v
                # Preserve existing financials if Yahoo returns None for a field
                if existing['financial_data']:
                    existing_fund = json.loads(existing['financial_data'])
                    for k, v in existing_fund.items():
                        if k not in final_fund or final_fund[k] is None:
                            final_fund[k] = v
                # Keep existing history if Yahoo fetch returned nothing
                if not final_hist and existing['history_data']:
                    final_hist = json.loads(existing['history_data'])

            # Upsert — NaN-safe serialization (a single NaN used to abort all 227 symbols)
            await conn.execute("""
                INSERT INTO yahoo_cache (symbol, profile_data, financial_data, history_data, last_updated)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (symbol) DO UPDATE
                SET profile_data=$2, financial_data=$3, history_data=$4, last_updated=NOW()
            """, clean_sym, _safe_dumps(final_prof), _safe_dumps(final_fund), _safe_dumps(final_hist))

            # Keep ohlc_data (the table the public chart reads) in sync with the cache.
            ohlc_rows = _hist_to_ohlc_rows(clean_sym, final_hist)
            if ohlc_rows:
                ohlc_attempted += 1
                await conn.executemany("""
                    INSERT INTO ohlc_data (symbol, date, open, high, low, close, adj_close, volume)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (symbol, date) DO UPDATE SET
                        open=EXCLUDED.open, high=EXCLUDED.high, low=EXCLUDED.low,
                        close=EXCLUDED.close, adj_close=EXCLUDED.adj_close, volume=EXCLUDED.volume
                """, ohlc_rows)
                ohlc_written += 1

            saved += 1
            logger.info(f"[{idx}/{total}] SAVED {clean_sym} ({len(ohlc_rows)} bars) in {time.time()-start_t:.2f}s")

        except Exception as e:
            # Isolate per-symbol failures — never let one symbol kill the whole run.
            failed.append(clean_sym)
            logger.error(f"[{idx}/{total}] ERROR {clean_sym}: {type(e).__name__}: {e}")

        # Respectful Sleep
        time.sleep(1.5)

    await conn.close()
    logger.info(
        f"Ingestion Complete. saved={saved}/{total} | ohlc_written={ohlc_written}/{ohlc_attempted} | no_data={len(no_data)} | errors={len(failed)}"
    )
    if failed:
        logger.warning(f"Symbols with errors: {', '.join(failed[:50])}")

    # Fail on total wipeout.
    if saved == 0 and total > 0:
        logger.error("FATAL: 0 symbols saved — failing the job.")
        sys.exit(1)
    # Fail loudly when ohlc writes are universally broken (catches type-error regressions).
    # A prior bug passed date as str instead of datetime.date, causing 100% ohlc failures
    # while delisted-symbol saves kept `saved` > 0, masking the failure entirely.
    if ohlc_attempted > 10 and ohlc_written == 0:
        logger.error(f"FATAL: 0/{ohlc_attempted} ohlc_data writes succeeded — chart data frozen. Check _hist_to_ohlc_rows.")
        sys.exit(1)

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
