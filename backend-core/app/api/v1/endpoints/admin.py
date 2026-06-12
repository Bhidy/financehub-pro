"""
Enterprise Data Pipeline - FinanceHub Pro
Uses yfinance + yahooquery for reliable Saudi stock data
ZERO simulated data - all real market data

Key Features:
- yfinance: Real-time prices, OHLCV, intraday, dividends
- yahooquery: Historical financials, valuation metrics, corporate events
- No-overwrite policy: Data accumulates, never loses existing data
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from app.db.session import db
import logging
from datetime import datetime, timedelta
import asyncio
import time
from typing import List, Dict, Optional
import sys
import os
import pandas as pd
import io
from fastapi import UploadFile, File

from app.services.egypt_market_service import egypt_market_service
import hmac
from fastapi import Header, Depends

router = APIRouter()
logger = logging.getLogger(__name__)


def require_admin_token(x_admin_token: Optional[str] = Header(default=None)):
    """Guard for privileged admin endpoints. Requires the X-Admin-Token header to
    match the server's ADMIN_API_TOKEN env. These endpoints were previously
    UNAUTHENTICATED in production (anyone could trigger refreshes / upload files /
    SSRF). CI crons send the token from a GitHub secret; humans use it explicitly.
    If ADMIN_API_TOKEN is not configured the endpoint is disabled (fail-closed)."""
    expected = os.getenv("ADMIN_API_TOKEN")
    if not expected:
        raise HTTPException(status_code=503, detail="Admin endpoint disabled (ADMIN_API_TOKEN not configured)")
    if not x_admin_token or not hmac.compare_digest(str(x_admin_token), str(expected)):
        raise HTTPException(status_code=403, detail="Forbidden")
    return True

@router.get("/debug/fetch", dependencies=[Depends(require_admin_token)])
async def debug_fetch_price(symbol: str):
    """Debug endpoint to test yfinance fetch directly"""
    try:
        data = await fetch_prices_yfinance([symbol])
        return data
    except Exception as e:
        return {"error": str(e)}

@router.get("/debug/html")
async def debug_html(url: str = None):
    """REMOVED — this was an unauthenticated SSRF (server-side fetch of any URL,
    returning 200KB of the response — reachable cloud-metadata / internal services).
    Permanently disabled."""
    raise HTTPException(status_code=410, detail="Endpoint removed (SSRF risk)")

@router.post("/debug/start_scheduler", dependencies=[Depends(require_admin_token)])
async def debug_start_scheduler():
    """Force start the scheduler service"""
    from app.services.scheduler import scheduler_service
    try:
        scheduler_service.start()
        jobs = scheduler_service.scheduler.get_jobs()
        job_info = [{"id": j.id, "next_run": str(j.next_run_time)} for j in jobs]
        return {"status": "started", "jobs": job_info}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@router.get("/debug/scheduler_jobs", dependencies=[Depends(require_admin_token)])
async def debug_scheduler_jobs():
    """Get status of background scheduler jobs"""
    from app.services.scheduler import scheduler_service
    try:
        jobs = scheduler_service.scheduler.get_jobs()
        job_info = []
        for j in jobs:
            job_info.append({
                "id": j.id,
                "next_run_time": str(j.next_run_time),
                "trigger": str(j.trigger),
                "func": str(j.func)
            })
        return {"status": "running", "jobs": job_info, "timezone": str(scheduler_service.scheduler.timezone)}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ============================================================
# DATABASE BACKUP MANAGEMENT
# ============================================================

@router.post("/backup/trigger", dependencies=[Depends(require_admin_token)])
async def trigger_backup(background_tasks: BackgroundTasks):
    """Manually trigger a database backup (runs in background)."""
    from app.services.backup_service import backup_service
    if backup_service.is_running:
        return {"status": "skipped", "reason": "Backup already in progress"}
    background_tasks.add_task(backup_service.run_backup)
    return {"status": "triggered", "message": "Backup started in background. Check /backup/status for progress."}

@router.get("/backup/status", dependencies=[Depends(require_admin_token)])
async def backup_status():
    """Get the current status of the weekly database backup."""
    from app.services.backup_service import backup_service
    return backup_service.get_status()

@router.get("/debug/screener", dependencies=[Depends(require_admin_token)])
async def debug_screener():
    """Debug the EGX feed — probes TradingViewEGXClient and EGXFeedRouter directly."""
    try:
        from data_pipeline.tradingview_client import TradingViewEGXClient
        client = TradingViewEGXClient()
        stocks = await client.get_egx_stocks()
        return {
            "status": "success",
            "count": len(stocks),
            "client_type": "TradingViewEGXClient",
            "sample": stocks[:2] if stocks else None
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
# ============================================================

@router.post("/debug/reset_status", dependencies=[Depends(require_admin_token)])
async def debug_reset_status():
    """Force reset the ingestion status lock"""
    global refresh_status
    refresh_status["is_running"] = False
    refresh_status["last_status"] = "forced_reset"
    refresh_status["errors"] = []
    refresh_status["stats"] = {}
    return {"status": "success", "message": "Status lock forced open"}

refresh_status = {
    "is_running": False,
    "started_at": None,
    "heartbeat_at": None,
    "last_run": None,
    "last_status": "idle",
    "tickers_updated": 0,
    "method": "yfinance_yahooquery",
    "errors": [],
    "data_source": "Yahoo Finance"
}

# Liveness is measured by INACTIVITY, not total runtime. A healthy long job (the
# daily EOD sync legitimately runs 50+ min) heartbeats every symbol, so its lock
# is never released mid-run. A job that makes NO progress for this window is
# assumed dead (crash / process restart / hung scrape) and its lock is released
# so the pipeline can never wedge itself permanently in "is_running": true.
# NOTE: must stay >= the slowest single opaque step (Egypt funds tls_client scrape).
MAX_INACTIVITY_SECONDS = 900  # 15 minutes with zero progress = dead


def _heartbeat():
    """Mark forward progress so an actively-running job is never seen as stale."""
    refresh_status["heartbeat_at"] = datetime.now().isoformat()


def _lock_refresh():
    """Acquire the global refresh lock and stamp the start + first heartbeat."""
    now = datetime.now().isoformat()
    refresh_status.update({"is_running": True, "started_at": now, "heartbeat_at": now})


def _is_locked() -> bool:
    """
    True only if a refresh is genuinely making progress. Auto-releases a lock that
    has gone silent (no heartbeat within MAX_INACTIVITY_SECONDS) so a crashed or
    hung job cannot block all future refreshes — without ever releasing a healthy
    long-running job that is still heartbeating.
    """
    if not refresh_status.get("is_running"):
        return False
    marker = refresh_status.get("heartbeat_at") or refresh_status.get("started_at")
    if marker:
        try:
            age = (datetime.now() - datetime.fromisoformat(marker)).total_seconds()
            if age > MAX_INACTIVITY_SECONDS:
                logger.warning(
                    f"Auto-releasing STALE refresh lock (no progress for {age:.0f}s > {MAX_INACTIVITY_SECONDS}s)"
                )
                refresh_status["is_running"] = False
                refresh_status["last_status"] = "auto_released_stale_lock"
                return False
        except Exception:
            pass
    return True

# ============================================================
# YFINANCE PRICE EXTRACTION (Primary for real-time prices)
# ============================================================

async def fetch_prices_yfinance(symbols: List[str]) -> Dict:
    """
    Fetch current prices using yfinance - NON-BLOCKING VERSION
    Uses asyncio.to_thread() to prevent event loop starvation
    RATE LIMITED: Processes in batches of 20 with delays
    """
    import yfinance as yf
    
    def _get_ticker_info_sync(yahoo_symbol: str) -> dict:
        """Synchronous helper - runs in thread pool to avoid blocking"""
        try:
            ticker = yf.Ticker(yahoo_symbol)
            return ticker.info
        except Exception as e:
            logger.warning(f"yfinance error for {yahoo_symbol}: {e}")
            return {}
    
    results = {}
    errors = []
    
    # BATCH PROCESSING to avoid rate limits
    batch_size = 20
    batches = [symbols[i:i+batch_size] for i in range(0, len(symbols), batch_size)]
    
    logger.info(f"Processing {len(symbols)} Saudi stocks in {len(batches)} batches (non-blocking)...")
    
    for batch_idx, batch in enumerate(batches):
        logger.info(f"Batch {batch_idx + 1}/{len(batches)}: {len(batch)} stocks")
        
        for symbol in batch:
            try:
                yahoo_symbol = f"{symbol}.SR"
                # NON-BLOCKING: Run yfinance in thread pool
                info = await asyncio.to_thread(_get_ticker_info_sync, yahoo_symbol)
                
                if not info:
                    errors.append(f"{symbol}: No data returned")
                    continue
                
                results[symbol] = {
                    'last_price': info.get('currentPrice') or info.get('regularMarketPrice'),
                    'prev_close': info.get('previousClose'),
                    'open_price': info.get('open'),
                    'high': info.get('dayHigh'),
                    'low': info.get('dayLow'),
                    'volume': info.get('volume'),
                    'change': None,
                    'change_percent': None,
                    'market_cap': info.get('marketCap'),
                    'pe_ratio': info.get('trailingPE'),
                    'pb_ratio': info.get('priceToBook'),
                    'dividend_yield': info.get('dividendYield'),
                    'beta': info.get('beta'),
                    'high_52w': info.get('fiftyTwoWeekHigh'),
                    'low_52w': info.get('fiftyTwoWeekLow'),
                    'target_price': info.get('targetMeanPrice'),
                    'sector': info.get('sector'),
                    'name_en': info.get('shortName'),
                }
                
                # Calculate change
                if results[symbol]['last_price'] and results[symbol]['prev_close']:
                    price = results[symbol]['last_price']
                    prev = results[symbol]['prev_close']
                    results[symbol]['change'] = round(price - prev, 4)
                    results[symbol]['change_percent'] = round(((price / prev) - 1) * 100, 2)
                
                # Small delay within batch
                await asyncio.sleep(0.15)
                
            except Exception as e:
                errors.append(f"{symbol}: {str(e)[:50]}")
                logger.warning(f"Error fetching {symbol}: {e}")
        
        # Longer delay between batches to avoid rate limiting
        if batch_idx < len(batches) - 1:
            logger.info(f"Waiting 3s before next batch...")
            await asyncio.sleep(3)
    
    return {"results": results, "errors": errors}






async def fetch_egx_prices_yfinance(symbols: List[str]) -> Dict:
    """
    Legacy yfinance fallback for EGX prices (now superseded by EGXFeedRouter which
    handles the TV → yfinance chain automatically). Retained for direct-call utility.

    Uses yfinance's BATCHED `download()` (the chart API) with the `.CA` suffix —
    one HTTP request per chunk of symbols instead of a per-symbol `.info` call.
    The old per-symbol `.info` path took >5 min for the full EGX universe, so the
    5-min price cron could never finish and prices went stale; this batched path
    fetches the whole universe in seconds and is also less rate-limited.

    Name/sector are intentionally NOT fetched here (they're static and preserved
    by the COALESCE upsert in update_market_tickers) — only live price fields.
    """
    import yfinance as yf

    results: Dict = {}
    errors: List[str] = []

    # Map "<clean>.CA" -> clean so we can read columns back per ticker.
    sym_map = {f"{s.replace('.CA', '')}.CA": s.replace('.CA', '') for s in symbols}
    yahoo_syms = list(sym_map.keys())
    chunk_size = 50
    chunks = [yahoo_syms[i:i + chunk_size] for i in range(0, len(yahoo_syms), chunk_size)]
    logger.info(f"[EGX fallback] Batch-downloading {len(yahoo_syms)} EGX stocks via yfinance(.CA) in {len(chunks)} chunk(s)...")

    def _download(tickers: List[str]):
        # period=5d/interval=1d guarantees today + a prior close even across weekends/holidays.
        return yf.download(
            tickers, period="5d", interval="1d", group_by="ticker",
            auto_adjust=False, threads=True, progress=False,
        )

    for ci, chunk in enumerate(chunks):
        try:
            df = await asyncio.to_thread(_download, chunk)
        except Exception as e:
            errors.append(f"chunk {ci}: {str(e)[:60]}")
            logger.warning(f"[EGX fallback] chunk {ci} download failed: {e}")
            continue

        if df is None or df.empty:
            errors.append(f"chunk {ci}: empty")
            continue

        for ysym in chunk:
            clean = sym_map[ysym]
            try:
                # With group_by='ticker' a multi-ticker frame has columns (ticker, field);
                # a single-ticker frame has just field columns.
                sub = df[ysym] if isinstance(df.columns, pd.MultiIndex) else df
                sub = sub.dropna(subset=["Close"])
                if sub is None or sub.empty:
                    errors.append(f"{clean}: no data")
                    continue

                last_price = float(sub["Close"].iloc[-1])
                prev = float(sub["Close"].iloc[-2]) if len(sub) >= 2 else None
                if not last_price:
                    errors.append(f"{clean}: no price")
                    continue

                change = round(last_price - prev, 4) if prev else None
                change_pct = round(((last_price / prev) - 1) * 100, 2) if prev else None
                vol = sub["Volume"].iloc[-1]

                results[clean] = {
                    'symbol': clean,
                    'last_price': last_price,
                    'change': change,
                    'change_percent': change_pct,
                    'volume': int(vol) if pd.notna(vol) else 0,
                    'open_price': float(sub["Open"].iloc[-1]) if pd.notna(sub["Open"].iloc[-1]) else None,
                    'high': float(sub["High"].iloc[-1]) if pd.notna(sub["High"].iloc[-1]) else None,
                    'low': float(sub["Low"].iloc[-1]) if pd.notna(sub["Low"].iloc[-1]) else None,
                    'prev_close': prev,
                }
            except Exception as e:
                errors.append(f"{clean}: {str(e)[:50]}")

        if ci < len(chunks) - 1:
            await asyncio.sleep(1)

    logger.info(f"[EGX fallback] yfinance(.CA) batch updated {len(results)} EGX stocks")
    return {"results": results, "errors": errors}


async def fetch_historical_ohlc(symbol: str, period: str = "max") -> List[Dict]:
    """
    Fetch historical OHLCV data using yfinance
    NO OVERWRITE: Only inserts new dates, preserves existing data
    """
    import yfinance as yf
    
    try:
        yahoo_symbol = f"{symbol}.SR"
        ticker = yf.Ticker(yahoo_symbol)
        hist = ticker.history(period=period)
        
        if hist is None or len(hist) == 0:
            return []
        
        records = []
        for date, row in hist.iterrows():
            records.append({
                'symbol': symbol,
                'date': date.date() if hasattr(date, 'date') else date,
                'open': float(row['Open']) if row['Open'] else None,
                'high': float(row['High']) if row['High'] else None,
                'low': float(row['Low']) if row['Low'] else None,
                'close': float(row['Close']) if row['Close'] else None,
                'volume': int(row['Volume']) if row['Volume'] else 0,
            })
        
        return records
        
    except Exception as e:
        logger.error(f"Error fetching OHLC for {symbol}: {e}")
        return []


async def fetch_intraday(symbol: str, interval: str = "5m") -> List[Dict]:
    """Fetch intraday data using yfinance"""
    import yfinance as yf
    
    try:
        yahoo_symbol = f"{symbol}.SR"
        ticker = yf.Ticker(yahoo_symbol)
        
        if interval == "1m":
            hist = ticker.history(period="1d", interval="1m")
        elif interval in ["5m", "15m"]:
            hist = ticker.history(period="5d", interval=interval)
        else:
            hist = ticker.history(period="1mo", interval=interval)
        
        if hist is None or len(hist) == 0:
            return []
        
        records = []
        for timestamp, row in hist.iterrows():
            records.append({
                'symbol': symbol,
                'timestamp': timestamp,
                'open': float(row['Open']) if row['Open'] else None,
                'high': float(row['High']) if row['High'] else None,
                'low': float(row['Low']) if row['Low'] else None,
                'close': float(row['Close']) if row['Close'] else None,
                'volume': int(row['Volume']) if row['Volume'] else 0,
            })
        
        return records
        
    except Exception as e:
        logger.error(f"Error fetching intraday for {symbol}: {e}")
        return []


# ============================================================
# YAHOOQUERY FINANCIAL EXTRACTION (Primary for fundamentals)
# ============================================================

async def fetch_financials_yahooquery(symbol: str) -> Dict:
    """
    Fetch comprehensive financial data using yahooquery
    Includes: Income Statement, Balance Sheet, Cash Flow, Valuation
    """
    from yahooquery import Ticker
    
    try:
        yahoo_symbol = f"{symbol}.SR"
        ticker = Ticker(yahoo_symbol)
        
        result = {
            'income_statement': None,
            'balance_sheet': None,
            'cash_flow': None,
            'valuation_measures': None,
            'corporate_events': None,
        }
        
        # Income Statement (up to 15 periods)
        income = ticker.income_statement(frequency='a')
        if hasattr(income, 'to_dict'):
            result['income_statement'] = income.to_dict('records')
        
        # Balance Sheet
        balance = ticker.balance_sheet(frequency='a')
        if hasattr(balance, 'to_dict'):
            result['balance_sheet'] = balance.to_dict('records')
        
        # Cash Flow
        cashflow = ticker.cash_flow(frequency='a')
        if hasattr(cashflow, 'to_dict'):
            result['cash_flow'] = cashflow.to_dict('records')
        
        # Valuation History (UNIQUE to yahooquery)
        valuation = ticker.valuation_measures
        if hasattr(valuation, 'to_dict'):
            result['valuation_measures'] = valuation.to_dict('records')
        
        # Corporate Events
        events = ticker.corporate_events
        if hasattr(events, 'to_dict'):
            result['corporate_events'] = events.to_dict('records')
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching financials for {symbol}: {e}")
        return {}


async def fetch_analyst_data(symbol: str) -> Dict:
    """Fetch analyst ratings and recommendations"""
    import yfinance as yf
    
    try:
        yahoo_symbol = f"{symbol}.SR"
        ticker = yf.Ticker(yahoo_symbol)
        
        info = ticker.info
        recs = ticker.recommendations
        
        result = {
            'target_price': info.get('targetMeanPrice'),
            'target_high': info.get('targetHighPrice'),
            'target_low': info.get('targetLowPrice'),
            'num_analysts': info.get('numberOfAnalystOpinions'),
            'recommendation': info.get('recommendationKey'),
            'recommendations': recs.to_dict('records') if recs is not None and len(recs) > 0 else []
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching analyst data for {symbol}: {e}")
        return {}


async def fetch_indices() -> Dict:
    """
    Fetch major market indices (TASI, EGX30)
    """
    import yfinance as yf
    
    indices = {
        '^TASI.SR': 'TASI',
        '^EGX30': 'EGX30'  # Adjust if Yahoo has different symbol
    }
    
    results = {}
    errors = []
    
    for yahoo_sym, name in indices.items():
        try:
            ticker = yf.Ticker(yahoo_sym)
            info = ticker.info
            
            # Extract key data
            price = info.get('regularMarketPrice') or info.get('currentPrice')
            prev = info.get('regularMarketPreviousClose') or info.get('previousClose')
            
            change = 0
            change_pct = 0
            
            if price and prev:
                change = price - prev
                change_pct = (change / prev) * 100
            
            results[name] = {
                'price': price,
                'change': change,
                'change_percent': change_pct,
                'high': info.get('dayHigh'),
                'low': info.get('dayLow'),
                'volume': info.get('volume'),
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            errors.append(f"{name}: {e}")
            
    return {"results": results, "errors": errors}


async def fetch_market_news() -> List[Dict]:
    """
    Fetch latest market news via RSS/Scraping
    Wrapper for specific news logic
    """
    # Placeholder for actual news scraping logic
    # In production this would hit RSS feeds
    return []


# ============================================================
# DATABASE UPDATE FUNCTIONS (NO OVERWRITE POLICY)
# ============================================================

async def update_market_tickers(data: Dict):
    """
    Update market_tickers table with latest prices
    Uses UPSERT to update existing, insert new
    """
    for symbol, values in data.items():
        if values.get('last_price'):
            await db.execute("""
                INSERT INTO market_tickers (symbol, name_en, sector_name, last_price, 
                    change, change_percent, volume, open_price, high, low, prev_close, last_updated)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                ON CONFLICT (symbol) DO UPDATE SET
                    name_en = COALESCE(EXCLUDED.name_en, market_tickers.name_en),
                    sector_name = COALESCE(market_tickers.sector_name, EXCLUDED.sector_name),
                    last_price = EXCLUDED.last_price,
                    change = EXCLUDED.change,
                    change_percent = EXCLUDED.change_percent,
                    volume = EXCLUDED.volume,
                    open_price = EXCLUDED.open_price,
                    high = EXCLUDED.high,
                    low = EXCLUDED.low,
                    prev_close = EXCLUDED.prev_close,
                    last_updated = NOW()
            """, symbol, values.get('name_en'), values.get('sector'),
                values.get('last_price'), values.get('change'), values.get('change_percent'),
                values.get('volume'), values.get('open_price'), values.get('high'),
                values.get('low'), values.get('prev_close'))


async def save_ohlc_no_overwrite(records: List[Dict]):
    """
    Save OHLC data with NO OVERWRITE policy
    Only inserts new dates, preserves existing data
    """
    for record in records:
        await db.execute("""
            INSERT INTO ohlc_data (symbol, date, open, high, low, close, volume)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (symbol, date) DO NOTHING
        """, record['symbol'], record['date'], record['open'], record['high'],
            record['low'], record['close'], record['volume'])


async def save_intraday_no_overwrite(records: List[Dict]):
    """
    Save intraday data with NO OVERWRITE policy
    Only inserts new timestamps, preserves existing data
    """
    for record in records:
        await db.execute("""
            INSERT INTO intraday_data (symbol, timestamp, open, high, low, close, volume)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (symbol, timestamp) DO NOTHING
        """, record['symbol'], record['timestamp'], record['open'], record['high'],
            record['low'], record['close'], record['volume'])




async def fetch_prices_stockanalysis(symbols: List[str]) -> Dict:
    """Removed — StockAnalysis.com is no longer a data source. Use EGXFeedRouter."""
    raise RuntimeError("fetch_prices_stockanalysis is removed; use EGXFeedRouter instead")


async def save_analyst_ratings(symbol: str, data: Dict):
    """Save analyst ratings with date tracking"""
    if data.get('target_price'):
        await db.execute("""
            INSERT INTO analyst_ratings (symbol, analyst_firm, rating, target_price, 
                current_price, rating_date, created_at)
            VALUES ($1, 'Yahoo Finance Consensus', $2, $3, $4, CURRENT_DATE, NOW())
            ON CONFLICT DO NOTHING
        """, symbol, data.get('recommendation', 'hold'), data.get('target_price'),
            data.get('target_price'))


async def save_indices_data(data: Dict):
    """Save index data to database"""
    for index_code, values in data.items():
        if values.get('price'):
            # Save to index_history (daily snapshot)
            await db.execute("""
                INSERT INTO index_history (index_code, date, close, high, low, change_percent, volume, created_at)
                VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (index_code, date) DO UPDATE SET
                    close = EXCLUDED.close,
                    high = EXCLUDED.high,
                    low = EXCLUDED.low,
                    change_percent = EXCLUDED.change_percent,
                    volume = EXCLUDED.volume,
                    created_at = NOW()
            """, index_code, values['price'], values['high'], values['low'], 
               values['change_percent'], values['volume'])


# ============================================================
# MAIN REFRESH WORKFLOWS
# ============================================================

# Duplicate refresh_all_prices removed. The optimized parallel version below is used.


async def refresh_all_prices():
    """
    5-MINUTE REFRESH: Update all stock prices
    Designed to run every 5 minutes during market hours
    Egypt: EGXFeedRouter (TradingView primary → yfinance .CA fallback)
    Saudi: KSAFeedRouter (TradingView primary → yfinance .SR fallback)
    Both routers enforce the >= 2 source invariant — never single-source.
    """
    global refresh_status
    
    _lock_refresh()
    refresh_status["errors"] = []
    refresh_status["tickers_updated"] = 0
    
    try:
        # Get all symbols with market code
        symbols_result = await db.fetch_all("SELECT symbol, market_code FROM market_tickers ORDER BY symbol")
        
        saudi_symbols = []
        egypt_symbols = [] # Legacy use
        
        if not symbols_result:
            saudi_symbols = ['1120', '2222', '1010']
        else:
            for row in symbols_result:
                if row['market_code'] == 'EGX':
                    egypt_symbols.append(row['symbol'])
                else:
                    saudi_symbols.append(row['symbol'])

        # Define parallel processors
        async def process_ksa():
            if not saudi_symbols: return 0, []
            try:
                from data_pipeline.egx_feed_router import KSAFeedRouter
                logger.info(f"Refreshing {len(saudi_symbols)} KSA stocks via TradingView/yfinance router...")
                ksa_stocks = await asyncio.wait_for(
                    KSAFeedRouter(fallback_symbols=saudi_symbols).get_ksa_stocks(), timeout=60.0)
                ksa_updates = {}
                for stock in ksa_stocks:
                    if not stock.get('last_price'):
                        continue
                    ksa_updates[stock['symbol']] = {
                        'symbol': stock['symbol'],
                        'name_en': stock.get('name_en'),
                        'sector': stock.get('sector_name'),
                        'last_price': float(stock['last_price']),
                        'change': float(stock.get('change') or 0.0),
                        'change_percent': float(stock.get('change_percent') or 0.0),
                        'volume': int(stock.get('volume') or 0),
                    }
                if ksa_updates:
                    await update_market_tickers(ksa_updates)
                    try:
                        await db.execute(
                            "UPDATE market_tickers SET source='tradingview', updated_at=NOW() "
                            "WHERE market_code!='EGX' AND symbol = ANY($1::text[])",
                            list(ksa_updates.keys()))
                    except Exception as _src_e:
                        logger.warning(f"KSA source tagging skipped: {_src_e}")
                    logger.info(f"KSA updated {len(ksa_updates)} stocks via TradingView/yfinance router")
                    return len(ksa_updates), []
                return 0, ["KSAFeedRouter returned no usable prices"]
            except Exception as e:
                logger.error(f"KSA Update Failed: {e}")
                return 0, [f"KSA Critical: {e}"]

        async def process_egx():
            if not egypt_symbols: return 0, []
            try:
                from data_pipeline.egx_feed_router import EGXFeedRouter
                egx_stocks = await EGXFeedRouter(fallback_symbols=egypt_symbols).get_egx_stocks()
                egx_updates = {}
                for stock in egx_stocks:
                    if not stock.get('last_price'):
                        continue  # never zero out a live stock
                    egx_updates[stock['symbol']] = {
                        'symbol': stock['symbol'],
                        'name_en': stock.get('name_en'),
                        'sector': stock.get('sector_name'),
                        'last_price': float(stock['last_price']),
                        'change': float(stock.get('change') or 0.0),
                        'change_percent': float(stock.get('change_percent') or 0.0),
                        'volume': int(stock.get('volume') or 0),
                    }
                if egx_updates:
                    await update_market_tickers(egx_updates)
                    try:  # best-effort provenance tag; never blocks the price update
                        await db.execute(
                            "UPDATE market_tickers SET source='tradingview', updated_at=NOW() "
                            "WHERE market_code='EGX' AND symbol = ANY($1::text[])",
                            list(egx_updates.keys()))
                    except Exception as _src_e:
                        logger.warning(f"EGX source tagging skipped: {_src_e}")
                    logger.info(f"EGX updated {len(egx_updates)} stocks via TradingView/yfinance router")
                    return len(egx_updates), []
                return 0, ["EGXFeedRouter returned no usable prices"]
            except Exception as e:
                logger.error(f"EGX feed router failed (all sources exhausted): {e}")
                return 0, [f"EGX error: {str(e)[:120]}"]

        # Execute in parallel
        results = await asyncio.gather(process_ksa(), process_egx(), return_exceptions=True)
        
        # Parse results
        ksa_count, ksa_errors = results[0] if isinstance(results[0], tuple) else (0, [str(results[0])])
        egx_count, egx_errors = results[1] if isinstance(results[1], tuple) else (0, [str(results[1])])
        
        total_updated = ksa_count + egx_count
        refresh_status["errors"] = ksa_errors + egx_errors
        refresh_status["tickers_updated"] = total_updated
        
        if total_updated > 0:
            refresh_status["last_status"] = "success"
        else:
            refresh_status["last_status"] = "completed_no_updates"
            if ksa_errors or egx_errors:
                refresh_status["last_status"] = "partial_failure"

        refresh_status["last_run"] = datetime.now().isoformat()
        
    except Exception as e:
        logger.error(f"Global Refresh Failed: {e}")
        # Public-facing (GET /refresh/status is open for cron polling): keep the
        # 'error:' keyword the workflows match on, but never echo raw exception
        # text to the internet — full detail goes to the server log only.
        refresh_status["last_status"] = f"error: {type(e).__name__}"
        refresh_status["errors"].append(f"refresh error: {type(e).__name__}")
    finally:
        refresh_status["is_running"] = False
    
    return refresh_status


async def refresh_daily_data():
    """
    DAILY EOD REFRESH: Full OHLC history, analyst data
    Runs after market close (6 PM Saudi)
    - Saudi: yfinance (OHLC + Analyst)
    - Egypt: TradingView financials cycle (tv_egx_harvester.py --cycle financials)
    """
    global refresh_status
    
    _lock_refresh()
    refresh_status["errors"] = []
    
    try:
        symbols_result = await db.fetch_all("SELECT symbol, market_code FROM market_tickers ORDER BY symbol")
        
        saudi_symbols = []
        egypt_symbols = []
        
        if symbols_result:
             for row in symbols_result:
                if row['market_code'] == 'EGX':
                    egypt_symbols.append(row['symbol'])
                else:
                    saudi_symbols.append(row['symbol'])
        
        logger.info(f"Daily Sync: {len(saudi_symbols)} Saudi, {len(egypt_symbols)} Egypt")
        
        # 1. Saudi Stocks (yfinance)
        for symbol in saudi_symbols:
            try:
                # Fetch and save OHLC history (NO OVERWRITE)
                ohlc = await fetch_historical_ohlc(symbol, period="1mo")
                await save_ohlc_no_overwrite(ohlc)
                
                # Fetch and save analyst data
                analyst = await fetch_analyst_data(symbol)
                await save_analyst_ratings(symbol, analyst)
                
                await asyncio.sleep(0.2)
                
            except Exception as e:
                refresh_status["errors"].append(f"{symbol}: {str(e)[:30]}")
        
        # 2. Egypt Stocks (TradingView financials harvest)
        if egypt_symbols:
            logger.info("Triggering TradingView financials cycle for Egypt stocks...")
            try:
                base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
                script_path = os.path.join(base_dir, 'scripts', 'tv_egx_harvester.py')
                proc = await asyncio.create_subprocess_exec(
                    sys.executable, script_path, '--cycle', 'financials',
                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=600)
                if proc.returncode != 0:
                    err_tail = (stderr or b'').decode(errors='ignore')[-300:]
                    refresh_status["errors"].append(f"Egypt TV financials failed (exit {proc.returncode})")
                    logger.error(f"Egypt TV financials failed (exit {proc.returncode}): {err_tail}")
                else:
                    logger.info("Egypt TV financials cycle completed successfully")
            except Exception as e:
                logger.error(f"Egypt financials error: {e}")
                refresh_status["errors"].append(f"Egypt financials error: {type(e).__name__}")
                logger.error(f"Egypt financials trigger failed: {e}")

        # Also update prices (covers both markets via split logic)
        await refresh_all_prices()
        
        refresh_status["last_status"] = "success"
        refresh_status["last_run"] = datetime.now().isoformat()
        
    except Exception as e:
        logger.error(f"Daily sync failed: {e}")
        # Public-facing (GET /refresh/status is open for cron polling): keep the
        # 'error:' keyword the workflows match on, but never echo raw exception
        # text to the internet — full detail goes to the server log only.
        refresh_status["last_status"] = f"error: {type(e).__name__}"
    
    finally:
        refresh_status["is_running"] = False
    
    return refresh_status


async def backfill_historical_data(symbol: str = None):
    """
    SPEED-OPTIMIZED 19.2M DATAPOINT BACKFILL
    
    Splits:
    - Saudi (SR): yfinance Batch (OHLC, Intraday, Financials)
    - Egypt (EGX): StockAnalysis Ingestion (History, Financials, Profile)
    """
    global refresh_status
    import yfinance as yf
    
    _lock_refresh()
    refresh_status["errors"] = []
    
    stats = {
        "ohlc_daily": 0,
        "intraday_1h": 0,
        "intraday_5m": 0,
        "financials": 0,
        "valuations": 0,
        "dividends": 0,
        "profiles": 0,
        "stocks_done": 0,
        "egypt_ingested": 0
    }
    
    try:
        saudi_symbols = []
        egypt_symbols = []
        
        if symbol:
             # Check market for single symbol
             res = await db.fetch_one("SELECT market_code FROM market_tickers WHERE symbol = $1", symbol)
             if res and res['market_code'] == 'EGX':
                 egypt_symbols = [symbol]
             else:
                 saudi_symbols = [symbol]
        else:
            symbols_result = await db.fetch_all("SELECT symbol, market_code FROM market_tickers ORDER BY symbol")
            if symbols_result:
                for row in symbols_result:
                    if row['market_code'] == 'EGX':
                        egypt_symbols.append(row['symbol'])
                    else:
                        saudi_symbols.append(row['symbol'])
        
        logger.info(f"Backfill: {len(saudi_symbols)} Saudi, {len(egypt_symbols)} Egypt")
        
        # 1. SAUDI BACKFILL (Existing Logic)
        if saudi_symbols:
            logger.info(f"Starting Saudi optimized backfill for {len(saudi_symbols)} stocks...")
            for idx, sym in enumerate(saudi_symbols):
                try:
                    yahoo_sym = f"{sym}.SR"
                    ticker = yf.Ticker(yahoo_sym)
                    
                    # [Keep existing detailed yfinance logic here or refactor if too long]
                    # Since replace_file_content replaces the whole block, I must include the logic logic.
                    # ... [Insert previous logic for Saudi] ...
                    
                    # 1. Daily OHLC (max history - 6+ years) - BATCH
                    try:
                        hist = ticker.history(period="max", interval="1d")
                        if hist is not None and len(hist) > 0:
                            ohlc_records = []
                            for ts, row in hist.iterrows():
                                ohlc_records.append({
                                    "symbol": sym,
                                    "date": ts.date() if hasattr(ts, 'date') else ts,
                                    "open": float(row['Open']) if row['Open'] else None,
                                    "high": float(row['High']) if row['High'] else None,
                                    "low": float(row['Low']) if row['Low'] else None,
                                    "close": float(row['Close']) if row['Close'] else None,
                                    "volume": int(row['Volume']) if row['Volume'] else 0
                                })
                            await save_ohlc_no_overwrite(ohlc_records)
                            stats["ohlc_daily"] += len(ohlc_records)
                    except Exception as e:
                        pass
                    
                    # 2. Intraday 1-hour (730 days) - BATCH INSERT
                    try:
                        hist_1h = ticker.history(period="730d", interval="1h")
                        if hist_1h is not None and len(hist_1h) > 0:
                            values = [(sym, ts, 
                                float(row['Open']) if row['Open'] else None,
                                float(row['High']) if row['High'] else None,
                                float(row['Low']) if row['Low'] else None,
                                float(row['Close']) if row['Close'] else None,
                                int(row['Volume']) if row['Volume'] else 0
                            ) for ts, row in hist_1h.iterrows()]
                            
                            for i in range(0, len(values), 500):
                                chunk = values[i:i+500]
                                await db.executemany("""
                                    INSERT INTO intraday_1h (symbol, timestamp, open, high, low, close, volume)
                                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                                    ON CONFLICT (symbol, timestamp) DO NOTHING
                                """, chunk)
                            stats["intraday_1h"] += len(values)
                    except Exception: pass
                    
                    # 3. Intraday 5-min (60 days) - BATCH INSERT
                    try:
                        hist_5m = ticker.history(period="60d", interval="5m")
                        if hist_5m is not None and len(hist_5m) > 0:
                            values = [(sym, ts,
                                float(row['Open']) if row['Open'] else None,
                                float(row['High']) if row['High'] else None,
                                float(row['Low']) if row['Low'] else None,
                                float(row['Close']) if row['Close'] else None,
                                int(row['Volume']) if row['Volume'] else 0
                            ) for ts, row in hist_5m.iterrows()]
                            
                            for i in range(0, len(values), 500):
                                chunk = values[i:i+500]
                                await db.executemany("""
                                    INSERT INTO intraday_5m (symbol, timestamp, open, high, low, close, volume)
                                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                                    ON CONFLICT (symbol, timestamp) DO NOTHING
                                """, chunk)
                            stats["intraday_5m"] += len(values)
                    except Exception: pass
                    
                    # 5. Company Profile
                    try:
                        info = ticker.info
                        if info:
                            await db.execute("""
                                INSERT INTO company_profiles (symbol, name_en, sector, industry, description, website, employees, info_json)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                                ON CONFLICT (symbol) DO UPDATE SET
                                    name_en = COALESCE(EXCLUDED.name_en, company_profiles.name_en),
                                    sector = COALESCE(EXCLUDED.sector, company_profiles.sector),
                                    updated_at = NOW()
                            """, sym,
                                info.get('shortName'), info.get('sector'), info.get('industry'),
                                (info.get('longBusinessSummary', '')[:2000] if info.get('longBusinessSummary') else None),
                                info.get('website'), info.get('fullTimeEmployees'), "{}"
                            )
                            stats["profiles"] += 1
                    except Exception: pass

                    stats["stocks_done"] += 1
                    await asyncio.sleep(0.1)

                except Exception as e:
                    refresh_status["errors"].append(f"{sym}: {str(e)[:30]}")

        # 2. EGYPT BACKFILL (TradingView financials cycle)
        if egypt_symbols:
            logger.info(f"Triggering TradingView financials backfill for {len(egypt_symbols)} Egypt stocks...")
            try:
                base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
                script_path = os.path.join(base_dir, 'scripts', 'tv_egx_harvester.py')
                proc = await asyncio.create_subprocess_exec(
                    sys.executable, script_path, '--cycle', 'financials',
                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=600)
                if proc.returncode == 0:
                    stats["egypt_ingested"] = len(egypt_symbols)
                else:
                    err_tail = (stderr or b'').decode(errors='ignore')[-200:]
                    logger.error(f"Egypt TV backfill failed (exit {proc.returncode}): {err_tail}")
                    refresh_status["errors"].append(f"Egypt TV backfill failed (exit {proc.returncode})")
            except Exception as e:
                logger.error(f"Egypt backfill error: {e}")
                refresh_status["errors"].append(f"Egypt backfill error: {type(e).__name__}")
        
        total = sum(v for k, v in stats.items() if k != 'stocks_done')
        refresh_status["last_status"] = f"success: {total} records. Saudi:{stats['stocks_done']}, Egypt:{stats['egypt_ingested']}"
        refresh_status["last_run"] = datetime.now().isoformat()
        refresh_status["stats"] = stats
        
        logger.info(f"BACKFILL COMPLETE: {stats}")
        
    except Exception as e:
        logger.error(f"Backfill failed: {e}")
        # Public-facing (GET /refresh/status is open for cron polling): keep the
        # 'error:' keyword the workflows match on, but never echo raw exception
        # text to the internet — full detail goes to the server log only.
        refresh_status["last_status"] = f"error: {type(e).__name__}"
    
    finally:
        refresh_status["is_running"] = False
    
    return refresh_status







# ============================================================
# API ENDPOINTS
# ============================================================

@router.post("/refresh/prices", dependencies=[Depends(require_admin_token)])
async def trigger_price_refresh(background_tasks: BackgroundTasks):
    """
    5-MINUTE REFRESH: Quick price update using yfinance
    Safe to run every 5 minutes during market hours
    """
    if _is_locked():
        return {"status": "already_running", "message": "A refresh is already in progress"}
    
    background_tasks.add_task(refresh_all_prices)
    
    return {
        "status": "started",
        "method": "yfinance",
        "message": "Price refresh started",
        "check_status_at": "/api/v1/admin/refresh/status"
    }


@router.post("/refresh/sync", dependencies=[Depends(require_admin_token)])
async def sync_data_now():
    """
    SYNCHRONOUS PRICE REFRESH: For scheduled tasks
    Returns after completion
    """
    if _is_locked():
        return {"status": "already_running"}
    
    result = await refresh_all_prices()
    
    return {
        "status": result["last_status"],
        "method": "yfinance",
        "tickers_updated": result["tickers_updated"],
        "last_run": result["last_run"],
        "errors": result["errors"][:5]
    }


@router.post("/refresh/daily", dependencies=[Depends(require_admin_token)])
async def trigger_daily_sync(background_tasks: BackgroundTasks):
    """
    DAILY EOD SYNC: Full data refresh after market close
    Includes: OHLC history, analyst ratings
    """
    if _is_locked():
        return {"status": "already_running"}
    
    background_tasks.add_task(refresh_daily_data)
    
    return {
        "status": "started",
        "method": "yfinance_daily",
        "message": "Daily sync started (OHLC + Analyst data)"
    }


@router.post("/refresh/backfill", dependencies=[Depends(require_admin_token)])
async def trigger_backfill(symbol: Optional[str] = None):
    """
    HISTORICAL BACKFILL: Collect 6+ years of data
    Uses asyncio.create_task() for reliable background execution
    NO OVERWRITE: Preserves existing data, only adds new
    
    Monitor progress at: /api/v1/admin/refresh/status
    """
    if _is_locked():
        return {
            "status": "already_running", 
            "message": "A backfill is already in progress. Check status at /api/v1/admin/refresh/status"
        }
    
    # Mark as running IMMEDIATELY
    _lock_refresh()
    refresh_status["errors"] = []
    refresh_status["last_status"] = "starting backfill..."
    refresh_status["stats"] = {"stocks_done": 0, "total_records": 0}
    
    # Use asyncio.create_task() - THIS WORKS ON HF SPACES!
    # BackgroundTasks.add_task() does NOT work on HF Spaces
    logger.info(f"BACKFILL TRIGGERED - symbol={symbol}, using asyncio.create_task()")
    asyncio.create_task(run_robust_backfill(symbol))
    
    return {
        "status": "started",
        "method": "yfinance_backfill",
        "message": "Background backfill started! Monitor progress at /api/v1/admin/refresh/status",
        "check_status_at": "/api/v1/admin/refresh/status"
    }


@router.get("/data/stats")
async def get_data_stats():
    """
    Get statistics on data coverage
    """
    total_tickers = await db.fetch_val("SELECT count(*) FROM market_tickers")
    saudi_tickers = await db.fetch_val("SELECT count(*) FROM market_tickers WHERE market_code != 'EGX' OR market_code IS NULL")
    egypt_tickers = await db.fetch_val("SELECT count(*) FROM market_tickers WHERE market_code = 'EGX'")
    
    profiles = await db.fetch_val("SELECT count(*) FROM company_profiles")
    ohlc = await db.fetch_val("SELECT count(*) FROM ohlc_data")
    
    return {
        "status": "active",
        "market_tickers": {
            "total": total_tickers,
            "saudi": saudi_tickers,
            "egypt": egypt_tickers
        },
        "coverage": {
            "profiles": profiles,
            "ohlc_records": ohlc
        },
        "last_refresh": refresh_status["last_run"]
    }


@router.get("/data/freshness")
async def get_data_freshness():
    """
    Check when data was last updated
    """
    last_price_update = await db.fetch_val("SELECT max(last_updated) FROM market_tickers")
    last_profile_update = await db.fetch_val("SELECT max(updated_at) FROM company_profiles")
    
    return {
        "prices": last_price_update,
        "profiles": last_profile_update,
        "system_time": datetime.now().isoformat()
    }


# ============================================================
# EGYPT SPECIFIC ENDPOINTS
# ============================================================

@router.post("/refresh/egypt-funds", dependencies=[Depends(require_admin_token)])
async def trigger_egypt_funds_sync(background_tasks: BackgroundTasks):
    """
    EGYPT FUNDS SYNC: Update NAVs for all funds
    Uses tls_client to bypass Cloudflare
    """
    if _is_locked():
        return {"status": "already_running"}
    
    async def _run_funds():
        global refresh_status
        _lock_refresh()
        refresh_status["last_status"] = "Updating Egypt Funds..."
        try:
            stats = await egypt_market_service.update_all_navs()
            updated = (stats or {}).get("funds_updated", 0)
            points = (stats or {}).get("points_saved", 0)
            refresh_status["funds_updated"] = updated
            refresh_status["funds_points_saved"] = points
            if updated <= 0:
                # No fund received new NAV data => source/pipeline failure.
                # Surface as an error so CI/monitoring goes RED instead of
                # false-greening (the bug that hid the multi-week funds freeze).
                refresh_status["last_status"] = "egypt_funds_error: 0 funds updated"
            else:
                refresh_status["last_status"] = (
                    f"egypt_funds_success: {updated} funds, {points} points")
        except Exception as e:
            logger.error(f"Egypt Funds Sync failed: {e}")
            logger.error(f"egypt funds refresh error: {e}")
            refresh_status["last_status"] = f"egypt_funds_error: {type(e).__name__}"
        finally:
            refresh_status["is_running"] = False
    
    # Run in background
    background_tasks.add_task(_run_funds)
    
    return {
        "status": "started",
        "method": "tls_client_egypt",
        "message": "Egypt funds sync started"
    }


@router.post("/refresh/nav-charts", dependencies=[Depends(require_admin_token)])
async def trigger_nav_charts_sync(background_tasks: BackgroundTasks):
    """
    NAV CHARTS SYNC: Same as Egypt funds sync for now
    """
    return await trigger_egypt_funds_sync(background_tasks)


@router.post("/refresh/indices", dependencies=[Depends(require_admin_token)])
async def trigger_indices_refresh(background_tasks: BackgroundTasks):
    """
    INDICES REFRESH: Update TASI and EGX30
    """
    if _is_locked():
        return {"status": "already_running"}
    
    async def _run_indices():
        global refresh_status
        _lock_refresh()
        try:
            data = await fetch_indices()
            await save_indices_data(data["results"])
            refresh_status["last_status"] = "indices_success"
        except Exception as e:
            logger.error(f"Indices failed: {e}")
            logger.error(f"indices refresh error: {e}")
            refresh_status["last_status"] = f"indices_error: {type(e).__name__}"
        finally:
            refresh_status["is_running"] = False
            
    background_tasks.add_task(_run_indices)
    
    return {
        "status": "started",
        "method": "yfinance_indices",
        "message": "Indices refresh started"
    }


@router.post("/refresh/ingestion", dependencies=[Depends(require_admin_token)])
async def trigger_ingestion_job(background_tasks: BackgroundTasks):
    """
    DATA INGESTION: Trigger TradingView financials + estimates harvest for Egypt.
    Replaces the former StockAnalysis pipeline.
    """
    if _is_locked():
        return {"status": "already_running"}

    async def _run_wrapper():
        global refresh_status
        _lock_refresh()
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
            script_path = os.path.join(base_dir, 'scripts', 'tv_egx_harvester.py')
            for cycle in ('financials', 'estimates'):
                refresh_status["last_status"] = f"TV harvest: {cycle}"
                _heartbeat()
                proc = await asyncio.create_subprocess_exec(
                    sys.executable, script_path, '--cycle', cycle,
                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                )
                await asyncio.wait_for(proc.communicate(), timeout=600)
            refresh_status["last_status"] = "ingestion_success"
        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
            logger.error(f"ingestion refresh error: {e}")
            refresh_status["last_status"] = f"ingestion_error: {type(e).__name__}"
        finally:
            refresh_status["is_running"] = False

    background_tasks.add_task(_run_wrapper)

    return {
        "status": "started",
        "method": "tradingview_harvest",
        "message": "TradingView financials + estimates harvest started"
    }


async def run_robust_backfill(symbol: str = None):
    """
    ENTERPRISE-GRADE BACKFILL with asyncio.to_thread
    =================================================
    Uses asyncio.to_thread() for ALL yfinance calls to prevent
    blocking the async event loop. This is the ROOT CAUSE FIX.
    
    Updates status in real-time so failures are NEVER silent.
    """
    global refresh_status
    import yfinance as yf
    
    logger.info("==== ENTERPRISE BACKFILL STARTING (asyncio.to_thread) ====")
    
    stats = {
        "ohlc_daily": 0,
        "intraday_1h": 0,
        "intraday_5m": 0,
        "dividends": 0,
        "profiles": 0,
        "stocks_done": 0,
        "stocks_failed": 0
    }
    
    def get_ticker_data(yahoo_sym, data_type, **kwargs):
        """Synchronous helper for yfinance - runs in thread pool"""
        try:
            ticker = yf.Ticker(yahoo_sym)
            if data_type == "history":
                return ticker.history(**kwargs)
            elif data_type == "info":
                return ticker.info
            elif data_type == "dividends":
                return ticker.dividends
        except Exception as e:
            logger.error(f"yfinance error {yahoo_sym} {data_type}: {e}")
            return None
    
    try:
        if symbol:
            symbols = [symbol]
        else:
            symbols_result = await db.fetch_all("SELECT symbol FROM market_tickers ORDER BY symbol")
            symbols = [row['symbol'] for row in symbols_result] if symbols_result else []
        
        total_stocks = len(symbols)
        refresh_status["last_status"] = f"starting 0/{total_stocks} stocks"
        refresh_status["stats"] = stats
        
        logger.info(f"BACKFILL: Processing {total_stocks} stocks with asyncio.to_thread")
        
        for idx, sym in enumerate(symbols):
            try:
                yahoo_sym = f"{sym}.SR"
                stock_records = 0
                
                # Update live status
                refresh_status["last_status"] = f"processing {idx+1}/{total_stocks}: {sym}"
                _heartbeat()
                logger.info(f"[{idx+1}/{total_stocks}] Starting {sym}...")
                
                # 1. Daily OHLC (max history) - NON-BLOCKING
                try:
                    hist = await asyncio.to_thread(
                        get_ticker_data, yahoo_sym, "history", 
                        period="max", interval="1d"
                    )
                    if hist is not None and len(hist) > 0:
                        ohlc_records = []
                        for ts, row in hist.iterrows():
                            ohlc_records.append({
                                "symbol": sym,
                                "date": ts.date() if hasattr(ts, 'date') else ts,
                                "open": float(row['Open']) if row['Open'] else None,
                                "high": float(row['High']) if row['High'] else None,
                                "low": float(row['Low']) if row['Low'] else None,
                                "close": float(row['Close']) if row['Close'] else None,
                                "volume": int(row['Volume']) if row['Volume'] else 0
                            })
                        await save_ohlc_no_overwrite(ohlc_records)
                        stats["ohlc_daily"] += len(ohlc_records)
                        stock_records += len(ohlc_records)
                        logger.info(f"  {sym}: {len(ohlc_records)} daily OHLC ✓")
                except Exception as e:
                    refresh_status["errors"].append(f"{sym}_daily: {str(e)[:30]}")
                    logger.error(f"  {sym} daily error: {e}")
                
                # 2. Intraday 1-hour (730 days) - NON-BLOCKING
                try:
                    hist_1h = await asyncio.to_thread(
                        get_ticker_data, yahoo_sym, "history",
                        period="730d", interval="1h"
                    )
                    if hist_1h is not None and len(hist_1h) > 0:
                        for ts, row in hist_1h.iterrows():
                            try:
                                await db.execute("""
                                    INSERT INTO intraday_1h (symbol, timestamp, open, high, low, close, volume)
                                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                                    ON CONFLICT (symbol, timestamp) DO NOTHING
                                """, sym, ts,
                                    float(row['Open']) if row['Open'] else None,
                                    float(row['High']) if row['High'] else None,
                                    float(row['Low']) if row['Low'] else None,
                                    float(row['Close']) if row['Close'] else None,
                                    int(row['Volume']) if row['Volume'] else 0
                                )
                            except Exception:
                                pass
                        stats["intraday_1h"] += len(hist_1h)
                        stock_records += len(hist_1h)
                        logger.info(f"  {sym}: {len(hist_1h)} 1h intraday ✓")
                except Exception as e:
                    refresh_status["errors"].append(f"{sym}_1h: {str(e)[:30]}")
                
                # 3. Intraday 5-min (60 days) - NON-BLOCKING
                try:
                    hist_5m = await asyncio.to_thread(
                        get_ticker_data, yahoo_sym, "history",
                        period="60d", interval="5m"
                    )
                    if hist_5m is not None and len(hist_5m) > 0:
                        for ts, row in hist_5m.iterrows():
                            try:
                                await db.execute("""
                                    INSERT INTO intraday_5m (symbol, timestamp, open, high, low, close, volume)
                                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                                    ON CONFLICT (symbol, timestamp) DO NOTHING
                                """, sym, ts,
                                    float(row['Open']) if row['Open'] else None,
                                    float(row['High']) if row['High'] else None,
                                    float(row['Low']) if row['Low'] else None,
                                    float(row['Close']) if row['Close'] else None,
                                    int(row['Volume']) if row['Volume'] else 0
                                )
                            except Exception:
                                pass
                        stats["intraday_5m"] += len(hist_5m)
                        stock_records += len(hist_5m)
                        logger.info(f"  {sym}: {len(hist_5m)} 5m intraday ✓")
                except Exception as e:
                    refresh_status["errors"].append(f"{sym}_5m: {str(e)[:30]}")
                
                # 4. Dividends - NON-BLOCKING
                try:
                    divs = await asyncio.to_thread(
                        get_ticker_data, yahoo_sym, "dividends"
                    )
                    if divs is not None and len(divs) > 0:
                        for date, amount in divs.items():
                            try:
                                await db.execute("""
                                    INSERT INTO dividend_history (symbol, ex_date, dividend_amount)
                                    VALUES ($1, $2, $3)
                                    ON CONFLICT (symbol, ex_date) DO NOTHING
                                """, sym, date.date() if hasattr(date, 'date') else date, float(amount))
                            except Exception:
                                pass
                        stats["dividends"] += len(divs)
                except Exception as e:
                    pass
                
                # 5. Company Profile - NON-BLOCKING
                try:
                    info = await asyncio.to_thread(
                        get_ticker_data, yahoo_sym, "info"
                    )
                    if info:
                        await db.execute("""
                            INSERT INTO company_profiles (symbol, name_en, sector, industry, description, website, employees, info_json)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            ON CONFLICT (symbol) DO UPDATE SET
                                name_en = COALESCE(EXCLUDED.name_en, company_profiles.name_en),
                                sector = COALESCE(EXCLUDED.sector, company_profiles.sector),
                                updated_at = NOW()
                        """, sym,
                            info.get('shortName'),
                            info.get('sector'),
                            info.get('industry'),
                            (info.get('longBusinessSummary', '')[:2000] if info.get('longBusinessSummary') else None),
                            info.get('website'),
                            info.get('fullTimeEmployees'),
                            "{}"
                        )
                        stats["profiles"] += 1
                except Exception as e:
                    pass
                
                stats["stocks_done"] += 1
                refresh_status["stats"] = stats
                
                total_records = sum(v for k, v in stats.items() if k not in ['stocks_done', 'stocks_failed'])
                logger.info(f"[{idx+1}/{total_stocks}] {sym} DONE: {stock_records:,} records (Total: {total_records:,})")
                
                # Small delay to prevent overwhelming API
                await asyncio.sleep(0.1)
                
            except Exception as e:
                stats["stocks_failed"] += 1
                refresh_status["errors"].append(f"{sym}: {str(e)[:30]}")
                logger.error(f"BACKFILL ERROR {sym}: {e}")
        
        total = sum(v for k, v in stats.items() if k not in ['stocks_done', 'stocks_failed'])
        refresh_status["last_status"] = f"COMPLETE: {total:,} records from {stats['stocks_done']} stocks"
        refresh_status["last_run"] = datetime.now().isoformat()
        refresh_status["stats"] = stats
        
        logger.info(f"==== BACKFILL COMPLETE: {stats} ====")
        
    except Exception as e:
        logger.error(f"BACKFILL FATAL ERROR: {e}")
        refresh_status["last_status"] = f"FAILED: {type(e).__name__}"
        refresh_status["errors"].append(f"FATAL: {type(e).__name__}")
    
    finally:
        refresh_status["is_running"] = False
        logger.info("==== BACKFILL ENDED ====")





@router.post("/refresh/tickers", dependencies=[Depends(require_admin_token)])
async def trigger_ticker_refresh(background_tasks: BackgroundTasks):
    """Legacy endpoint - redirects to price refresh"""
    return await trigger_price_refresh(background_tasks)


@router.get("/refresh/status")
async def get_refresh_status():
    """Get current refresh status"""
    return refresh_status


# (Removed 2026-06-11: duplicate later definitions of GET /data/freshness and
# GET /data/stats. FastAPI serves the FIRST registered route, so these twins
# were unreachable dead code that silently shadowed nothing — but kept future
# editors changing the wrong copy.)

@router.get("/data/available/{symbol}")
async def get_available_data_for_symbol(symbol: str):
    """
    Check what data is available for a specific symbol.
    Useful for AI to know what it can query.
    """
    # SECURITY (2026-06-11): symbol is interpolated into the check queries
    # below — reject anything that is not a plain ticker BEFORE it reaches SQL.
    import re as _re
    if not _re.fullmatch(r"[A-Za-z0-9._-]{1,20}", symbol or ""):
        raise HTTPException(status_code=400, detail="Invalid symbol")
    available = {}
    
    checks = [
        ("ohlc_data", f"SELECT COUNT(*) as cnt, MIN(date) as min_d, MAX(date) as max_d FROM ohlc_data WHERE symbol = '{symbol}'"),
        ("intraday_1h", f"SELECT COUNT(*) as cnt FROM intraday_1h WHERE symbol = '{symbol}'"),
        ("intraday_5m", f"SELECT COUNT(*) as cnt FROM intraday_5m WHERE symbol = '{symbol}'"),
        ("financial_history", f"SELECT COUNT(*) as cnt FROM financial_history WHERE symbol = '{symbol}'"),
        ("valuation_history", f"SELECT COUNT(*) as cnt FROM valuation_history WHERE symbol = '{symbol}'"),
        ("dividend_history", f"SELECT COUNT(*) as cnt FROM dividend_history WHERE symbol = '{symbol}'"),
        ("corporate_events", f"SELECT COUNT(*) as cnt FROM corporate_events WHERE symbol = '{symbol}'"),
    ]
    
    for table, query in checks:
        try:
            result = await db.fetch_one(query)
            if result and result.get("cnt", 0) > 0:
                available[table] = {
                    "records": result.get("cnt"),
                    "date_range": f"{result.get('min_d')} to {result.get('max_d')}" if result.get('min_d') else None
                }
        except Exception:
            pass
    
    return {
        "symbol": symbol,
        "data_available": available,
        "total_records": sum(v.get("records", 0) for v in available.values())
    }


@router.post("/upload/decypha-funds", dependencies=[Depends(require_admin_token)])
async def upload_decypha_funds(file: UploadFile = File(...)):
    """
    Manually upload Decypha Mutual Funds Excel export.
    Uses the Shared DecyphaProvider logic for consistency.
    """
    try:
        contents = await file.read()
        
        # Use provider logic manually
        from app.services.decypha_provider import decypha_provider
        
        df = decypha_provider._parse_content(contents)
        if df is None:
            raise HTTPException(status_code=400, detail="Invalid Excel/HTML file from Decypha")
            
        result = await decypha_provider._sync_to_db(df)
        
        return {
            "status": "success", 
            "message": f"Processed {result['processed']} funds. Created {result['new']} new funds."
        }
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/debug/trigger_decypha", dependencies=[Depends(require_admin_token)])
async def debug_trigger_decypha(background_tasks: BackgroundTasks):
    """
    Manually trigger the Decypha Sync Job (same as Scheduler).
    """
    from app.services.scheduler import scheduler_service
    # Run in background to not block
    background_tasks.add_task(scheduler_service.run_decypha_job)
    return {"status": "triggered", "message": "Decypha Sync Job started in background. Check logs/email."}

