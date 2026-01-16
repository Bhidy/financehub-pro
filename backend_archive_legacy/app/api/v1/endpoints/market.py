from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.db.session import db

router = APIRouter()

@router.get("/tickers", response_model=List[dict])
async def get_tickers():
    query = """
        SELECT symbol, name_en, name_ar, sector_name, last_price, change, change_percent, volume 
        FROM market_tickers 
        ORDER BY last_price DESC NULLS LAST
    """
    return await db.fetch_all(query)

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
    """Get OHLC data from ohlc_data table (real Yahoo Finance data)"""
    limit_map = {"1m": 30, "3m": 90, "6m": 180, "1y": 365, "3y": 1095, "5y": 1825, "max": 10000}
    limit = limit_map.get(period, 365)
    
    query = """
        SELECT date, open, high, low, close, volume 
        FROM ohlc_data 
        WHERE symbol = $1 
        ORDER BY date DESC 
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

@router.get("/screener", response_model=List[dict])
async def get_screener(
    min_price: float = 0,
    max_price: float = 10000,
    sector: str = None,
    sort_by: str = "volume",
    order: str = "desc"
):
    query = """
        SELECT DISTINCT ON (t.symbol)
            t.symbol, t.name_en, t.sector_name, t.last_price, t.change_percent, t.volume,
            ROUND((t.last_price * 100000000 / (COALESCE(f.net_income, 100000000))), 2) as pe_ratio,
            ROUND((COALESCE(f.revenue, 0) / 1000000000), 2) as market_cap_b
        FROM market_tickers t
        LEFT JOIN (
            SELECT symbol, net_income, revenue 
            FROM financial_statements 
            WHERE fiscal_year = 2024 AND period_type = 'FY'
        ) f ON t.symbol = f.symbol
        WHERE 
            t.last_price >= $1 AND t.last_price <= $2
    """
    params = [min_price, max_price]
    
    if sector and sector != "All":
        query += " AND t.sector_name = $3"
        params.append(sector)
        
    query += f" ORDER BY t.symbol, {sort_by} {order.upper()} LIMIT 50"
    
    return await db.fetch_all(query, *params)

@router.get("/funds", response_model=List[dict])
async def get_mutual_funds():
    """Get all mutual funds with latest NAV"""
    query = """
        SELECT f.*, 
               (SELECT nav FROM nav_history 
                WHERE fund_id = f.fund_id 
                ORDER BY date DESC LIMIT 1) as latest_nav
        FROM mutual_funds f
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
        raise HTTPException(status_code=404, detail="Fund not found")
    return fund

@router.get("/funds/{fund_id}/nav", response_model=List[dict])
async def get_fund_nav_history(fund_id: str, limit: int = 365):
    """Get NAV history for a specific fund"""
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
    return await db.fetch_all("""
        SELECT timestamp, open, high, low, close, volume
        FROM intraday_ohlc
        WHERE symbol = $1 AND interval = $2
        ORDER BY timestamp DESC
        LIMIT $3
    """, symbol, interval, limit)

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
        stats['ohlc'] = await db.fetch_one("SELECT COUNT(*) as count FROM ohlc_data")
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
