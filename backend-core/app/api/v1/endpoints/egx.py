"""
Egyptian Stock Exchange (EGX) API Endpoints
============================================
Provides access to all 223 EGX stocks with full data coverage.
"""

from fastapi import APIRouter, HTTPException, Query, Response
from typing import List, Optional
from app.db.session import db
import asyncio
import time
from datetime import datetime, timezone

router = APIRouter()


def _set_freshness(response: "Response", rows: list, source: str, date_key: str = "date") -> None:
    """Stamp data-freshness headers on a chart/price response so a stale payload
    is never served silently (mobile app / AI chat read these). Non-breaking:
    body is untouched. Exception-guarded — freshness telemetry must never break
    a data response."""
    try:
        if response is None or not rows:
            return
        dates = [str(r.get(date_key))[:10] for r in rows if r.get(date_key)]
        if not dates:
            return
        latest = max(dates)  # robust regardless of asc/desc ordering
        response.headers["X-Data-As-Of"] = latest
        response.headers["X-Data-Source"] = source
        try:
            age = (datetime.now(timezone.utc).date() - datetime.fromisoformat(latest).date()).days
            response.headers["X-Data-Age-Days"] = str(max(0, age))
        except Exception:
            pass
    except Exception:
        pass

# ──────────────────────────────────────────────────────────────
# In-memory TTL cache for Yahoo Finance history responses.
# Key: "SYMBOL_period"  Value: (timestamp, list[dict])
# Cache lifetime: 4 hours (14400 seconds) — history rarely changes
# ──────────────────────────────────────────────────────────────
_yf_history_cache: dict = {}
_YF_CACHE_TTL = 14400  # 4 hours


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
async def get_egx_ohlc(symbol: str, response: Response, period: str = "1y", limit: int = 500):
    """Get OHLC historical data for an EGX stock from the ohlc_data table
    (written by populate_yahoo_reservoir.py + tv_egx_harvester.py prices cycle)."""
    try:
        rows = await db.fetch_all(
            """SELECT date::text, open, high, low, close, volume
               FROM ohlc_data
               WHERE symbol = $1
               ORDER BY date DESC
               LIMIT $2""",
            symbol.upper(), limit
        )
        out = [dict(r) for r in rows]
        _set_freshness(response, out, "ohlc_data")
        return out
    except Exception as e:
        print(f"OHLC fetch failed for {symbol}: {e}")
        return []


@router.get("/egx/history/{symbol}", response_model=List[dict])
async def get_egx_yahoo_history(
    symbol: str,
    response: Response,
    period: str = Query(
        "1y",
        enum=["1m", "3m", "6m", "1y", "3y", "5y", "max"],
        description="History period: 1m=30 days, 3m=90 days … max=all available (~15+ years for EGX)"
    )
):
    """
    Yahoo Finance historical OHLCV for any EGX stock.

    Replaces the StockAnalysis scraper for the Market Pulse chart panel.
    Returns daily bars oldest-first, cached 4 hours to avoid rate limits.

    Period mapping (matches yfinance API):
        1m  → 1mo   (~30 trading days)
        3m  → 3mo   (~90 trading days)
        6m  → 6mo   (~180 trading days)
        1y  → 1y    (~365 trading days)
        3y  → 3y    (~3 years of daily bars)
        5y  → 5y    (~5 years of daily bars)
        max → max   (full history, 15+ years for EGX .CA stocks)
    """
    # 1. Normalise symbol: strip any .CA suffix, then re-add for Yahoo
    clean = symbol.upper().replace(".CA", "").strip()
    yahoo_sym = f"{clean}.CA"
    cache_key = f"{yahoo_sym}_{period}"

    # 2. Cache check
    now = time.time()
    if cache_key in _yf_history_cache:
        ts, cached_rows = _yf_history_cache[cache_key]
        if now - ts < _YF_CACHE_TTL:
            _set_freshness(response, cached_rows, "yfinance_cache")
            return cached_rows

    # 3. Map our period names → yfinance period strings
    period_map = {
        "1m": "1mo",
        "3m": "3mo",
        "6m": "6mo",
        "1y": "1y",
        "3y": "3y",
        "5y": "5y",
        "max": "max",
    }
    yf_period = period_map.get(period, "1y")

    # 4. Fetch via yfinance (blocking) inside a thread executor
    def _fetch_sync(yahoo_symbol: str, yf_per: str):
        try:
            import yfinance as yf
            import pandas as pd

            ticker = yf.Ticker(yahoo_symbol)
            df = ticker.history(period=yf_per, interval="1d", auto_adjust=True)

            if df is None or df.empty:
                return []

            df = df.reset_index()
            # Normalise column names to lowercase
            df.columns = [c.lower() for c in df.columns]

            rows = []
            for _, row in df.iterrows():
                # Date column may be 'date' or 'datetime'
                raw_date = row.get("date") or row.get("datetime")
                if raw_date is None:
                    continue
                # Convert pandas Timestamp → ISO date string
                if hasattr(raw_date, "strftime"):
                    date_str = raw_date.strftime("%Y-%m-%d")
                else:
                    date_str = str(raw_date)[:10]

                open_v  = float(row.get("open")  or 0)
                high_v  = float(row.get("high")  or 0)
                low_v   = float(row.get("low")   or 0)
                close_v = float(row.get("close") or 0)
                vol_v   = int(row.get("volume")  or 0)

                # Skip clearly invalid rows (Yahoo sometimes returns zeros)
                if close_v <= 0:
                    continue

                rows.append({
                    "date":   date_str,
                    "open":   round(open_v, 4),
                    "high":   round(high_v, 4),
                    "low":    round(low_v, 4),
                    "close":  round(close_v, 4),
                    "volume": vol_v,
                })

            # Ensure oldest-first order (Yahoo sometimes returns descending)
            rows.sort(key=lambda r: r["date"])
            return rows

        except Exception as ex:
            print(f"[Yahoo History] Error fetching {yahoo_symbol} period={yf_per}: {ex}")
            return []

    try:
        loop = asyncio.get_running_loop()
        rows = await asyncio.wait_for(
            loop.run_in_executor(None, _fetch_sync, yahoo_sym, yf_period),
            timeout=20.0
        )
    except asyncio.TimeoutError:
        print(f"[Yahoo History] Timeout for {yahoo_sym} period={yf_period}")
        rows = []
    except Exception as e:
        print(f"[Yahoo History] Unexpected error for {yahoo_sym}: {e}")
        rows = []

    # 5. Cache successful (non-empty) responses; cache empty too to avoid thundering herd
    _yf_history_cache[cache_key] = (now, rows)
    _set_freshness(response, rows, "yfinance")
    return rows

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
        FROM financial_statements_v
        WHERE symbol = $1 AND period_type = $2
        ORDER BY fiscal_year DESC
        LIMIT 10
    """, symbol.upper(), period)
    return [dict(r) for r in rows]


@router.get("/egx/dividends/{symbol}", response_model=List[dict])
async def get_egx_dividends(symbol: str):
    """Get dividend history for an EGX stock"""
    # TV-self-extending source (June-2026): dividend_history froze in January.
    rows = await db.fetch_all(
        "SELECT id, symbol, ex_date, amount AS dividend_amount, currency "
        "FROM corporate_actions WHERE symbol = $1 AND action_type = 'Dividend' "
        "ORDER BY ex_date DESC",
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

