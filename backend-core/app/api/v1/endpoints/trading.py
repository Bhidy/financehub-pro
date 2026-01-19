from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from app.db.session import db
from app.api.v1.endpoints.auth import get_current_active_user
from app.services.backtest import BacktestEngine

router = APIRouter()

class BacktestRequest(BaseModel):
    symbol: str
    initial_capital: float
    rules: List[dict]

class TradeRequest(BaseModel):
    symbol: str
    quantity: int
    side: str # 'BUY' or 'SELL'

# Demo portfolio for unauthenticated users (paper trading)
DEMO_PORTFOLIO = {
    "user_id": "demo",
    "cash_balance": 1000000.00,
    "market_value": 0,
    "total_equity": 1000000.00,
    "holdings": []
}

# @router.get("/portfolio/demo")
# async def get_demo_portfolio():
#     """Get demo portfolio for paper trading without authentication"""
#     return DEMO_PORTFOLIO

# @router.get("/portfolio")
# async def get_portfolio(current_user: dict = Depends(get_current_active_user)):
#     try:
#         # Fetch Portfolio
#         user_id = current_user['email'] # Using email as user_id for demo
#         portfolio = await db.fetch_one("SELECT * FROM portfolios WHERE user_id = $1", user_id)
#         if not portfolio:
#             # Create default if not exists
#             await db.execute("INSERT INTO portfolios (user_id, cash_balance) VALUES ($1, 1000000.00)", user_id)
#             portfolio = await db.fetch_one("SELECT * FROM portfolios WHERE user_id = $1", user_id)
#             
#         # Fetch Holdings with Live Prices
#         query = """
#             SELECT 
#                 h.symbol, h.quantity, h.average_price, 
#                 COALESCE(t.last_price, h.average_price) as current_price,
#                 COALESCE((t.last_price - h.average_price) / NULLIF(h.average_price, 0) * 100, 0) as pnl_percent,
#                 COALESCE((t.last_price - h.average_price) * h.quantity, 0) as pnl_value,
#                 COALESCE(t.last_price * h.quantity, h.average_price * h.quantity) as current_value
#             FROM portfolio_holdings h
#             LEFT JOIN market_tickers t ON h.symbol = t.symbol
#             WHERE h.portfolio_id = $1
#         """
#         holdings = await db.fetch_all(query, portfolio['id'])
#         
#         total_market_value = sum([float(h['current_value'] or 0) for h in holdings]) if holdings else 0
#         total_equity = float(portfolio['cash_balance'] or 0) + total_market_value
#         
#         return {
#             "cash_balance": portfolio['cash_balance'],
#             "market_value": total_market_value,
#             "total_equity": total_equity,
#             "holdings": holdings
#         }
#     except Exception as e:
#         return {"error": str(e), "cash_balance": 0, "market_value": 0, "total_equity": 0, "holdings": []}

@router.post("/trade")
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

@router.post("/reset_portfolio")
async def reset_portfolio(current_user: dict = Depends(get_current_active_user)):
    user_id = current_user['email']
    await db.execute("UPDATE portfolios SET cash_balance = 1000000.00 WHERE user_id = $1", user_id)
    await db.execute("DELETE FROM portfolio_holdings WHERE portfolio_id = (SELECT id FROM portfolios WHERE user_id = $1)", user_id)
    return {"status": "Reset Complete"}

@router.post("/backtest/run")
async def run_backtest(request: BacktestRequest, current_user: dict = Depends(get_current_active_user)):
    # Fetch History
    history = await db.fetch_all("SELECT * FROM ohlc_history WHERE symbol = $1 ORDER BY time ASC", request.symbol)
    if not history:
        return {"error": "No history found for symbol"}
        
    engine = BacktestEngine(history, request.initial_capital)
    results = engine.run(request.rules)
    return results
