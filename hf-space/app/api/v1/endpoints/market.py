from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.db.session import db
import yfinance as yf
from cachetools import TTLCache
import asyncio
from datetime import datetime
import pandas as pd

# Cache for 1 minute (60 seconds)
intraday_cache = TTLCache(maxsize=500, ttl=60)


router = APIRouter()

@router.get("/tickers", response_model=List[dict])
async def get_tickers():
    query = """
        SELECT symbol, name_en, name_ar, sector_name, last_price, change, change_percent, volume, market_code 
        FROM market_tickers 
        ORDER BY last_price DESC NULLS LAST
    """
    rows = await db.fetch_all(query)
    
    results = [dict(row) for row in rows]
    return results

@router.get("/history/{symbol}", response_model=List[dict])
async def get_history(symbol: str, limit: int = 100):
    query = """
        SELECT time, open, high, low, close, volume 
        FROM ohlc_history 
        WHERE symbol = $1 
        ORDER BY time DESC 
        LIMIT $2
    """
    return await db.fetch_all(query, symbol, limit)

@router.get("/ohlc/{symbol}", response_model=List[dict])
async def get_ohlc(symbol: str, period: str = "1y"):
    """Get OHLC data from ohlc_history table (production data)"""
    limit_map = {"1m": 30, "3m": 90, "6m": 180, "1y": 365, "3y": 1095, "5y": 1825, "max": 10000}
    limit = limit_map.get(period, 365)
    
    # Use ohlc_history table (has data), with 'time' column instead of 'date'
    query = """
        SELECT time as date, open, high, low, close, volume 
        FROM ohlc_history 
        WHERE symbol = $1 
        ORDER BY time DESC 
        LIMIT $2
    """
    return await db.fetch_all(query, symbol, limit)

@router.get("/stats")
async def get_stats():
    try:
        count = await db.fetch_one("SELECT count(*) as total FROM market_tickers")
        return count
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/news", response_model=List[dict])
async def get_news(limit: int = 20, symbol: str = None):
    query = """
        SELECT id, symbol, headline, source, url, published_at, sentiment_score
        FROM market_news
    """
    params = []
    if symbol:
        query += " WHERE symbol = $1"
        params.append(symbol)
        
    query += f" ORDER BY published_at DESC LIMIT {limit}"
    
    if symbol:
        return await db.fetch_all(query, symbol)
    else:
        return await db.fetch_all(query)

@router.get("/financials/{symbol}", response_model=List[dict])
async def get_financials(symbol: str):
    return await db.fetch_all("""
        SELECT *,
            ROUND((gross_profit / NULLIF(revenue, 0) * 100), 2) as gross_margin,
            ROUND((operating_income / NULLIF(revenue, 0) * 100), 2) as operating_margin,
            ROUND((net_income / NULLIF(revenue, 0) * 100), 2) as net_margin,
            ROUND((net_income / NULLIF(total_assets, 0) * 100), 2) as roa,
            ROUND((net_income / NULLIF(total_equity, 0) * 100), 2) as roe,
            ROUND((total_liabilities / NULLIF(total_equity, 0)), 2) as debt_to_equity
        FROM financial_statements 
        WHERE symbol = $1 
        ORDER BY fiscal_year DESC
    """, symbol)

@router.get("/sectors", response_model=List[dict])
async def get_sectors():
    query = """
        SELECT 
            sector_name, 
            count(*) as ticker_count,
            avg(change_percent) as performance,
            sum(volume) as total_volume
        FROM market_tickers 
        WHERE sector_name IS NOT NULL
        GROUP BY sector_name
        ORDER BY performance DESC
    """
    return await db.fetch_all(query)

@router.get("/market-summary")
async def get_market_summary_endpoint():
    """Get market summary statistics (Gainers/Losers/Volume)"""
    summary = await db.fetch_one("""
        SELECT 
            COUNT(CASE WHEN change_percent > 0 THEN 1 END) as gainers,
            COUNT(CASE WHEN change_percent < 0 THEN 1 END) as losers,
            COUNT(CASE WHEN change_percent = 0 THEN 1 END) as unchanged,
            SUM(volume) as total_volume
        FROM market_tickers 
        WHERE market_code = 'EGX'
    """)
    
    top_gainers = await db.fetch_all("SELECT * FROM market_tickers WHERE market_code = 'EGX' ORDER BY change_percent DESC LIMIT 5")
    top_losers = await db.fetch_all("SELECT * FROM market_tickers WHERE market_code = 'EGX' ORDER BY change_percent ASC LIMIT 5")
    most_active = await db.fetch_all("SELECT * FROM market_tickers WHERE market_code = 'EGX' ORDER BY volume DESC LIMIT 5")
    
    return {
        "market_status": "Open",
        "summary": dict(summary) if summary else {},
        "top_gainers": [dict(r) for r in top_gainers],
        "top_losers": [dict(r) for r in top_losers],
        "most_active": [dict(r) for r in most_active]
    }

@router.get("/screener", response_model=List[dict])
async def get_screener(
    min_price: float = 0,
    max_price: float = 10000,
    sector: str = None,
    sort_by: str = "volume",
    order: str = "desc",
    market_code: str = None 
):
    query = """
        SELECT DISTINCT ON (t.symbol)
            t.symbol, t.name_en, t.sector_name, t.last_price, t.change_percent, t.volume,
            t.market_code,
            ROUND((t.last_price * 100000000 / (COALESCE(f.net_income, 100000000))), 2) as pe_ratio,
            ROUND((COALESCE(f.revenue, 0) / 1000000000), 2) as market_cap_b
        FROM market_tickers t
        LEFT JOIN (
            SELECT DISTINCT ON (symbol) symbol, net_income, revenue 
            FROM financial_statements 
            ORDER BY symbol, fiscal_year DESC
        ) f ON t.symbol = f.symbol
        WHERE 
            COALESCE(t.last_price, 0) >= $1 AND COALESCE(t.last_price, 0) <= $2
    """
    params = [min_price, max_price]
    param_idx = 3
    
    if sector and sector not in ["All", "All Sectors"]:
        query += f" AND t.sector_name = ${param_idx}"
        params.append(sector)
        param_idx += 1
        
    if market_code:
        # Logic: If EGX, strict match. If TDWL (Saudi), match TDWL OR NULL (since some Saudi stocks have null market_code)
        if market_code == 'EGX':
            query += f" AND t.market_code = 'EGX'"
        else:
             # Saudi/Default
            query += f" AND (t.market_code = 'TDWL' OR t.market_code IS NULL OR t.market_code != 'EGX')"

    query += f" ORDER BY t.symbol, {sort_by} {order.upper()} LIMIT 50"
    
    return await db.fetch_all(query, *params)

@router.get("/funds", response_model=List[dict])
async def get_mutual_funds(market: str = None):
    """Get all mutual funds with latest NAV, optionally filtered by market (TDWL/EGX)"""
    # Base query with COALESCE to use nav_history first, then fallback to mutual_funds.latest_nav
    # Also filters out bogus scraped entries (fund names that are just years)
    bogus_pattern = ['3 Years', '5 Years', '7 Years', '10 Years', '15 Years']
    
    if market:
        market_code = 'EGX' if market.upper() in ['EGX', 'EGYPT', 'EG'] else 'TDWL'
        query = """
            SELECT f.*, 
                   COALESCE(
                       (SELECT nav FROM nav_history 
                        WHERE fund_id = f.fund_id 
                        ORDER BY date DESC LIMIT 1),
                       f.latest_nav,
                       0
                   ) as latest_nav
            FROM mutual_funds f
            WHERE f.market_code = $1
              AND f.fund_name_en NOT IN ('3 Years', '5 Years', '7 Years', '10 Years', '15 Years')
              AND f.fund_name_en NOT LIKE '%Years%'
            ORDER BY fund_name
        """
        return await db.fetch_all(query, market_code)
    else:
        # Return all funds if no market filter
        query = """
            SELECT f.*, 
                   COALESCE(
                       (SELECT nav FROM nav_history 
                        WHERE fund_id = f.fund_id 
                        ORDER BY date DESC LIMIT 1),
                       f.latest_nav,
                       0
                   ) as latest_nav
            FROM mutual_funds f
            WHERE f.fund_name_en NOT IN ('3 Years', '5 Years', '7 Years', '10 Years', '15 Years')
              AND f.fund_name_en NOT LIKE '%Years%'
            ORDER BY fund_name
        """
        return await db.fetch_all(query)

@router.get("/funds/{fund_id}", response_model=dict)
async def get_fund_details(fund_id: str):
    """Get specific fund details"""
    query = """
        SELECT f.*, 
               (SELECT nav FROM nav_history 
                WHERE fund_id = f.fund_id 
                ORDER BY date DESC LIMIT 1) as latest_nav,
               (SELECT date FROM nav_history 
                WHERE fund_id = f.fund_id 
                ORDER BY date DESC LIMIT 1) as last_update
        FROM mutual_funds f
        WHERE f.fund_id = $1
    """
    fund = await db.fetch_one(query, fund_id)
    if not fund:
        # Fallback: Try Name Search
        query_name = """
            SELECT f.*, 
                   (SELECT nav FROM nav_history 
                    WHERE fund_id = f.fund_id 
                    ORDER BY date DESC LIMIT 1) as latest_nav,
                   (SELECT date FROM nav_history 
                    WHERE fund_id = f.fund_id 
                    ORDER BY date DESC LIMIT 1) as last_update
            FROM mutual_funds f
            WHERE f.fund_name_en ILIKE $1
        """
        # Try exact or fuzzy
        fund = await db.fetch_one(query_name, fund_id)
        if not fund:
             # Try unquoted? The browser sends "Azimut Target Maturity Fund 2024"
             fund = await db.fetch_one(query_name, f"%{fund_id}%")

    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
        
    # Ensure ID is correct for subsequent queries
    real_fund_id = fund['fund_id']

    # Fetch Peers
    peers_query = "SELECT * FROM fund_peers WHERE fund_id = $1 ORDER BY ranking"
    peers = await db.fetch_all(peers_query, real_fund_id)
    
    # Fetch Actions
    actions_query = "SELECT * FROM fund_actions WHERE fund_id = $1 ORDER BY action_date DESC"
    actions = await db.fetch_all(actions_query, real_fund_id)
    
    # Merge into response
    return {
        **dict(fund),
        "peers": [dict(p) for p in peers],
        "actions": [dict(a) for a in actions]
    }

@router.get("/funds/stats/summary", response_model=dict)
async def get_fund_statistics():
    """Get statistics for funds (Gainers/Losers 3M/1Y and Reports)"""
    
    # helper for safe float conversion
    def to_float(val):
        try:
            return float(val) if val is not None else -999999
        except:
            return -999999

    # Fetch all EGX funds
    funds = await db.fetch_all("SELECT * FROM mutual_funds WHERE market_code = 'EGX'")
    
    # Process 3M Gainers/Losers (Coalesce returns_3m > profit_3month)
    funds_processed_3m = []
    for f in funds:
        item = dict(f)
        # Use new Decypha field if available, else legacy
        val = item.get('returns_3m')
        if val is None:
            val = item.get('profit_3month')
            
        if val is not None:
            # Update the key expected by frontend
            item['profit_3month'] = val 
            funds_processed_3m.append(item)
            
    funds_processed_3m.sort(key=lambda x: to_float(x['profit_3month']), reverse=True)
    
    gainers_3m = funds_processed_3m[:5]
    losers_3m = funds_processed_3m[-5:]
    
    # Process 1Y Gainers/Losers (Coalesce returns_1y > one_year_return)
    funds_processed_1y = []
    for f in funds:
        item = dict(f)
        val = item.get('returns_1y')
        if val is None:
            val = item.get('one_year_return')
            
        if val is not None:
            item['one_year_return'] = val
            funds_processed_1y.append(item)
            
    funds_processed_1y.sort(key=lambda x: to_float(x['one_year_return']), reverse=True)
    
    gainers_1y = funds_processed_1y[:5]
    losers_1y = funds_processed_1y[-5:]
    
    # Fetch Reports
    reports = await db.fetch_all("SELECT * FROM fund_reports WHERE market_code = 'EGX' ORDER BY report_date DESC LIMIT 10")
    
    return {
        "gainers_3m": gainers_3m,
        "losers_3m": losers_3m,
        "gainers_1y": gainers_1y,
        "losers_1y": losers_1y,
        "reports": [dict(r) for r in reports]
    }

@router.get("/funds/{fund_id}/nav", response_model=List[dict])
async def get_fund_nav_history(fund_id: str, limit: int = 365):
    """
    Get NAV history for a specific fund. 
    Use limit=0 or limit > 3000 for full history.
    """
    
    # Check if we want full history for charts
    if limit == 0 or limit > 3000:
        return await db.fetch_all("""
            SELECT date, nav, NULL as aum, NULL as units_outstanding
            FROM nav_history
            WHERE fund_id = $1
            ORDER BY date ASC
        """, fund_id)
        
    return await db.fetch_all("""
        SELECT date, nav, NULL as aum, NULL as units_outstanding
        FROM nav_history
        WHERE fund_id = $1
        ORDER BY date DESC
        LIMIT $2
    """, fund_id, limit)

@router.get("/etfs", response_model=List[dict])
async def get_etfs():
    """Get all ETFs"""
    return await db.fetch_all("SELECT * FROM etfs ORDER BY etf_name")

@router.get("/corporate-actions", response_model=List[dict])
async def get_corporate_actions(symbol: str = None, limit: int = 100):
    if symbol:
        return await db.fetch_all("""
            SELECT * FROM corporate_actions 
            WHERE symbol = $1 
            ORDER BY ex_date DESC 
            LIMIT $2""", symbol, limit)
    return await db.fetch_all(f"SELECT * FROM corporate_actions ORDER BY ex_date DESC LIMIT {limit}")

@router.get("/insider-trading", response_model=List[dict])
async def get_insider_trading(symbol: str = None, limit: int = 100):
    if symbol:
        return await db.fetch_all("""
            SELECT * FROM insider_trading 
            WHERE symbol = $1 
            ORDER BY transaction_date DESC 
            LIMIT $2""", symbol, limit)
    return await db.fetch_all(f"SELECT * FROM insider_trading ORDER BY transaction_date DESC LIMIT {limit}")

@router.get("/analyst-ratings", response_model=List[dict])
async def get_analyst_ratings(symbol: str = None, limit: int = 100):
    if symbol:
        return await db.fetch_all("""
            SELECT * FROM analyst_ratings 
            WHERE symbol = $1 
            ORDER BY rating_date DESC 
            LIMIT $2""", symbol, limit)
    return await db.fetch_all(f"SELECT * FROM analyst_ratings ORDER BY rating_date DESC LIMIT {limit}")

@router.get("/intraday/{symbol}", response_model=List[dict])
async def get_intraday_bars(symbol: str, interval: str = "1m", limit: int = 300):
    """
    Get live intraday data from Yahoo Finance.
    Proxied to avoid CORS and provide real-time updates.
    Cached for 60 seconds.
    Note: 'limit' is ignored as YF returns fixed periods (1d/5d).
    """
    # 1. Check cache
    cache_key = f"{symbol}_{interval}"
    if cache_key in intraday_cache:
        return intraday_cache[cache_key]
    
    try:
        # 2. Resolve symbol (Yahoo format: 1120.SR for Saudi, COMI.CA for Egypt)
        import re
        is_egx = bool(re.match(r'^[A-Z]{3,5}$', symbol.upper()))
        if is_egx:
            yahoo_symbol = f"{symbol.upper()}.CA"
        else:
            # Handle Saudi (numeric or .SR)
            yahoo_symbol = f"{symbol}.SR" if not symbol.endswith(".SR") else symbol
            # If it's already a full yahoo symbol (e.g. BTC-USD), keep it
            if "-" in symbol or "." in symbol and not symbol.endswith(".SR"):
                yahoo_symbol = symbol
        
        # 3. Fetch from Yahoo (running in executor to avoid blocking async loop)
        loop = asyncio.get_event_loop()
        
        def fetch_yahoo():
            ticker = yf.Ticker(yahoo_symbol)
            # Fetch 1 day of 1m data (or 5d of 5m if needed)
            period = "1d"
            if interval in ["15m", "30m", "1h"]:
                period = "5d"
                
            df = ticker.history(period=period, interval=interval)
            
            if df.empty:
                return []
                
            df = df.reset_index()
            result = []
            
            for _, row in df.iterrows():
                # Convert timestamp to ISO string
                ts = row['Datetime'] if 'Datetime' in row else row['Date']
                if isinstance(ts, pd.Timestamp):
                    ts = ts.isoformat()
                
                result.append({
                    "timestamp": ts,
                    "open": float(row['Open']),
                    "high": float(row['High']),
                    "low": float(row['Low']),
                    "close": float(row['Close']),
                    "volume": int(row['Volume'])
                })
            
            # Sort ascending (oldest first) for charts
            return result

        data = await loop.run_in_executor(None, fetch_yahoo)
        
        # 4. Update cache
        if data:
            intraday_cache[cache_key] = data
            
        return data
        
    except Exception as e:
        print(f"Error fetching intraday for {symbol}: {e}")
        # Return empty list on error to prevent frontend crash
        return []

@router.get("/order-book/{symbol}")
async def get_order_book(symbol: str):
    # Try to fetch real L2 data from DB
    row = await db.fetch_one("""
        SELECT * FROM order_book_snapshot 
        WHERE symbol = $1 
        ORDER BY created_at DESC 
        LIMIT 1
    """, symbol)
    
    if row:
        return dict(row)
    else:
        # Fallback to simulation
        import random
        ticker = await db.fetch_one("SELECT last_price FROM market_tickers WHERE symbol = $1", symbol)
        price = float(ticker['last_price']) if ticker and ticker['last_price'] else 100.0
        
        bids = []
        asks = []
        for _ in range(10):
            bid_price = price - (random.random() * 0.5)
            ask_price = price + (random.random() * 0.5)
            bids.append({"price": round(bid_price, 2), "qty": random.randint(10, 1000)})
            asks.append({"price": round(ask_price, 2), "qty": random.randint(10, 1000)})
            
        bids.sort(key=lambda x: x['price'], reverse=True)
        asks.sort(key=lambda x: x['price'])
        
        return {
            "symbol": symbol,
            "bids": bids,
            "asks": asks,
            "source": "simulation"
        }

@router.get("/market-breadth", response_model=List[dict])
async def get_market_breadth(limit: int = 30):
    return await db.fetch_all("""
        SELECT * FROM market_breadth
        WHERE market_code = 'TDWL'
        ORDER BY date DESC
        LIMIT $1""", limit)

@router.get("/economic-indicators", response_model=List[dict])
async def get_economic_indicators(limit: int = 365):
    return await db.fetch_all(f"SELECT * FROM economic_indicators ORDER BY date DESC LIMIT {limit}")

@router.get("/indices/{index_code}/constituents", response_model=List[dict])
async def get_index_constituents(index_code: str):
    return await db.fetch_all("""
        SELECT ic.*, mt.name_en, mt.last_price
        FROM index_constituents ic
        LEFT JOIN market_tickers mt ON ic.symbol = mt.symbol
        WHERE ic.index_code = $1
          AND ic.as_of_date = (SELECT MAX(as_of_date) FROM index_constituents WHERE index_code = $1)
        ORDER BY ic.weight_percent DESC
    """, index_code)

@router.get("/shareholders", response_model=List[dict])
async def get_shareholders(symbol: str = None, limit: int = 100):
    if symbol:
        return await db.fetch_all("""
            SELECT * FROM major_shareholders 
            WHERE symbol = $1 
            ORDER BY ownership_percent DESC NULLS LAST
            LIMIT $2""", symbol, limit)
    return await db.fetch_all(f"""
        SELECT * FROM major_shareholders 
        ORDER BY ownership_percent DESC NULLS LAST 
        LIMIT {limit}""")

@router.get("/earnings", response_model=List[dict])
async def get_earnings(symbol: str = None, limit: int = 100):
    if symbol:
        return await db.fetch_all("""
            SELECT * FROM earnings_calendar 
            WHERE symbol = $1 
            ORDER BY announcement_date DESC NULLS LAST
            LIMIT $2""", symbol, limit)
    return await db.fetch_all(f"""
        SELECT * FROM earnings_calendar 
        ORDER BY announcement_date DESC NULLS LAST 
        LIMIT {limit}""")

@router.get("/fair-values", response_model=List[dict])
async def get_fair_values(symbol: str = None, limit: int = 100):
    if symbol:
        return await db.fetch_all("""
            SELECT * FROM fair_values 
            WHERE symbol = $1 
            ORDER BY updated_at DESC NULLS LAST
            LIMIT $2""", symbol, limit)
    return await db.fetch_all(f"""
        SELECT * FROM fair_values 
        ORDER BY updated_at DESC NULLS LAST 
        LIMIT {limit}""")

@router.get("/ratios", response_model=List[dict])
async def get_ratios(symbol: str = None, limit: int = 100):
    if symbol:
        return await db.fetch_all("""
            SELECT * FROM financial_ratios 
            WHERE symbol = $1 
            ORDER BY date DESC NULLS LAST
            LIMIT $2""", symbol, limit)
    return await db.fetch_all(f"""
        SELECT * FROM financial_ratios 
        ORDER BY date DESC NULLS LAST 
        LIMIT {limit}""")

@router.get("/dashboard/summary")
async def get_dashboard_summary():
    try:
        stats = {}
        stats['tickers'] = await db.fetch_one("SELECT COUNT(*) as count FROM market_tickers")
        stats['funds'] = await db.fetch_one("SELECT COUNT(*) as count FROM mutual_funds")
        stats['shareholders'] = await db.fetch_one("SELECT COUNT(*) as count FROM major_shareholders")
        stats['earnings'] = await db.fetch_one("SELECT COUNT(*) as count FROM earnings_calendar")
        stats['financials'] = await db.fetch_one("SELECT COUNT(*) as count FROM financial_statements")
        stats['ohlc'] = await db.fetch_one("SELECT COUNT(*) as count FROM ohlc_history")
        stats['nav'] = await db.fetch_one("SELECT COUNT(*) as count FROM nav_history")
        stats['ratios'] = await db.fetch_one("SELECT COUNT(*) as count FROM financial_ratios")
        
        return {
            "stocks": stats['tickers']['count'] if stats['tickers'] else 0,
            "funds": stats['funds']['count'] if stats['funds'] else 0,
            "shareholders": stats['shareholders']['count'] if stats['shareholders'] else 0,
            "earnings": stats['earnings']['count'] if stats['earnings'] else 0,
            "financials": stats['financials']['count'] if stats['financials'] else 0,
            "ohlc_rows": stats['ohlc']['count'] if stats['ohlc'] else 0,
            "nav_rows": stats['nav']['count'] if stats['nav'] else 0,
            "ratios": stats['ratios']['count'] if stats['ratios'] else 0,
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/dashboard/data-health")
async def get_data_health():
    """
    Comprehensive data health monitoring endpoint.
    Returns data counts, coverage metrics, and health status.
    """
    try:
        # Get counts for all major tables
        counts = {}
        tables = [
            ('ohlc_history', 5),
            ('nav_history', 2),
            ('market_tickers', 8),
            ('mutual_funds', 10),
            ('financial_statements', 10),
            ('corporate_actions', 4),
            ('earnings_calendar', 5),
            ('major_shareholders', 3),
            ('economic_indicators', 3),
            ('insider_transactions', 5),
            ('financial_ratios', 6),
            ('analyst_ratings', 4),
        ]
        
        total_rows = 0
        total_points = 0
        
        for table, mult in tables:
            try:
                result = await db.fetch_one(f"SELECT COUNT(*) as count FROM {table}")
                count = result['count'] if result else 0
            except:
                count = 0
            counts[table] = {"rows": count, "points": count * mult}
            total_rows += count
            total_points += count * mult
        
        # Get coverage stats
        ohlc_symbols = await db.fetch_one(
            "SELECT COUNT(DISTINCT symbol) as count FROM ohlc_history"
        )
        nav_funds = await db.fetch_one(
            "SELECT COUNT(DISTINCT fund_id) as count FROM nav_history"
        )
        total_tickers = await db.fetch_one(
            "SELECT COUNT(*) as count FROM market_tickers"
        )
        total_funds = await db.fetch_one(
            "SELECT COUNT(*) as count FROM mutual_funds"
        )
        
        ohlc_coverage = (ohlc_symbols['count'] / total_tickers['count'] * 100) if total_tickers['count'] > 0 else 0
        nav_coverage = (nav_funds['count'] / total_funds['count'] * 100) if total_funds['count'] > 0 else 0
        
        # Get latest data timestamps
        latest_ohlc = await db.fetch_one("SELECT MAX(time) as latest FROM ohlc_history")
        latest_nav = await db.fetch_one("SELECT MAX(date) as latest FROM nav_history")
        
        # Determine health status
        health = "excellent" if ohlc_coverage >= 95 and total_points >= 3000000 else \
                 "good" if ohlc_coverage >= 80 and total_points >= 1000000 else \
                 "warning" if ohlc_coverage >= 50 else "critical"
        
        return {
            "status": health,
            "total_rows": total_rows,
            "total_data_points": total_points,
            "data_points_millions": round(total_points / 1000000, 2),
            "coverage": {
                "ohlc_symbols": ohlc_symbols['count'] if ohlc_symbols else 0,
                "ohlc_total_symbols": total_tickers['count'] if total_tickers else 0,
                "ohlc_coverage_percent": round(ohlc_coverage, 1),
                "nav_funds": nav_funds['count'] if nav_funds else 0,
                "nav_total_funds": total_funds['count'] if total_funds else 0,
                "nav_coverage_percent": round(nav_coverage, 1),
            },
            "latest_data": {
                "ohlc": str(latest_ohlc['latest']) if latest_ohlc and latest_ohlc['latest'] else None,
                "nav": str(latest_nav['latest']) if latest_nav and latest_nav['latest'] else None,
            },
            "tables": counts,
            "timestamp": "now()"
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

