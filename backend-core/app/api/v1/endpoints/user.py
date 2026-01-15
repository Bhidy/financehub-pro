from fastapi import APIRouter, Depends, HTTPException
from app.api.v1.endpoints.auth import get_current_active_user
from app.db.session import db
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

# --- Pydantic Models ---

class WatchlistBase(BaseModel):
    name: str

class WatchlistCreate(WatchlistBase):
    pass

class WatchlistItemCreate(BaseModel):
    symbol: str

class PriceAlertCreate(BaseModel):
    symbol: str
    target_price: float
    condition: str  # ABOVE or BELOW

# --- Endpoints ---

@router.get("/watchlists", response_model=List[dict])
async def get_watchlists(current_user: dict = Depends(get_current_active_user)):
    """Get all watchlists for current user"""
    query = """
        SELECT w.id, w.name, w.created_at, 
               COALESCE(json_agg(json_build_object(
                   'symbol', wi.symbol, 
                   'added_at', wi.added_at
               )) FILTER (WHERE wi.symbol IS NOT NULL), '[]') as items
        FROM watchlists w
        LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
        WHERE w.user_id = $1
        GROUP BY w.id
        ORDER BY w.created_at DESC
    """
    return await db.fetch_all(query, current_user['id'])

@router.post("/watchlists", response_model=dict)
async def create_watchlist(wl: WatchlistCreate, current_user: dict = Depends(get_current_active_user)):
    """Create a new watchlist"""
    query = """
        INSERT INTO watchlists (user_id, name)
        VALUES ($1, $2)
        RETURNING id, name, created_at
    """
    return await db.fetch_one(query, current_user['id'], wl.name)

@router.delete("/watchlists/{watchlist_id}")
async def delete_watchlist(watchlist_id: str, current_user: dict = Depends(get_current_active_user)):
    """Delete a watchlist"""
    # Verify ownership
    check = await db.fetch_one("SELECT id FROM watchlists WHERE id = $1 AND user_id = $2", watchlist_id, current_user['id'])
    if not check:
        raise HTTPException(status_code=404, detail="Watchlist not found")
        
    await db.execute("DELETE FROM watchlists WHERE id = $1", watchlist_id)
    return {"status": "deleted"}

@router.post("/watchlists/{watchlist_id}/items", response_model=dict)
async def add_watchlist_item(watchlist_id: str, item: WatchlistItemCreate, current_user: dict = Depends(get_current_active_user)):
    """Add a symbol to a watchlist"""
    # Verify ownership
    check = await db.fetch_one("SELECT id FROM watchlists WHERE id = $1 AND user_id = $2", watchlist_id, current_user['id'])
    if not check:
        raise HTTPException(status_code=404, detail="Watchlist not found")
        
    # Check if symbol exists
    symbol_check = await db.fetch_one("SELECT symbol FROM market_tickers WHERE symbol = $1", item.symbol)
    if not symbol_check:
        raise HTTPException(status_code=400, detail=f"Symbol {item.symbol} not found in market")
        
    query = """
        INSERT INTO watchlist_items (watchlist_id, symbol)
        VALUES ($1, $2)
        ON CONFLICT (watchlist_id, symbol) DO NOTHING
        RETURNING id, symbol
    """
    res = await db.fetch_one(query, watchlist_id, item.symbol)
    if not res:
        return {"status": "already_exists", "symbol": item.symbol}
    return dict(res)

@router.delete("/watchlists/{watchlist_id}/items/{symbol}")
async def remove_watchlist_item(watchlist_id: str, symbol: str, current_user: dict = Depends(get_current_active_user)):
    """Remove a symbol from a watchlist"""
    # Verify ownership
    check = await db.fetch_one("SELECT id FROM watchlists WHERE id = $1 AND user_id = $2", watchlist_id, current_user['id'])
    if not check:
        raise HTTPException(status_code=404, detail="Watchlist not found")
        
    await db.execute("DELETE FROM watchlist_items WHERE watchlist_id = $1 AND symbol = $2", watchlist_id, symbol)
    return {"status": "removed"}

# --- Price Alerts ---

@router.get("/alerts", response_model=List[dict])
async def get_alerts(current_user: dict = Depends(get_current_active_user)):
    """Get active alerts"""
    query = """
        SELECT * FROM price_alerts 
        WHERE user_id = $1 
        ORDER BY created_at DESC
    """
    return await db.fetch_all(query, current_user['id'])

@router.post("/alerts", response_model=dict)
async def create_alert(alert: PriceAlertCreate, current_user: dict = Depends(get_current_active_user)):
    """Create a new price alert"""
    if alert.condition not in ['ABOVE', 'BELOW']:
        raise HTTPException(status_code=400, detail="Condition must be ABOVE or BELOW")
        
    query = """
        INSERT INTO price_alerts (user_id, symbol, target_price, condition)
        VALUES ($1, $2, $3, $4)
        RETURNING id, symbol, target_price, condition, is_active
    """
    return await db.fetch_one(query, current_user['id'], alert.symbol, alert.target_price, alert.condition)

@router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str, current_user: dict = Depends(get_current_active_user)):
    """Delete an alert"""
    res = await db.execute("DELETE FROM price_alerts WHERE id = $1 AND user_id = $2", alert_id, current_user['id'])
    if res == "DELETE 0":
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"status": "deleted"}
