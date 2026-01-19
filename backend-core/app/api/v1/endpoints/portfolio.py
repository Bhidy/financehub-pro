"""
Enterprise Portfolio Management Endpoints
==========================================
Provides comprehensive portfolio management including:
- Real user portfolios with authentication
- CSV/Excel import functionality
- Advanced analytics and insights
- CRUD operations for holdings
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
import csv
import io
from app.db.session import db
from app.api.v1.endpoints.auth import get_current_active_user

router = APIRouter()

# =============================================================================
# SCHEMAS
# =============================================================================

class HoldingCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    quantity: int = Field(..., gt=0)
    purchase_price: float = Field(..., gt=0)
    purchase_date: Optional[date] = None

class HoldingUpdate(BaseModel):
    quantity: Optional[int] = Field(None, gt=0)
    purchase_price: Optional[float] = Field(None, gt=0)
    purchase_date: Optional[date] = None

class HoldingImport(BaseModel):
    symbol: str
    quantity: int
    purchase_price: float
    purchase_date: Optional[str] = None

class ImportRequest(BaseModel):
    holdings: List[HoldingImport]
    replace_existing: bool = False  # If true, clears existing holdings first

class PortfolioInsights(BaseModel):
    total_value: float
    total_cost: float
    total_pnl: float
    total_pnl_percent: float
    daily_pnl: float
    daily_pnl_percent: float
    num_holdings: int
    top_gainer: Optional[dict] = None
    top_loser: Optional[dict] = None
    concentration_risk: float  # % in top 3 holdings
    sector_allocation: List[dict] = []

class PortfolioSnapshot(BaseModel):
    snapshot_date: date
    total_value: float
    cash_balance: float
    total_pnl: float

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

async def get_or_create_portfolio(user_id: str):
    """Get existing portfolio or create new one for user"""
    portfolio = await db.fetch_one("SELECT * FROM portfolios WHERE user_id = $1", user_id)
    if not portfolio:
        await db.execute(
            "INSERT INTO portfolios (user_id, cash_balance) VALUES ($1, 1000000.00)", 
            user_id
        )
        portfolio = await db.fetch_one("SELECT * FROM portfolios WHERE user_id = $1", user_id)
    return portfolio

async def create_portfolio_snapshot(portfolio_id: int, total_value: float, cash_balance: float, total_pnl: float):
    """Create a daily snapshot for analytics"""
    today = date.today()
    try:
        await db.execute(
            """INSERT INTO portfolio_snapshots 
               (portfolio_id, snapshot_date, total_value, cash_balance, total_pnl)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (portfolio_id, snapshot_date) 
               DO UPDATE SET total_value = $3, cash_balance = $4, total_pnl = $5""",
            portfolio_id, today, total_value, cash_balance, total_pnl
        )
    except Exception as e:
        print(f"Error creating snapshot: {e}")

async def get_holdings_with_prices(portfolio_id: int):
    """Fetch holdings with live prices and calculations"""
    query = """
        SELECT 
            h.id,
            h.symbol, 
            h.quantity, 
            h.average_price,
            h.purchase_date,
            t.name_en as company_name,
            t.sector,
            COALESCE(t.last_price, h.average_price) as current_price,
            COALESCE(t.change_percent, 0) as daily_change_percent,
            COALESCE((t.last_price - h.average_price) / NULLIF(h.average_price, 0) * 100, 0) as pnl_percent,
            COALESCE((t.last_price - h.average_price) * h.quantity, 0) as pnl_value,
            h.average_price * h.quantity as cost_basis,
            COALESCE(t.last_price * h.quantity, h.average_price * h.quantity) as current_value
        FROM portfolio_holdings h
        LEFT JOIN market_tickers t ON h.symbol = t.symbol
        WHERE h.portfolio_id = $1
        ORDER BY current_value DESC
    """
    return await db.fetch_all(query, portfolio_id)

def parse_date(date_str: Optional[str]) -> Optional[date]:
    """Parse various date formats"""
    if not date_str:
        return None
    formats = ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d']
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    return None

# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/portfolio/full")
async def get_full_portfolio(current_user: dict = Depends(get_current_active_user)):
    """
    Get complete portfolio with holdings, analytics, and insights.
    This is the main endpoint for the portfolio dashboard.
    """
    try:
        user_id = current_user['email']
        portfolio = await get_or_create_portfolio(user_id)
        holdings = await get_holdings_with_prices(portfolio['id'])
        
        # Calculate aggregates
        total_cost = sum(float(h['cost_basis'] or 0) for h in holdings)
        total_value = sum(float(h['current_value'] or 0) for h in holdings)
        total_pnl = total_value - total_cost
        total_pnl_percent = (total_pnl / total_cost * 100) if total_cost > 0 else 0
        
        # Daily P&L (weighted by position size)
        daily_pnl = sum(
            float(h['current_value'] or 0) * (float(h['daily_change_percent'] or 0) / 100)
            for h in holdings
        )
        daily_pnl_percent = (daily_pnl / total_value * 100) if total_value > 0 else 0
        
        # Gainers/Losers
        sorted_by_pnl = sorted(holdings, key=lambda x: float(x['pnl_percent'] or 0), reverse=True)
        top_gainer = dict(sorted_by_pnl[0]) if sorted_by_pnl and float(sorted_by_pnl[0]['pnl_percent'] or 0) > 0 else None
        top_loser = dict(sorted_by_pnl[-1]) if sorted_by_pnl and float(sorted_by_pnl[-1]['pnl_percent'] or 0) < 0 else None
        
        # Concentration risk (top 3 holdings as % of total)
        top_3_value = sum(float(h['current_value'] or 0) for h in sorted_by_pnl[:3])
        concentration_risk = (top_3_value / total_value * 100) if total_value > 0 else 0
        
        # Sector allocation
        sector_map = {}
        for h in holdings:
            sector = h['sector'] or 'Unknown'
            sector_map[sector] = sector_map.get(sector, 0) + float(h['current_value'] or 0)
        
        sector_allocation = [
            {"sector": k, "value": v, "percent": (v / total_value * 100) if total_value > 0 else 0}
            for k, v in sorted(sector_map.items(), key=lambda x: x[1], reverse=True)
        ]
        
        cash_balance = float(portfolio['cash_balance'] or 0)
        total_equity = cash_balance + total_value
        
        return {
            "portfolio_id": portfolio['id'],
            "cash_balance": cash_balance,
            "market_value": total_value,
            "total_equity": total_equity,
            "insights": {
                "total_cost": total_cost,
                "total_value": total_value,
                "total_pnl": total_pnl,
                "total_pnl_percent": round(total_pnl_percent, 2),
                "daily_pnl": round(daily_pnl, 2),
                "daily_pnl_percent": round(daily_pnl_percent, 2),
                "num_holdings": len(holdings),
                "top_gainer": top_gainer,
                "top_loser": top_loser,
                "concentration_risk": round(concentration_risk, 2),
                "sector_allocation": sector_allocation
            }
        }
        
        # Async snapshot creation (fire and forget)
        # In a real queue system this would be a task, here we just await it quickly or let it run
        await create_portfolio_snapshot(portfolio['id'], total_value, cash_balance, total_pnl)
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portfolio/import")
async def import_portfolio(
    request: ImportRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Import holdings from CSV/Excel data.
    Expects array of holdings with symbol, quantity, purchase_price, purchase_date.
    """
    try:
        user_id = current_user['email']
        portfolio = await get_or_create_portfolio(user_id)
        portfolio_id = portfolio['id']
        
        # Optional: Clear existing holdings first
        if request.replace_existing:
            await db.execute(
                "DELETE FROM portfolio_holdings WHERE portfolio_id = $1",
                portfolio_id
            )
        
        imported = 0
        errors = []
        
        for holding in request.holdings:
            try:
                # Validate symbol exists
                ticker = await db.fetch_one(
                    "SELECT symbol FROM market_tickers WHERE symbol = $1",
                    holding.symbol.upper()
                )
                
                if not ticker:
                    errors.append(f"Symbol {holding.symbol} not found")
                    continue
                
                purchase_date = parse_date(holding.purchase_date) or date.today()
                
                # Check if holding already exists
                existing = await db.fetch_one(
                    "SELECT * FROM portfolio_holdings WHERE portfolio_id = $1 AND symbol = $2",
                    portfolio_id, holding.symbol.upper()
                )
                
                if existing:
                    # Update existing - calculate new average
                    old_qty = existing['quantity']
                    old_avg = float(existing['average_price'])
                    new_qty = old_qty + holding.quantity
                    new_avg = ((old_avg * old_qty) + (holding.purchase_price * holding.quantity)) / new_qty
                    
                    await db.execute(
                        """UPDATE portfolio_holdings 
                           SET quantity = $1, average_price = $2, purchase_date = $3
                           WHERE id = $4""",
                        new_qty, new_avg, purchase_date, existing['id']
                    )
                else:
                    # Insert new holding
                    await db.execute(
                        """INSERT INTO portfolio_holdings 
                           (portfolio_id, symbol, quantity, average_price, purchase_date)
                           VALUES ($1, $2, $3, $4, $5)""",
                        portfolio_id, holding.symbol.upper(), holding.quantity, 
                        holding.purchase_price, purchase_date
                    )
                
                imported += 1
                
            except Exception as e:
                errors.append(f"Error importing {holding.symbol}: {str(e)}")
        
        return {
            "status": "success",
            "imported": imported,
            "total": len(request.holdings),
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portfolio/holdings")
async def add_holding(
    holding: HoldingCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Add a single holding to portfolio"""
    try:
        user_id = current_user['email']
        portfolio = await get_or_create_portfolio(user_id)
        portfolio_id = portfolio['id']
        
        # Validate symbol
        ticker = await db.fetch_one(
            "SELECT symbol, name_en FROM market_tickers WHERE symbol = $1",
            holding.symbol.upper()
        )
        if not ticker:
            raise HTTPException(status_code=404, detail=f"Symbol {holding.symbol} not found")
        
        purchase_date = holding.purchase_date or date.today()
        
        # Check existing
        existing = await db.fetch_one(
            "SELECT * FROM portfolio_holdings WHERE portfolio_id = $1 AND symbol = $2",
            portfolio_id, holding.symbol.upper()
        )
        
        if existing:
            # Update with new average
            old_qty = existing['quantity']
            old_avg = float(existing['average_price'])
            new_qty = old_qty + holding.quantity
            new_avg = ((old_avg * old_qty) + (holding.purchase_price * holding.quantity)) / new_qty
            
            await db.execute(
                """UPDATE portfolio_holdings 
                   SET quantity = $1, average_price = $2, purchase_date = $3
                   WHERE id = $4""",
                new_qty, new_avg, purchase_date, existing['id']
            )
            return {"status": "updated", "holding_id": existing['id'], "new_quantity": new_qty}
        else:
            result = await db.execute(
                """INSERT INTO portfolio_holdings 
                   (portfolio_id, symbol, quantity, average_price, purchase_date)
                   VALUES ($1, $2, $3, $4, $5) RETURNING id""",
                portfolio_id, holding.symbol.upper(), holding.quantity, 
                holding.purchase_price, purchase_date
            )
            return {"status": "created", "symbol": holding.symbol.upper()}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/portfolio/holdings/{holding_id}")
async def update_holding(
    holding_id: int,
    holding: HoldingUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update an existing holding"""
    try:
        user_id = current_user['email']
        portfolio = await get_or_create_portfolio(user_id)
        
        # Verify ownership
        existing = await db.fetch_one(
            """SELECT h.* FROM portfolio_holdings h
               JOIN portfolios p ON h.portfolio_id = p.id
               WHERE h.id = $1 AND p.user_id = $2""",
            holding_id, user_id
        )
        
        if not existing:
            raise HTTPException(status_code=404, detail="Holding not found")
        
        # Build update query
        updates = []
        values = []
        idx = 1
        
        if holding.quantity is not None:
            updates.append(f"quantity = ${idx}")
            values.append(holding.quantity)
            idx += 1
            
        if holding.purchase_price is not None:
            updates.append(f"average_price = ${idx}")
            values.append(holding.purchase_price)
            idx += 1
            
        if holding.purchase_date is not None:
            updates.append(f"purchase_date = ${idx}")
            values.append(holding.purchase_date)
            idx += 1
        
        if updates:
            values.append(holding_id)
            query = f"UPDATE portfolio_holdings SET {', '.join(updates)} WHERE id = ${idx}"
            await db.execute(query, *values)
        
        return {"status": "updated", "holding_id": holding_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/portfolio/holdings/{holding_id}")
async def delete_holding(
    holding_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """Remove a holding from portfolio"""
    try:
        user_id = current_user['email']
        
        # Verify ownership
        existing = await db.fetch_one(
            """SELECT h.* FROM portfolio_holdings h
               JOIN portfolios p ON h.portfolio_id = p.id
               WHERE h.id = $1 AND p.user_id = $2""",
            holding_id, user_id
        )
        
        if not existing:
            raise HTTPException(status_code=404, detail="Holding not found")
        
        await db.execute("DELETE FROM portfolio_holdings WHERE id = $1", holding_id)
        
        return {"status": "deleted", "holding_id": holding_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portfolio/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    replace_existing: bool = False,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Direct CSV file upload endpoint.
    Expected columns: symbol, quantity, purchase_price, purchase_date (optional)
    """
    try:
        if not file.filename.endswith(('.csv', '.CSV')):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
        content = await file.read()
        decoded = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        
        holdings = []
        for row in reader:
            # Normalize column names (case-insensitive)
            row_lower = {k.lower().strip(): v.strip() for k, v in row.items()}
            
            symbol = row_lower.get('symbol') or row_lower.get('ticker') or row_lower.get('stock')
            quantity = row_lower.get('quantity') or row_lower.get('qty') or row_lower.get('shares')
            price = row_lower.get('purchase_price') or row_lower.get('price') or row_lower.get('avg_price') or row_lower.get('cost')
            date_str = row_lower.get('purchase_date') or row_lower.get('date') or row_lower.get('buy_date')
            
            if symbol and quantity and price:
                try:
                    holdings.append(HoldingImport(
                        symbol=symbol.upper(),
                        quantity=int(float(quantity)),
                        purchase_price=float(price),
                        purchase_date=date_str
                    ))
                except ValueError:
                    continue  # Skip invalid rows
        
        if not holdings:
            raise HTTPException(status_code=400, detail="No valid holdings found in CSV")
        
        # Reuse import logic
        request = ImportRequest(holdings=holdings, replace_existing=replace_existing)
        return await import_portfolio(request, current_user)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")


@router.get("/portfolio/history")
async def get_portfolio_history(current_user: dict = Depends(get_current_active_user)):
    """Get portfolio value history for charts"""
    try:
        user_id = current_user['email']
        portfolio = await get_or_create_portfolio(user_id)
        
        history = await db.fetch_all(
            """SELECT snapshot_date, total_value, total_pnl 
               FROM portfolio_snapshots 
               WHERE portfolio_id = $1 
               ORDER BY snapshot_date ASC""",
            portfolio['id']
        )
        return [dict(h) for h in history]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

