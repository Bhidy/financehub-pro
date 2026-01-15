from fastapi import APIRouter, HTTPException
from app.db.session import db
from typing import List, Dict, Any

router = APIRouter()

async def resolve_symbol(symbol: str) -> str:
    """
    Resolve symbol from frontend format (e.g. 'COMI') to DB format (e.g. 'COMI.CA').
    """
    s = symbol.upper().strip()

    
    # 1. Try Exact Match (e.g. if frontend sends COMI.CA)
    if await db.fetch_val("SELECT 1 FROM market_tickers WHERE symbol = $1", s):
        return s
        
    # 2. Try adding default suffix .CA (e.g. COMI -> COMI.CA)
    # Most common case for EGX
    if not s.endswith(".CA"):
        s_ca = f"{s}.CA"
        if await db.fetch_val("SELECT 1 FROM market_tickers WHERE symbol = $1", s_ca):
            return s_ca
            
    # 3. Clean and retry (e.g. users sends COMI.EG -> COMI -> COMI.CA)
    clean = s.replace(".CA", "").replace(".EG", "")
    clean_ca = f"{clean}.CA"
    if await db.fetch_val("SELECT 1 FROM market_tickers WHERE symbol = $1", clean_ca):
        return clean_ca
        
    # 4. Fallback to clean (unlikely but safe)
    return clean

@router.get("/{symbol}/profile")
async def get_company_profile(symbol: str):
    db_symbol = await resolve_symbol(symbol)
    
    # Try company_profiles table first
    profile = await db.fetch_one("SELECT * FROM company_profiles WHERE symbol = $1", db_symbol)
    
    # Always fetch ticker info for live price/sector
    ticker = await db.fetch_one("SELECT * FROM market_tickers WHERE symbol = $1", db_symbol)
    
    if not profile and not ticker:
        raise HTTPException(status_code=404, detail="Company not found")
        
    result = dict(ticker) if ticker else {"symbol": db_symbol}
    if profile:
        result.update(dict(profile))
        
    # Ensure critical fields exist for frontend
    result.setdefault('price', result.get('last_price'))
    result.setdefault('currency', 'EGP')
    result.setdefault('market', 'EGX')
    
    return result

@router.get("/{symbol}/financials")
async def get_company_financials(symbol: str):
    db_symbol = await resolve_symbol(symbol)
    return await db.fetch_all("""
        SELECT * FROM financial_statements 
        WHERE symbol = $1 
        ORDER BY fiscal_year DESC 
        LIMIT 20
    """, db_symbol)

@router.get("/{symbol}/shareholders")
async def get_company_shareholders(symbol: str):
    db_symbol = await resolve_symbol(symbol)
    return await db.fetch_all("""
        SELECT * FROM major_shareholders 
        WHERE symbol = $1 
        ORDER BY ownership_percent DESC
    """, db_symbol)

@router.get("/{symbol}/analysts", response_model=List[dict])
async def get_company_analysts(symbol: str):
    db_symbol = await resolve_symbol(symbol)
    return await db.fetch_all("""
        SELECT * FROM analyst_ratings 
        WHERE symbol = $1 
        ORDER BY rating_date DESC
    """, db_symbol)

@router.get("/{symbol}/dividends", response_model=List[dict])
async def get_company_dividends(symbol: str):
    db_symbol = await resolve_symbol(symbol)
    # Check if dividend_history table exists or use corporate_actions
    try:
        return await db.fetch_all("""
            SELECT * FROM dividend_history 
            WHERE symbol = $1 
            ORDER BY ex_date DESC
        """, db_symbol)
    except:
        # Fallback to corporate actions
        return await db.fetch_all("""
            SELECT * FROM corporate_actions 
            WHERE symbol = $1 AND action_type ILIKE '%Dividend%'
            ORDER BY ex_date DESC
        """, db_symbol)

@router.get("/{symbol}/ownership")
async def get_company_ownership(symbol: str):
    # This is often same as shareholders or insider trading in some schemas
    # Returning shareholders for now as per likely intent
    db_symbol = await resolve_symbol(symbol)
    return await db.fetch_all("""
        SELECT * FROM major_shareholders 
        WHERE symbol = $1 
        ORDER BY ownership_percent DESC
    """, db_symbol)

@router.get("/{symbol}/news")
async def get_company_news(symbol: str):
    db_symbol = await resolve_symbol(symbol)
    return await db.fetch_all("""
        SELECT * FROM market_news 
        WHERE symbol = $1 
        ORDER BY published_at DESC 
        LIMIT 20
    """, db_symbol)

@router.get("/{symbol}/insider-transactions")
async def get_company_insider_transactions(symbol: str):
    db_symbol = await resolve_symbol(symbol)
    return await db.fetch_all("""
        SELECT * FROM insider_transactions 
        WHERE symbol = $1 
        ORDER BY transaction_date DESC
    """, db_symbol)
