from fastapi import APIRouter, HTTPException, Depends
from app.db.session import db
from typing import List, Optional
import os
import datetime
import asyncio
import pandas as pd
from yahooquery import Ticker
from decimal import Decimal

router = APIRouter()

# Helper function to serialize PostgreSQL data for JSON
def serialize_for_json(obj):
    """Convert PostgreSQL types (Decimal, datetime) to JSON-serializable types."""
    if isinstance(obj, dict):
        return {k: serialize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_for_json(item) for item in obj]
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    elif obj is None:
        return None
    else:
        return obj

@router.get("/market")
async def get_market_overview():
    """
    Returns data for Market Overview page (mapped to market_tickers):
    - Market Breadth (Advancers/Decliners)
    - Top Gainers/Losers
    - Sector Performance
    - Volume Leaders
    """
    # 1. Broad Market Data from market_tickers (EGX)
    query_all = """
    SELECT symbol as isin, symbol, name_en, sector_name as sector,
           last_price, change_percent as change_pct, volume, market_cap
    FROM market_tickers
    WHERE market_code = 'EGX' AND last_price IS NOT NULL
    """
    rows = await db.fetch_all(query=query_all)
    data = [dict(r) for r in rows]
    
    # 2. Process in Python
    gainers = sorted(data, key=lambda x: x['change_pct'] or -999, reverse=True)[:5]
    losers = sorted(data, key=lambda x: x['change_pct'] or 999)[:5]
    active = sorted(data, key=lambda x: x['volume'] or -1, reverse=True)[:5]
    
    # Sector Perf
    sectors = {}
    for d in data:
        s = d['sector'] or 'Unknown'
        if s not in sectors: sectors[s] = {'sum_pct': 0, 'count': 0, 'volume': 0}
        sectors[s]['sum_pct'] += (d['change_pct'] or 0)
        sectors[s]['volume'] += (d['volume'] or 0)
        sectors[s]['count'] += 1
        
    sector_list = [
        {'name': k, 'performance': v['sum_pct']/(v['count'] if v['count'] > 0 else 1), 'volume': v['volume']}
        for k,v in sectors.items() if v['count'] > 0
    ]
    
    return {
        "status": "ok",
        "market_pulse": {
            "count": len(data),
            "up": len([x for x in data if (x['change_pct'] or 0) > 0]),
            "down": len([x for x in data if (x['change_pct'] or 0) < 0]),
            "volume_total": sum(x['volume'] or 0 for x in data)
        },
        "top_gainers": gainers,
        "top_losers": losers,
        "most_active": active,
        "sectors": sorted(sector_list, key=lambda x: x['performance'], reverse=True)
    }

@router.get("/watchlist")
async def get_watchlist():
    """
    Returns flat list of all EGX stocks for the Watchlist Grid.
    """
    query = """
    SELECT symbol as isin, symbol, name_en, sector_name as sector, 
           last_price, change, change_percent as change_pct, volume, market_cap,
           high as day_high, low as day_low, last_updated,
           pe_ratio, dividend_yield
    FROM market_tickers
    WHERE market_code = 'EGX'
    ORDER BY volume DESC NULLS LAST
    """
    rows = await db.fetch_all(query=query)
    return {"data": [dict(r) for r in rows]}

@router.get("/stock/{symbol_or_isin}")
@router.get("/stock/{symbol_or_isin}")
async def get_stock_profile(symbol_or_isin: str):
    """
    ENTERPRISE STOCK PROFILE ENDPOINT (Fail-Safe Arch)
    1. Primary Source: Local DB (Fast, Reliable).
    2. Secondary Source: Live YahooQuery (Best Effort).
    
    GUARANTEE: If stock exists in DB, this endpoint returns 200 OK.
    External failures (Yahoo, Network) are suppressed and logged as warnings.
    """
    # 1. Init Response Structure
    response_data = {
        "profile": {},
        "fundamentals": {},
        "financials_full": {},
        "history": [],
        "debug": None
    }
    
    try:
        # A. Resolve Symbol (DB Lookup)
        q_basic = """
        SELECT symbol as isin, symbol, name_en, name_ar, sector_name as sector,
               last_price, change, change_percent as change_pct, volume, market_cap,
               high as day_high, low as day_low, open_price as open, prev_close,
               pe_ratio, pb_ratio, last_updated, dividend_yield, beta, target_price,
               high_52w, low_52w
        FROM market_tickers
        WHERE symbol = $1
        """
        
        # Strategies: Exact -> +CA -> Clean+CA -> Clean
        basic = await db.fetch_one(q_basic, symbol_or_isin)
        if not basic and not symbol_or_isin.endswith(".CA"):
            basic = await db.fetch_one(q_basic, f"{symbol_or_isin}.CA")
        if not basic:
            clean = symbol_or_isin.upper().replace(".EG", "").replace(".CA", "")
            if clean != symbol_or_isin:
                basic = await db.fetch_one(q_basic, f"{clean}.CA")
        if not basic:
            clean_raw = symbol_or_isin.upper().replace(".EG", "").replace(".CA", "")
            basic = await db.fetch_one(q_basic, clean_raw)

        # EXIT 1: Stock Not Found in DB
        if not basic:
            raise HTTPException(status_code=404, detail=f"Stock {symbol_or_isin} not found")
                
        real_symbol = basic['symbol']
        basic_dict = dict(basic)
        response_data["profile"] = basic_dict
        
        # B. Fetch Aux DB Data (Best Effort)
        try:
            q_val = "SELECT * FROM valuation_history WHERE symbol = $1 ORDER BY as_of_date DESC LIMIT 1"
            val = await db.fetch_one(q_val, real_symbol)
            if val:
                response_data["fundamentals"] = dict(val)
        except Exception:
            pass # Non-critical

        try:
            q_hist = "SELECT time as date, open, high, low, close, volume FROM ohlc_history WHERE symbol = $1 ORDER BY time ASC LIMIT 1000"
            hist_rows = await db.fetch_all(q_hist, real_symbol)
            response_data["history"] = [dict(r) for r in hist_rows]
        except Exception:
            pass # Non-critical
            
        # C. Live Enrichment (ISOLATED SANDBOX)
        # Only run if we are missing critical data OR if we want to ensure freshness for EGX
        # checking specific critical keys for the frontend
        critical_keys = ['market_cap', 'pe_ratio', 'year_high', 'volume']
        missing_critical = any(basic_dict.get(k) is None for k in critical_keys)
        
        # We also want to force it for EGX .CA stocks to get the detailed Yahoo fields (bid, ask, margins)
        # that are likely not in the DB Basic table.
        is_egx_target = real_symbol.endswith('.CA') or symbol_or_isin.upper().endswith('CA')
        
        needs_profile = missing_critical or is_egx_target or (len([k for k, v in basic_dict.items() if v is None]) > 3)
        needs_history = len(response_data["history"]) == 0
        
        # C. Enterprise Reservoir Check (First Line of Defense)
        import json
        
        cache_hit = False
        try:
            # Check Cache Table
            cache_row = await db.fetch_one("SELECT profile_data, financial_data, history_data FROM yahoo_cache WHERE symbol = $1", real_symbol.replace(".CA", "")) # Cache keys are usually clean
            
            if not cache_row and real_symbol.endswith(".CA"):
                 cache_row = await db.fetch_one("SELECT profile_data, financial_data, history_data FROM yahoo_cache WHERE symbol = $1", real_symbol)
            
            if cache_row:
                # Merge Cached Data
                c_prof = json.loads(cache_row['profile_data']) if cache_row['profile_data'] else {}
                c_fund = json.loads(cache_row['financial_data']) if cache_row['financial_data'] else {}
                c_hist = json.loads(cache_row['history_data']) if cache_row['history_data'] else []
                
                # Merge into Response
                if c_prof:
                     for k,v in c_prof.items():
                         if v is not None:
                             response_data["profile"][k] = v
                if c_fund:
                    for k,v in c_fund.items():
                        if v is not None:
                            response_data["fundamentals"][k] = v
                if c_hist:
                    response_data["history"] = c_hist
                
                cache_hit = True
                response_data["debug"] = "Served from Enterprise Reservoir (DB Cache)"
        
        except Exception as e:
            print(f"Cache Read Error: {e}")

        # D. Live Fallback (Only if Cache Miss)
        if (needs_profile or needs_history) and not cache_hit:
            try:
                # SAFE ASYNC WRAPPER
                loop = asyncio.get_running_loop()
                
                def _safe_fetch_live():
                    try:
                        import yfinance as yf
                        import requests
                        import pandas as pd
                        
                        y_sym = real_symbol
                        if not y_sym.endswith(".CA") and not y_sym.endswith(".SR"):
                            y_sym = f"{y_sym}.CA"
                            
                        # --- ROBUST SESSION FACTORY (Cloud Bypass) ---
                        session = requests.Session()
                        session.headers.update({
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5',
                            'DNT': '1',
                            'Connection': 'keep-alive',
                            'Upgrade-Insecure-Requests': '1',
                        })
                        
                        # Initialize Ticker with Session
                        t = yf.Ticker(y_sym, session=session)
                        
                        # Cookie Priming (Force Handshake)
                        try:
                             _ = t.history(period="5d", interval="1d")
                        except Exception:
                             pass
                             
                        # Fetch Info
                        info = t.info
                        
                        # --- 1. CORE PROFILE ---
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

                        # --- 2. FUNDAMENTALS ---
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
                        
                        y_hist = []
                        # API 2: Chart History (Time Series)
                        if needs_history:
                            try:
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
                                             # Dividends logic if needed
                                             y_hist.append(item)
                            except Exception as eh:
                                print(f"History Fetch Error: {eh}")

                        return y_prof, y_fund, y_hist, None

                    except Exception as inner_e:
                        print(f"Yahoo Direct Fetch Error: {str(inner_e)}")
                        return {}, {}, [], str(inner_e)

                # Execute with strict timeout to prevent hanging
                live_prof, live_fund, live_hist, live_err = await asyncio.wait_for(
                    loop.run_in_executor(None, _safe_fetch_live), 
                    timeout=15.0
                )
                
                if not live_err:
                     if live_prof: response_data["profile"].update(live_prof)
                     if live_fund: response_data["fundamentals"].update(live_fund)
                     if live_hist: response_data["history"] = live_hist
                     
            except Exception as e:
                response_data["debug"] = f"Live Fetch System Error: {str(e)}"

        # D. Final Serialization (CRITICAL)
        # This prevents the 500 Error from Decimal/Date types
        return serialize_for_json(response_data)

    except HTTPException as he:
        raise he
    except Exception as e:
        # Failsafe: Return minimal structure with error
        print(f"CRITICAL API CRASH: {e}")
        import traceback
        traceback.print_exc()
        return {
             "profile": {"symbol": symbol_or_isin, "error": "Backend Recovery Mode"},
             "history": [],
             "debug": f"CRITICAL: {str(e)}"
        }
@router.get("/stock-debug/{symbol}")
async def debug_stock_profile(symbol: str):
    log = []
    try:
        log.append("1. Starting debug")
        
        # Test Full Production Query
        q = """
        SELECT symbol as isin, symbol, name_en, name_ar, sector_name as sector,
               last_price, change, change_percent as change_pct, volume, market_cap,
               high as day_high, low as day_low, open_price as open, prev_close,
               pe_ratio, pb_ratio, last_updated, dividend_yield, beta, target_price,
               high_52w, low_52w
        FROM market_tickers
        WHERE symbol = $1
        """
        log.append(f"2. Running FULL query for {symbol}")
        
        row = await db.fetch_one(q, symbol)
        log.append(f"3. Query result: {row}")
        
        if not row:
            log.append("4. No row found, trying .CA")
            row = await db.fetch_one(q, f"{symbol}.CA")
            log.append(f"5. Secondary query result: {row}")
            
        data = {}
        if row:
            log.append("6. Row found, converting to dict")
            data = dict(row)
            log.append(f"7. Dict data: {data}")
            
            # Serialize test
            log.append("8. Serializing")
            data = serialize_for_json(data)
            log.append(f"9. Serialized: {data}")
            
        # Test Yahoo
        log.append("10. Testing Yahoo Fallback Init")
        y_sym = f"{symbol}.CA"
        loop = asyncio.get_running_loop()
        log.append(f"11. Got loop: {loop}")
        
        def blocking_yahoo():
            try:
                t = Ticker(y_sym)
                return t.price
            except Exception as e:
                return str(e)
                
        log.append("12. Running blocking yahoo")
        res = await loop.run_in_executor(None, blocking_yahoo)
        log.append(f"13. Yahoo Result: {type(res)}")
        
        return {"log": log, "data": data}
        
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc(),
            "log": log
        }
