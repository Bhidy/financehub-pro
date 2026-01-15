"""
Egyptian Stock Exchange (EGX) API Endpoints
============================================
Provides access to all 223 EGX stocks with full data coverage.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.db.session import db

router = APIRouter()


@router.get("/egx/stocks", response_model=List[dict])
async def get_egx_stocks(
    sector: Optional[str] = None,
    sort_by: str = Query("symbol", enum=["symbol", "name_en", "change_percent", "volume", "market_cap"]),
    order: str = Query("asc", enum=["asc", "desc"]),
    limit: int = 500
):
    """Get all EGX stocks with optional filtering and sorting"""
    query = f"""
        SELECT symbol, name_en, name_ar, sector_name, last_price, change, change_percent, 
               volume, market_cap, pe_ratio, pb_ratio, high, low, open_price, prev_close
        FROM market_tickers 
        WHERE market_code = 'EGX'
        {"AND sector_name = $1" if sector else ""}
        ORDER BY {sort_by} {"DESC" if order == "desc" else "ASC"} NULLS LAST
        LIMIT {limit}
    """
    params = [sector] if sector else []
    return await db.fetch_all(query, *params) if params else await db.fetch_all(query)


@router.get("/egx/stocks/count")
async def get_egx_stocks_count():
    """Get total count of EGX stocks"""
    count = await db.fetch_one("SELECT COUNT(*) as total FROM market_tickers WHERE market_code = 'EGX'")
    return {"count": count["total"] if count else 0}


@router.get("/egx/stock/{symbol}")
async def get_egx_stock(symbol: str):
    """Get detailed information for a single EGX stock"""
    stock = await db.fetch_one(
        "SELECT * FROM market_tickers WHERE symbol = $1 AND market_code = 'EGX'", symbol.upper()
    )
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found in EGX")
    return dict(stock)


@router.get("/egx/ohlc/{symbol}", response_model=List[dict])
async def get_egx_ohlc(symbol: str, period: str = "1y", limit: int = 500):
    """Get OHLC historical data for an EGX stock from StockAnalysis.com"""
    import httpx
    from bs4 import BeautifulSoup
    from datetime import datetime
    import re
    
    url = f"https://stockanalysis.com/quote/egx/{symbol.lower()}/history/"
    
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            if resp.status_code != 200:
                print(f"StockAnalysis OHLC error: HTTP {resp.status_code} for {symbol}")
                return []
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Find the history table
            table = soup.find('table')
            if not table:
                print(f"No OHLC table found for {symbol}")
                return []
            
            rows = table.find_all('tr')[1:]  # Skip header
            history = []
            
            for row in rows[:limit]:
                cells = row.find_all('td')
                if len(cells) >= 6:
                    try:
                        date_str = cells[0].get_text(strip=True)
                        # Parse date (format: "Jan 02, 2025")
                        try:
                            date_obj = datetime.strptime(date_str, "%b %d, %Y")
                            date = date_obj.strftime("%Y-%m-%d")
                        except:
                            date = date_str
                        
                        def parse_num(s):
                            s = s.replace(',', '').replace('$', '').strip()
                            if s in ['-', 'N/A', '']:
                                return 0
                            try:
                                return float(s)
                            except:
                                return 0
                        
                        history.append({
                            "date": date,
                            "open": parse_num(cells[1].get_text(strip=True)),
                            "high": parse_num(cells[2].get_text(strip=True)),
                            "low": parse_num(cells[3].get_text(strip=True)),
                            "close": parse_num(cells[4].get_text(strip=True)),
                            "volume": int(parse_num(cells[5].get_text(strip=True)))
                        })
                    except Exception as e:
                        continue
            
            return history
    except Exception as e:
        print(f"StockAnalysis OHLC error for {symbol}: {e}")
        return []


@router.get("/egx/sectors", response_model=List[dict])
async def get_egx_sectors():
    """Get sector breakdown for EGX stocks"""
    rows = await db.fetch_all("""
        SELECT sector_name, 
               COUNT(*) as stock_count,
               AVG(change_percent) as avg_change,
               SUM(volume) as total_volume
        FROM market_tickers 
        WHERE market_code = 'EGX' AND sector_name IS NOT NULL
        GROUP BY sector_name
        ORDER BY stock_count DESC
    """)
    return [dict(r) for r in rows]


@router.get("/egx/movers/gainers", response_model=List[dict])
async def get_egx_top_gainers(limit: int = 10):
    """Get top gaining EGX stocks"""
    rows = await db.fetch_all("""
        SELECT symbol, name_en, last_price, change, change_percent, volume
        FROM market_tickers 
        WHERE market_code = 'EGX' AND change_percent IS NOT NULL
        ORDER BY change_percent DESC LIMIT $1
    """, limit)
    return [dict(r) for r in rows]


@router.get("/egx/movers/losers", response_model=List[dict])
async def get_egx_top_losers(limit: int = 10):
    """Get top losing EGX stocks"""
    rows = await db.fetch_all("""
        SELECT symbol, name_en, last_price, change, change_percent, volume
        FROM market_tickers 
        WHERE market_code = 'EGX' AND change_percent IS NOT NULL
        ORDER BY change_percent ASC LIMIT $1
    """, limit)
    return [dict(r) for r in rows]


@router.get("/egx/movers/volume", response_model=List[dict])
async def get_egx_most_active(limit: int = 10):
    """Get most actively traded EGX stocks by volume"""
    rows = await db.fetch_all("""
        SELECT symbol, name_en, last_price, change, change_percent, volume
        FROM market_tickers 
        WHERE market_code = 'EGX' AND volume IS NOT NULL
        ORDER BY volume DESC LIMIT $1
    """, limit)
    return [dict(r) for r in rows]


@router.get("/egx/stats")
async def get_egx_stats():
    """Get comprehensive EGX market statistics"""
    stats = {}
    
    # Core counts
    total = await db.fetch_one("SELECT COUNT(*) as count FROM market_tickers WHERE market_code = 'EGX'")
    stats['total_stocks'] = total['count'] if total else 0
    
    ohlc = await db.fetch_one("SELECT COUNT(*) as count FROM ohlc_data WHERE symbol IN (SELECT symbol FROM market_tickers WHERE market_code = 'EGX')")
    stats['total_ohlc'] = ohlc['count'] if ohlc else 0
    
    fin = await db.fetch_one("SELECT COUNT(*) as count FROM financial_statements WHERE symbol ~ '^[A-Z]+$'")
    stats['total_financials'] = fin['count'] if fin else 0
    
    # Market summary
    summary = await db.fetch_one("""
        SELECT 
            COUNT(CASE WHEN change_percent > 0 THEN 1 END) as gainers,
            COUNT(CASE WHEN change_percent < 0 THEN 1 END) as losers,
            COUNT(CASE WHEN change_percent = 0 THEN 1 END) as unchanged,
            SUM(volume) as total_volume
        FROM market_tickers WHERE market_code = 'EGX'
    """)
    if summary:
        stats['gainers'] = summary['gainers'] or 0
        stats['losers'] = summary['losers'] or 0
        stats['unchanged'] = summary['unchanged'] or 0
        stats['total_volume'] = summary['total_volume'] or 0
    
    return stats


@router.get("/egx/search")
async def search_egx_stocks(q: str, limit: int = 20):
    """Search EGX stocks by symbol or name"""
    rows = await db.fetch_all("""
        SELECT symbol, name_en, name_ar, sector_name, last_price, change_percent
        FROM market_tickers 
        WHERE market_code = 'EGX' 
          AND (symbol ILIKE $1 OR name_en ILIKE $1 OR name_ar ILIKE $1)
        LIMIT $2
    """, f"%{q}%", limit)
    return [dict(r) for r in rows]


@router.get("/egx/profile/{symbol}")
async def get_egx_profile(symbol: str):
    """Get company profile for an EGX stock"""
    profile = await db.fetch_one("SELECT * FROM company_profiles WHERE symbol = $1", symbol.upper())
    if profile:
        return dict(profile)
    # Fallback to market_tickers
    ticker = await db.fetch_one(
        "SELECT symbol, name_en, name_ar, sector_name, industry FROM market_tickers WHERE symbol = $1 AND market_code = 'EGX'",
        symbol.upper()
    )
    if ticker:
        return dict(ticker)
    raise HTTPException(status_code=404, detail=f"Profile not found for {symbol}")


@router.get("/egx/financials/{symbol}")
async def get_egx_financials(symbol: str, statement_type: str = "income-statement", period: str = "annual"):
    """Get financial statements for an EGX stock"""
    rows = await db.fetch_all("""
        SELECT fiscal_year, end_date, revenue, net_income, eps, total_assets, 
               total_liabilities, total_equity, raw_data
        FROM financial_statements 
        WHERE symbol = $1 AND period_type = $2
        ORDER BY fiscal_year DESC
        LIMIT 10
    """, symbol.upper(), period)
    return [dict(r) for r in rows]


@router.get("/egx/dividends/{symbol}", response_model=List[dict])
async def get_egx_dividends(symbol: str):
    """Get dividend history for an EGX stock"""
    rows = await db.fetch_all(
        "SELECT * FROM dividend_history WHERE symbol = $1 ORDER BY ex_date DESC",
        symbol.upper()
    )
    return [dict(r) for r in rows]


@router.get("/egx/statistics/{symbol}")
async def get_egx_statistics(symbol: str):
    """Get comprehensive statistics for an EGX stock from stock_statistics table"""
    stats = await db.fetch_one(
        """SELECT ss.*, mt.name_en, mt.name_ar, mt.last_price, mt.currency, mt.market_cap, mt.sector_name
           FROM stock_statistics ss
           LEFT JOIN market_tickers mt ON ss.symbol = mt.symbol AND mt.market_code = 'EGX'
           WHERE ss.symbol = $1""",
        symbol.upper()
    )
    if not stats:
        raise HTTPException(status_code=404, detail=f"Statistics not found for {symbol}")
    return dict(stats)

