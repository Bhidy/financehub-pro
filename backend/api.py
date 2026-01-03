from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import db
from typing import List
# from ai_engine import analyze_headlines # LEGACY - REMOVED
# from backtest_engine import BacktestEngine # LEGACY - REMOVED
import threading
from engine.scheduler import start_scheduler
from pydantic import BaseModel
from auth import router as auth_router, get_current_active_user
from fastapi import Depends

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.connect()
    
    # Phase 9: Start Automation Engine
    scheduler_thread = threading.Thread(target=start_scheduler, daemon=True)
    scheduler_thread.start()
    
    yield
    # Shutdown
    await db.close()

app = FastAPI(title="Mubasher Deep Extract API", lifespan=lifespan)
app.include_router(auth_router)

# Enable CORS for Frontend (Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Next.js Default Port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {"status": "ok", "db": "connected" if db._pool else "disconnected"}

@app.get("/tickers", response_model=List[dict])
async def get_tickers():
    query = """
        SELECT symbol, name_en, name_ar, sector_name, last_price, change, change_percent, volume 
        FROM market_tickers 
        ORDER BY last_price DESC NULLS LAST
    """
    return await db.fetch_all(query)

@app.get("/history/{symbol}", response_model=List[dict])
async def get_history(symbol: str, limit: int = 100):
    query = """
        SELECT time, open, high, low, close, volume 
        FROM ohlc_history 
        WHERE symbol = $1 
        ORDER BY time DESC 
        LIMIT $2
    """
    return await db.fetch_all(query, symbol, limit)

@app.get("/ohlc/{symbol}", response_model=List[dict])
async def get_ohlc(symbol: str, period: str = "1y"):
    """Get OHLC data from ohlc_data table (real Yahoo Finance data)"""
    # Determine date range based on period
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

@app.get("/stats")
async def get_stats():
    # Simple aggregation example
    try:
        count = await db.fetch_one("SELECT count(*) as total FROM market_tickers")
        return count
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/news", response_model=List[dict])
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
    
    # Adjust params index if needed, but for simple append:
    if symbol:
        return await db.fetch_all(query, symbol)
    else:
        return await db.fetch_all(query)

@app.get("/financials/{symbol}", response_model=List[dict])
async def get_financials(symbol: str):
    return await db.fetch_all("""
        SELECT *,
            -- Calculated Ratios
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

@app.get("/sectors", response_model=List[dict])
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

@app.get("/screener", response_model=List[dict])
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

@app.get("/ai/briefing")
async def get_ai_briefing():
    # Fetch last 50 news items
    news = await db.fetch_all("SELECT headline FROM market_news ORDER BY published_at DESC LIMIT 50")
    if not news:
        return {
            "themes": [],
            "sentiment": "NEUTRAL",
            "score": 0,
            "summary": "Not enough data to generate briefing."
        }
        
    headlines = [row['headline'] for row in news]
    # analysis = analyze_headlines(headlines) # LEGACY
    analysis = {
        "themes": ["Market Volatility", "Oil Prices", "Banking Sector"],
        "sentiment": "NEUTRAL",
        "score": 50,
        "summary": "Market is consolidating with focus on oil price movements."
    }
    return analysis

class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []

@app.post("/ai/chat")
async def ai_chat_endpoint(req: ChatRequest):
    try:
        from app.services.ai_service import chat_with_analyst
        result = await chat_with_analyst(req.message, req.history)
        return result
    except Exception as e:
        return {"reply": "I'm having trouble accessing the market feed right now. Please try again.", "data": None, "error": str(e)}

class BacktestRequest(BaseModel):
    symbol: str
    initial_capital: float
    rules: List[dict]

@app.post("/backtest/run")
async def run_backtest(request: BacktestRequest, current_user: dict = Depends(get_current_active_user)):

    # Fetch History
    history = await db.fetch_all("SELECT * FROM ohlc_history WHERE symbol = $1 ORDER BY time ASC", request.symbol)
    if not history:
        return {"error": "No history found for symbol"}
        
    engine = BacktestEngine(history, request.initial_capital)
    results = engine.run(request.rules)
    return results


class TradeRequest(BaseModel):
    symbol: str
    quantity: int
    side: str # 'BUY' or 'SELL'

@app.get("/portfolio")
async def get_portfolio(current_user: dict = Depends(get_current_active_user)):
    try:
        # Fetch Portfolio
        user_id = current_user['email'] # Using email as user_id for demo, ideally ID
        portfolio = await db.fetch_one("SELECT * FROM portfolios WHERE user_id = $1", user_id)
        if not portfolio:
            # Create default if not exists
            await db.execute("INSERT INTO portfolios (user_id, cash_balance) VALUES ($1, 1000000.00)", user_id)
            portfolio = await db.fetch_one("SELECT * FROM portfolios WHERE user_id = $1", user_id)
            
        # Fetch Holdings with Live Prices
        query = """
            SELECT 
                h.symbol, h.quantity, h.average_price, 
                COALESCE(t.last_price, h.average_price) as current_price,
                COALESCE((t.last_price - h.average_price) / NULLIF(h.average_price, 0) * 100, 0) as pnl_percent,
                COALESCE((t.last_price - h.average_price) * h.quantity, 0) as pnl_value,
                COALESCE(t.last_price * h.quantity, h.average_price * h.quantity) as current_value
            FROM portfolio_holdings h
            LEFT JOIN market_tickers t ON h.symbol = t.symbol
            WHERE h.portfolio_id = $1
        """
        holdings = await db.fetch_all(query, portfolio['id'])
        
        total_market_value = sum([float(h['current_value'] or 0) for h in holdings]) if holdings else 0
        total_equity = float(portfolio['cash_balance'] or 0) + total_market_value
        
        return {
            "cash_balance": portfolio['cash_balance'],
            "market_value": total_market_value,
            "total_equity": total_equity,
            "holdings": holdings
        }
    except Exception as e:
        return {"error": str(e), "cash_balance": 0, "market_value": 0, "total_equity": 0, "holdings": []}

@app.post("/trade")
async def execute_trade(trade: TradeRequest, current_user: dict = Depends(get_current_active_user)):
    async with db._pool.acquire() as conn:
        async with conn.transaction():
            # 1. Get Portfolio
            user_id = current_user['email']
            portfolio = await conn.fetchrow("SELECT * FROM portfolios WHERE user_id = $1", user_id)
            portfolio_id = portfolio['id']
            
            # 2. Get Live Price
            ticker = await conn.fetchrow("SELECT last_price FROM market_tickers WHERE symbol = $1", trade.symbol)
            if not ticker:
                return {"error": "Symbol not found"}
            
            price = float(ticker['last_price'])
            total_cost = price * trade.quantity
            
            if trade.side == 'BUY':
                if float(portfolio['cash_balance']) < total_cost:
                    return {"error": "Insufficient Funds"}
                
                # Update Cash
                await conn.execute("UPDATE portfolios SET cash_balance = cash_balance - $1 WHERE id = $2", total_cost, portfolio_id)
                
                # Update Holdings (Upsert)
                existing = await conn.fetchrow("SELECT * FROM portfolio_holdings WHERE portfolio_id = $1 AND symbol = $2", portfolio_id, trade.symbol)
                
                if existing:
                    new_qty = existing['quantity'] + trade.quantity
                    new_avg = ((float(existing['average_price']) * existing['quantity']) + total_cost) / new_qty
                    await conn.execute("UPDATE portfolio_holdings SET quantity = $1, average_price = $2 WHERE id = $3", new_qty, new_avg, existing['id'])
                else:
                    await conn.execute("INSERT INTO portfolio_holdings (portfolio_id, symbol, quantity, average_price) VALUES ($1, $2, $3, $4)", portfolio_id, trade.symbol, trade.quantity, price)
                    
            elif trade.side == 'SELL':
                 # Check existing
                existing = await conn.fetchrow("SELECT * FROM portfolio_holdings WHERE portfolio_id = $1 AND symbol = $2", portfolio_id, trade.symbol)
                if not existing or existing['quantity'] < trade.quantity:
                     return {"error": "Insufficient Holdings"}
                     
                # Update Cash
                await conn.execute("UPDATE portfolios SET cash_balance = cash_balance + $1 WHERE id = $2", total_cost, portfolio_id)
                
                # Update Holdings
                new_qty = existing['quantity'] - trade.quantity
                if new_qty == 0:
                     await conn.execute("DELETE FROM portfolio_holdings WHERE id = $1", existing['id'])
                else:
                     await conn.execute("UPDATE portfolio_holdings SET quantity = $1 WHERE id = $2", new_qty, existing['id'])

            # Log Trade
            await conn.execute("""
                INSERT INTO trade_history (portfolio_id, symbol, side, quantity, price, total_value)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, portfolio_id, trade.symbol, trade.side, trade.quantity, price, total_cost)
            
            return {"status": "Trade Executed", "price": price}

@app.post("/reset_portfolio")
async def reset_portfolio(current_user: dict = Depends(get_current_active_user)):
    user_id = current_user['email']
    await db.execute("UPDATE portfolios SET cash_balance = 1000000.00 WHERE user_id = $1", user_id)
    await db.execute("DELETE FROM portfolio_holdings WHERE portfolio_id = (SELECT id FROM portfolios WHERE user_id = $1)", user_id)
    return {"status": "Reset Complete"}

# ============================================================================
# PHASE 2: MUTUAL FUNDS & ETFS
# ============================================================================

@app.get("/funds", response_model=List[dict])
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

@app.get("/funds/{fund_id}", response_model=dict)
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

@app.get("/funds/{fund_id}/nav", response_model=List[dict])
async def get_fund_nav_history(fund_id: str, limit: int = 365):
    """Get NAV history for a specific fund"""
    return await db.fetch_all("""
        SELECT date, nav, NULL as aum, NULL as units_outstanding
        FROM nav_history
        WHERE fund_id = $1
        ORDER BY date DESC
        LIMIT $2
    """, fund_id, limit)

@app.get("/etfs", response_model=List[dict])
async def get_etfs():
    """Get all ETFs"""
    return await db.fetch_all("SELECT * FROM etfs ORDER BY etf_name")

@app.get("/corporate-actions", response_model=List[dict])
async def get_corporate_actions(symbol: str = None, limit: int = 100):
    """Get corporate actions"""
    if symbol:
        return await db.fetch_all("""
            SELECT * FROM corporate_actions 
            WHERE symbol = $1 
            ORDER BY ex_date DESC 
            LIMIT $2""", symbol, limit)
    return await db.fetch_all(f"SELECT * FROM corporate_actions ORDER BY ex_date DESC LIMIT {limit}")

@app.get("/insider-trading", response_model=List[dict])
async def get_insider_trading(symbol: str = None, limit: int = 100):
    """Get insider trading"""
    if symbol:
        return await db.fetch_all("""
            SELECT * FROM insider_trading 
            WHERE symbol = $1 
            ORDER BY transaction_date DESC 
            LIMIT $2""", symbol, limit)
    return await db.fetch_all(f"SELECT * FROM insider_trading ORDER BY transaction_date DESC LIMIT {limit}")

@app.get("/analyst-ratings", response_model=List[dict])
async def get_analyst_ratings(symbol: str = None, limit: int = 100):
    """Get analyst ratings"""
    if symbol:
        return await db.fetch_all("""
            SELECT * FROM analyst_ratings 
            WHERE symbol = $1 
            ORDER BY rating_date DESC 
            LIMIT $2""", symbol, limit)
    return await db.fetch_all(f"SELECT * FROM analyst_ratings ORDER BY rating_date DESC LIMIT {limit}")

@app.get("/intraday/{symbol}", response_model=List[dict])
async def get_intraday_bars(symbol: str, interval: str = "1m", limit: int = 300):
    """Get intraday bars"""
    return await db.fetch_all("""
        SELECT timestamp, open, high, low, close, volume
        FROM intraday_ohlc
        WHERE symbol = $1 AND interval = $2
        ORDER BY timestamp DESC
        LIMIT $3
    """, symbol, interval, limit)

@app.get("/order-book/{symbol}")
async def get_order_book(symbol: str):
    """Get Order Book Snapshot"""
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

@app.get("/market-breadth", response_model=List[dict])
async def get_market_breadth(limit: int = 30):
    """Get market breadth"""
    return await db.fetch_all("""
        SELECT * FROM market_breadth
        WHERE market_code = 'TDWL'
        ORDER BY date DESC
        LIMIT $1""", limit)

@app.get("/economic-indicators", response_model=List[dict])
async def get_economic_indicators(limit: int = 365):
    """Get economic indicators"""
    return await db.fetch_all(f"SELECT * FROM economic_indicators ORDER BY date DESC LIMIT {limit}")

@app.get("/indices/{index_code}/constituents", response_model=List[dict])
async def get_index_constituents(index_code: str):
    """Get index constituents"""
    return await db.fetch_all("""
        SELECT ic.*, mt.name_en, mt.last_price
        FROM index_constituents ic
        LEFT JOIN market_tickers mt ON ic.symbol = mt.symbol
        WHERE ic.index_code = $1
          AND ic.as_of_date = (SELECT MAX(as_of_date) FROM index_constituents WHERE index_code = $1)
        ORDER BY ic.weight_percent DESC
    """, index_code)

# ============================================================================
# NEW ENDPOINTS: Shareholders, Earnings, Fair Values
# ============================================================================

@app.get("/shareholders", response_model=List[dict])
async def get_shareholders(symbol: str = None, limit: int = 100):
    """Get major shareholders"""
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

@app.get("/earnings", response_model=List[dict])
async def get_earnings(symbol: str = None, limit: int = 100):
    """Get earnings calendar"""
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

@app.get("/fair-values", response_model=List[dict])
async def get_fair_values(symbol: str = None, limit: int = 100):
    """Get fair values and analyst targets"""
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

@app.get("/ratios", response_model=List[dict])
async def get_ratios(symbol: str = None, limit: int = 100):
    """Get financial ratios"""
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

@app.get("/dashboard/summary")
async def get_dashboard_summary():
    """Get comprehensive dashboard summary"""
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

# ============================================================================
# COMPANY PROFILE ENDPOINTS
# ============================================================================

@app.get("/api/company/{symbol}/profile")
async def get_company_profile(symbol: str):
    """Get company profile details"""
    profile = await db.fetch_one("""
        SELECT * FROM company_profiles WHERE symbol = $1
    """, symbol)
    if not profile:
        return {"description": None, "website": None, "industry": None, "sector": None}
    return dict(profile)

@app.get("/api/company/{symbol}/financials")
async def get_company_financials(symbol: str):
    """Get financial statements for a company"""
    return await db.fetch_all("""
        SELECT end_date, period_type, fiscal_year, revenue, net_income, 
               operating_income, total_assets, total_liabilities, total_equity,
               gross_profit, operating_cashflow, investing_cashflow, financing_cashflow
        FROM financial_statements 
        WHERE symbol = $1 
        ORDER BY end_date DESC
        LIMIT 20
    """, symbol)

@app.get("/api/company/{symbol}/shareholders")
async def get_company_shareholders(symbol: str):
    """Get major shareholders for a company"""
    return await db.fetch_all("""
        SELECT shareholder_name, shareholder_name_en, ownership_percent, shares_held, shareholder_type
        FROM major_shareholders 
        WHERE symbol = $1 
        ORDER BY ownership_percent DESC NULLS LAST
        LIMIT 20
    """, symbol)

@app.get("/api/company/{symbol}/analysts")
async def get_company_analysts(symbol: str):
    """Get analyst ratings for a company"""
    return await db.fetch_all("""
        SELECT period, strong_buy, buy, hold, sell, strong_sell
        FROM analyst_ratings 
        WHERE symbol = $1 
        ORDER BY period DESC
        LIMIT 10
    """, symbol)

@app.get("/api/company/{symbol}/dividends")
async def get_company_dividends(symbol: str):
    """Get dividend history for a company"""
    return await db.fetch_all("""
        SELECT ex_date, payment_date, amount, dividend_yield
        FROM dividend_history 
        WHERE symbol = $1 
        ORDER BY ex_date DESC
        LIMIT 20
    """, symbol)

@app.get("/api/company/{symbol}/ownership")
async def get_company_ownership(symbol: str):
    """Get ownership breakdown for a company"""
    ownership = await db.fetch_one("""
        SELECT insiders_percent, institutions_percent, institutions_float_percent, institutions_count
        FROM ownership_breakdown 
        WHERE symbol = $1
    """, symbol)
    if not ownership:
        return {"insiders_percent": None, "institutions_percent": None, "public_percent": None}
    return dict(ownership)

@app.get("/api/company/{symbol}/news")
async def get_company_news(symbol: str):
    """Get news for a company"""
    return await db.fetch_all("""
        SELECT headline, source, url, published_at, sentiment_score
        FROM market_news 
        WHERE symbol = $1 
        ORDER BY published_at DESC
        LIMIT 10
    """, symbol)

@app.get("/api/company/{symbol}/insider-transactions")
async def get_company_insider_transactions(symbol: str):
    """Get insider transactions for a company"""
    return await db.fetch_all("""
        SELECT insider_name, insider_role, transaction_date, transaction_type, shares, price, value
        FROM insider_transactions 
        WHERE symbol = $1 
        ORDER BY transaction_date DESC
        LIMIT 20
    """, symbol)

# ============================================================================
# EGYPTIAN STOCK EXCHANGE (EGX) API ENDPOINTS
# ============================================================================

@app.get("/api/egx/stocks", response_model=List[dict])
async def get_egx_stocks(
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "market_cap",
    order: str = "desc"
):
    """Get all Egyptian Stock Exchange stocks with sorting and pagination"""
    valid_sort_cols = ["market_cap", "last_price", "change_percent", "volume", "pe_ratio", "symbol"]
    sort_col = sort_by if sort_by in valid_sort_cols else "market_cap"
    order_dir = "DESC" if order.lower() == "desc" else "ASC"
    
    query = f"""
        SELECT 
            symbol, name_en, sector_name, market_code, currency,
            market_cap, last_price, change_percent, volume,
            pe_ratio, dividend_yield, revenue, net_income,
            last_updated
        FROM market_tickers 
        WHERE market_code = 'EGX'
        ORDER BY {sort_col} {order_dir} NULLS LAST
        LIMIT $1 OFFSET $2
    """
    return await db.fetch_all(query, limit, offset)

@app.get("/api/egx/stocks/count")
async def get_egx_stocks_count():
    """Get total count of EGX stocks"""
    count = await db.fetch_one("SELECT COUNT(*) as total FROM market_tickers WHERE market_code = 'EGX'")
    return count

@app.get("/api/egx/stock/{symbol}")
async def get_egx_stock(symbol: str):
    """Get detailed information for a single EGX stock"""
    stock = await db.fetch_one("""
        SELECT * FROM market_tickers WHERE symbol = $1 AND market_code = 'EGX'
    """, symbol.upper())
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found in EGX")
    return dict(stock)

@app.get("/api/egx/ohlc/{symbol}", response_model=List[dict])
async def get_egx_ohlc(symbol: str, period: str = "6m", limit: int = 200):
    """Get OHLC historical data for an EGX stock"""
    limit_map = {"1m": 30, "3m": 90, "6m": 180, "1y": 365, "3y": 1095, "5y": 1825, "max": 10000}
    actual_limit = min(limit_map.get(period, 180), limit)
    
    query = """
        SELECT date, open, high, low, close, adj_close, volume, change_percent
        FROM ohlc_data 
        WHERE symbol = $1 
        ORDER BY date DESC 
        LIMIT $2
    """
    return await db.fetch_all(query, symbol.upper(), actual_limit)

@app.get("/api/egx/sectors", response_model=List[dict])
async def get_egx_sectors():
    """Get sector breakdown for EGX stocks"""
    query = """
        SELECT 
            COALESCE(sector_name, 'Other') as sector_name,
            COUNT(*) as stock_count,
            AVG(change_percent) as avg_change,
            SUM(volume) as total_volume,
            SUM(market_cap) as total_market_cap
        FROM market_tickers 
        WHERE market_code = 'EGX'
        GROUP BY sector_name
        ORDER BY total_market_cap DESC NULLS LAST
    """
    return await db.fetch_all(query)

@app.get("/api/egx/movers/gainers", response_model=List[dict])
async def get_egx_top_gainers(limit: int = 10):
    """Get top gaining EGX stocks"""
    query = """
        SELECT symbol, name_en, last_price, change_percent, volume, market_cap
        FROM market_tickers 
        WHERE market_code = 'EGX' AND change_percent IS NOT NULL
        ORDER BY change_percent DESC
        LIMIT $1
    """
    return await db.fetch_all(query, limit)

@app.get("/api/egx/movers/losers", response_model=List[dict])
async def get_egx_top_losers(limit: int = 10):
    """Get top losing EGX stocks"""
    query = """
        SELECT symbol, name_en, last_price, change_percent, volume, market_cap
        FROM market_tickers 
        WHERE market_code = 'EGX' AND change_percent IS NOT NULL
        ORDER BY change_percent ASC
        LIMIT $1
    """
    return await db.fetch_all(query, limit)

@app.get("/api/egx/movers/volume", response_model=List[dict])
async def get_egx_most_active(limit: int = 10):
    """Get most actively traded EGX stocks by volume"""
    query = """
        SELECT symbol, name_en, last_price, change_percent, volume, market_cap
        FROM market_tickers 
        WHERE market_code = 'EGX' AND volume IS NOT NULL
        ORDER BY volume DESC
        LIMIT $1
    """
    return await db.fetch_all(query, limit)

@app.get("/api/egx/stats")
async def get_egx_stats():
    """Get comprehensive EGX market statistics"""
    stats = {}
    
    # Total counts
    stats['total_stocks'] = await db.fetch_one("SELECT COUNT(*) as count FROM market_tickers WHERE market_code = 'EGX'")
    stats['total_ohlc'] = await db.fetch_one("SELECT COUNT(*) as count FROM ohlc_data WHERE symbol IN (SELECT symbol FROM market_tickers WHERE market_code = 'EGX')")
    stats['stocks_with_history'] = await db.fetch_one("SELECT COUNT(DISTINCT symbol) as count FROM ohlc_data WHERE symbol IN (SELECT symbol FROM market_tickers WHERE market_code = 'EGX')")
    
    # Market overview
    stats['market_overview'] = await db.fetch_one("""
        SELECT 
            SUM(market_cap) as total_market_cap,
            AVG(change_percent) as avg_change,
            SUM(volume) as total_volume,
            COUNT(CASE WHEN change_percent > 0 THEN 1 END) as advancing,
            COUNT(CASE WHEN change_percent < 0 THEN 1 END) as declining,
            COUNT(CASE WHEN change_percent = 0 OR change_percent IS NULL THEN 1 END) as unchanged
        FROM market_tickers WHERE market_code = 'EGX'
    """)
    
    return {
        "total_stocks": stats['total_stocks']['count'] if stats['total_stocks'] else 0,
        "total_ohlc_records": stats['total_ohlc']['count'] if stats['total_ohlc'] else 0,
        "stocks_with_history": stats['stocks_with_history']['count'] if stats['stocks_with_history'] else 0,
        "market_overview": dict(stats['market_overview']) if stats['market_overview'] else {}
    }

@app.get("/api/egx/search")
async def search_egx_stocks(q: str, limit: int = 20):
    """Search EGX stocks by symbol or name"""
    query = """
        SELECT symbol, name_en, sector_name, last_price, change_percent, market_cap
        FROM market_tickers 
        WHERE market_code = 'EGX' 
          AND (UPPER(symbol) LIKE $1 OR UPPER(name_en) LIKE $1)
        ORDER BY market_cap DESC NULLS LAST
        LIMIT $2
    """
    search_term = f"%{q.upper()}%"
    return await db.fetch_all(query, search_term, limit)

@app.get("/api/egx/profile/{symbol}")
async def get_egx_profile(symbol: str):
    """Get company profile for an EGX stock"""
    profile = await db.fetch_one("""
        SELECT * FROM company_profiles WHERE symbol = $1
    """, symbol.upper())
    
    if not profile:
        # Return basic info from market_tickers if no profile exists
        ticker = await db.fetch_one("""
            SELECT symbol, name_en, sector_name as sector, sector_name as industry
            FROM market_tickers WHERE symbol = $1 AND market_code = 'EGX'
        """, symbol.upper())
        if ticker:
            return dict(ticker)
        raise HTTPException(status_code=404, detail=f"Profile not found for {symbol}")
    
    return dict(profile)

@app.get("/api/egx/dividends/{symbol}", response_model=List[dict])
async def get_egx_dividends(symbol: str):
    """Get dividend history for an EGX stock"""
    dividends = await db.fetch_all("""
        SELECT ex_date, payment_date, record_date, amount, currency
        FROM dividend_history 
        WHERE symbol = $1 
        ORDER BY ex_date DESC
    """, symbol.upper())
    return dividends

@app.get("/api/egx/financials/{symbol}")
async def get_egx_financials(symbol: str, statement_type: str = "income-statement", period: str = "annual"):
    """Get financial statements for an EGX stock"""
    financials = await db.fetch_all("""
        SELECT * FROM financial_statements 
        WHERE symbol = $1 AND statement_type = $2 AND period_type = $3
        ORDER BY fiscal_year DESC, fiscal_quarter DESC NULLS LAST
    """, symbol.upper(), statement_type, period)
    return financials

@app.get("/api/egx/statistics/{symbol}")
async def get_egx_statistics(symbol: str):
    """Get all statistics/ratios for an EGX stock"""
    stats = await db.fetch_one("""
        SELECT * FROM stock_statistics 
        WHERE symbol = $1 
        ORDER BY date DESC 
        LIMIT 1
    """, symbol.upper())
    
    if not stats:
        # Return basic stats from market_tickers
        ticker = await db.fetch_one("""
            SELECT pe_ratio, dividend_yield, revenue, net_income, market_cap
            FROM market_tickers WHERE symbol = $1 AND market_code = 'EGX'
        """, symbol.upper())
        if ticker:
            return dict(ticker)
        raise HTTPException(status_code=404, detail=f"Statistics not found for {symbol}")
    
    return dict(stats)

