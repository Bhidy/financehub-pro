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

# Robust Session Factory
def get_yahoo_session():
    import requests
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    })
    return session

def fetch_yfinance_data(symbol):
    """
    Fetched data using yfinance with an enhanced session to bypass blocks.
    """
    y_sym = symbol
    if not y_sym.endswith(".CA") and not y_sym.endswith(".SR"):
        y_sym = f"{y_sym}.CA"
        
    logger.info(f"Fetching {y_sym} via yfinance (Enhanced)...")
    
    try:
        # 1. Initialize Ticker with Custom Session
        # This is critical for cloud environments
        session = get_yahoo_session()
        t = yf.Ticker(y_sym, session=session)
        
        # 2. Force a handshake (history fetch often sets the cookie/crumb)
        # We fetch a tiny amount of history first to "prime" the session
        try:
             _ = t.history(period="5d", interval="1d")
        except Exception:
             pass 

        # 3. Access Info (this triggers the main API call)
        info = t.info
        
        # --- 1. CORE PROFILE & MARKET DATA ---
        y_prof = {
            "sector": info.get('sector'),
            "industry": info.get('industry'),
            "description": info.get('longBusinessSummary') or info.get('description'),
            "website": info.get('website'),
            "headquarters_city": info.get('city'),
            "employees": info.get('fullTimeEmployees'),
            "phone": info.get('phone'),
            "address": info.get('address1'),
            
            "market_cap": info.get('marketCap'),
            "currency": info.get('currency', 'EGP'),
            "price": info.get('currentPrice') or info.get('regularMarketPrice'),
            "volume": info.get('volume'),
            "avg_vol_10d": info.get('averageVolume10days'),
            "avg_vol_3m": info.get('averageVolume'),
            "open": info.get('open'),
            "prev_close": info.get('previousClose'),
            "day_high": info.get('dayHigh'),
            "day_low": info.get('dayLow'),
            "year_high": info.get('fiftyTwoWeekHigh'),
            "year_low": info.get('fiftyTwoWeekLow'),
            "bid": info.get('bid'),
            "ask": info.get('ask'),
            "bid_size": info.get('bidSize'),
            "ask_size": info.get('askSize'),
            
            "shares_outstanding": info.get('sharesOutstanding'),
            "float_shares": info.get('floatShares'),
            "implied_shares": info.get('impliedSharesOutstanding'),
            "short_ratio": info.get('shortRatio'),
        }

        # --- 2. FUNDAMENTALS, RISK & OWNERSHIP ---
        y_fund = {
            "pe_ratio": info.get('trailingPE') or info.get('forwardPE'),
            "forward_pe": info.get('forwardPE'),
            "peg_ratio": info.get('pegRatio'),
            "price_to_book": info.get('priceToBook'),
            "price_to_sales": info.get('priceToSalesTrailing12Months'),
            "enterprise_value": info.get('enterpriseValue'),
            "enterprise_to_revenue": info.get('enterpriseToRevenue'),
            "enterprise_to_ebitda": info.get('enterpriseToEbitda'),
            
            "profit_margin": info.get('profitMargins'),
            "operating_margin": info.get('operatingMargins'),
            "gross_margin": info.get('grossMargins'),
            "ebitda_margin": info.get('ebitdaMargins'),
            "return_on_assets": info.get('returnOnAssets'),
            "return_on_equity": info.get('returnOnEquity'),
            
            "total_cash": info.get('totalCash'),
            "total_debt": info.get('totalDebt'),
            "total_revenue": info.get('totalRevenue'),
            "debt_to_equity": info.get('debtToEquity'),
            "current_ratio": info.get('currentRatio'),
            "quick_ratio": info.get('quickRatio'),
            "free_cash_flow": info.get('freeCashflow'),
            "operating_cash_flow": info.get('operatingCashflow'),
            
            "trailing_eps": info.get('trailingEps'),
            "forward_eps": info.get('forwardEps'),
            "book_value": info.get('bookValue'),
            "revenue_per_share": info.get('revenuePerShare'),
            
            "dividend_rate": info.get('dividendRate'),
            "dividend_yield": (info.get('dividendYield') or 0) * 100 if info.get('dividendYield') else None,
            "payout_ratio": info.get('payoutRatio'),
            "ex_dividend_date": info.get('exDividendDate'),
            
            "target_price": info.get('targetMeanPrice'),
            "recommendation": info.get('recommendationKey'),
            "beta": info.get('beta'),
            
            "insider_percent": info.get('heldPercentInsiders'),
            "institution_percent": info.get('heldPercentInstitutions'),
            "audit_risk": info.get('auditRisk'),
            "board_risk": info.get('boardRisk'),
            "compensation_risk": info.get('compensationRisk'),
            "shareholder_rights_risk": info.get('shareHolderRightsRisk'),
            "overall_risk": info.get('overallRisk'),
        }

        # API 2: History (Time Series)
        y_hist = []
        try:
             # Re-use ticker with session
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

                         item = {
                             "date": dt_str,
                             "open": row.get('open'),
                             "high": row.get('high'),
                             "low": row.get('low'),
                             "close": row.get('close'),
                             "volume": row.get('volume')
                         }
                         if 'dividends' in row and row['dividends'] > 0:
                             item['dividend'] = row['dividends']
                         if 'stock splits' in row and row['stock splits'] != 0:
                             item['split'] = row['stock splits']
                             
                         y_hist.append(item)
        except Exception as eh:
            logger.warning(f"History fetch error for {y_sym}: {eh}")

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
    asyncio.run(main())
