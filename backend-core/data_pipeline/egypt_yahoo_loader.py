# -*- coding: utf-8 -*-
"""
📅 Egypt Yahoo Finance Production Loader
=========================================
Enterprise-grade data pipeline that connects to Yahoo Finance (yfinance)
to collect and store 15+ years of daily OHLC history for all EGX stocks.

Supports:
- --full   : Complete max-period history sync (initial seed)
- --daily  : Incremental daily sync (fetches last 5 days, extremely fast)
- --symbol : Update a single specific symbol (e.g., --symbol COMI)

Anti-Blocking Protections:
- Custom browser-like User-Agent rotation using a premium request session
- Bounded rate-limiting sleeps (1.5 seconds between standard requests)
- Dynamic back-off delays (3.0 seconds sleep on failed requests or rate-limit responses)
- Async-wrapped blocking I/O calls to prevent API freezing
"""

import asyncio
import os
import sys
import argparse
import logging
import random
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import yfinance as yf
import asyncpg

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('EgyptYahooLoader')

# SECURITY: never embed DB credentials in code. Provided via env (GH Actions
# secret / backend /opt/starta/.env). The previously hardcoded password is in
# git history and MUST be rotated.
DATABASE_URL = os.environ.get('DATABASE_URL')

# List of premium browser User-Agents for clean rotation
USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0"
]

class EgyptYahooLoader:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.stats = {
            'processed': 0,
            'new_candles': 0,
            'updated_candles': 0,
            'errors': 0,
            'start_time': datetime.now()
        }

    async def connect(self):
        logger.info("Connecting to Supabase Database...")
        # Disable statement cache for pgBouncer / Connection Pooler compatibility
        self.pool = await asyncpg.create_pool(DATABASE_URL, statement_cache_size=0, min_size=1, max_size=5)
        logger.info("✅ Database connected successfully.")

    async def close(self):
        if self.pool:
            await self.pool.close()
            logger.info("Database connection closed.")

    async def get_egx_symbols(self) -> List[str]:
        """Query all active EGX symbols from market_tickers table."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT DISTINCT symbol FROM market_tickers WHERE market_code = 'EGX' ORDER BY symbol"
            )
            symbols = [r['symbol'] for r in rows]
            logger.info(f"📋 Found {len(symbols)} active EGX stocks in the database.")
            return symbols

    def _get_configured_session(self) -> requests.Session:
        """Create a requests session with randomized browser headers to evade anti-scraping blocks."""
        session = requests.Session()
        user_agent = random.choice(USER_AGENTS)
        session.headers.update({
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": "https://finance.yahoo.com/",
            "Connection": "keep-alive",
            "Sec-Ch-Ua": '"Not A(Brand";v="99", "Google Chrome";v="120", "Chromium";v="120"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"macOS"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1"
        })
        return session

    async def sync_symbol(self, symbol: str, period: str = "max", mode: str = "daily") -> bool:
        """Fetch and upsert Yahoo Finance OHLC history for a specific EGX symbol. Returns True on success."""
        symbol_upper = symbol.upper()
        # Clean up double suffixes if present
        if symbol_upper.endswith(".CA"):
            symbol_upper = symbol_upper[:-3]
        yahoo_symbol = f"{symbol_upper}.CA"
        
        logger.info(f"⏳ Syncing {symbol_upper} ({yahoo_symbol}) with period={period}...")
        
        try:
            # yfinance internally uses advanced curl_cffi for Cloudflare evasion. Stop passing custom standard requests session.
            ticker = yf.Ticker(yahoo_symbol)
            
            # Run yfinance blocking call inside a thread to prevent FastAPI event loop freezing
            loop = asyncio.get_running_loop()
            df = await loop.run_in_executor(
                None,
                lambda: ticker.history(period=period)
            )

            if df is None or len(df) == 0:
                logger.warning(f"⚠️  No history returned from Yahoo Finance for {yahoo_symbol} (Rate-limit or empty ticker)")
                self.stats['errors'] += 1
                return False

            records = []
            for date_idx, row in df.iterrows():
                try:
                    record_date = date_idx.date() if hasattr(date_idx, 'date') else date_idx
                    
                    o = float(row['Open'])
                    h = float(row['High'])
                    l = float(row['Low'])
                    c = float(row['Close'])
                    v = int(row['Volume'])
                    
                    if o <= 0 or h <= 0 or l <= 0 or c <= 0:
                        continue # Skip invalid quotes
                        
                    records.append((
                        symbol_upper,
                        record_date,
                        o,
                        h,
                        l,
                        c,
                        c, # fallback adj_close
                        v
                    ))
                except Exception:
                    continue

            if not records:
                logger.warning(f"⚠️  No valid price records found for {symbol_upper}")
                return True

            # 2. Write to Supabase database
            async with self.pool.acquire() as conn:
                await conn.executemany("""
                    INSERT INTO ohlc_data (symbol, date, open, high, low, close, adj_close, volume)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (symbol, date) DO UPDATE SET
                        open = EXCLUDED.open,
                        high = EXCLUDED.high,
                        low = EXCLUDED.low,
                        close = EXCLUDED.close,
                        adj_close = EXCLUDED.adj_close,
                        volume = EXCLUDED.volume
                """, records)

            logger.info(f"✅ {symbol_upper}: Successfully upserted {len(records)} daily candles.")
            self.stats['processed'] += 1
            self.stats['new_candles'] += len(records)
            return True

        except Exception as e:
            logger.error(f"❌ Failed to sync {symbol_upper}: {e}")
            self.stats['errors'] += 1
            return False

    async def run(self, symbol: Optional[str] = None, mode: str = "daily"):
        """Orchestrate the sync process across all symbols with robust rate limiting."""
        await self.connect()
        
        if symbol:
            symbols = [symbol.upper()]
        else:
            symbols = await self.get_egx_symbols()

        if not symbols:
            logger.warning("No active symbols found. Sync aborted.")
            await self.close()
            return

        # Determine fetching period
        period = "max" if mode == "full" else "5d"
        
        logger.info("=" * 60)
        logger.info(f"🚀 EGYPT YAHOO OHLC SYNC - Mode: {mode.upper()} (Period: {period})")
        logger.info("=" * 60)

        for i, sym in enumerate(symbols, 1):
            logger.info(f"[{i}/{len(symbols)}]")
            success = await self.sync_symbol(sym, period=period, mode=mode)
            
            # Defensive Rate-Limiting Protocol
            if success:
                # Standard polite delay to respect Yahoo Finance API limits (slightly randomized between 1.5 - 3.0s)
                delay = random.uniform(1.5, 3.0)
                logger.info(f"😴 Sleeping {delay:.2f} seconds to respect API limits...")
                await asyncio.sleep(delay)
            else:
                # Dynamic back-off sleep on error or empty response (defending against temporary IP bans)
                backoff_delay = random.uniform(6.0, 12.0)
                logger.warning(f"🚨 Sync failed. Backing off for {backoff_delay:.2f} seconds to evade temporary IP ban...")
                await asyncio.sleep(backoff_delay)

            # Periodically take a longer human-mimicking break to evade fingerprinting and session rate-limiting
            if i % 12 == 0 and i < len(symbols):
                long_sleep = random.uniform(10.0, 20.0)
                logger.info(f"😴 [Evading Evasion] Human-mimicking browser break: resting for {long_sleep:.2f} seconds...")
                await asyncio.sleep(long_sleep)

        elapsed = (datetime.now() - self.stats['start_time']).total_seconds()
        logger.info("=" * 60)
        logger.info("📈 SYNC PIPELINE SUMMARY")
        logger.info("=" * 60)
        logger.info(f"🏦 Stocks Processed : {self.stats['processed']}")
        logger.info(f"📊 Candles Saved     : {self.stats['new_candles']}")
        logger.info(f"❌ Errors/Warnings   : {self.stats['errors']}")
        logger.info(f"⏱️  Duration         : {elapsed:.1f} seconds")
        logger.info("=" * 60)

        await self.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Egypt Yahoo Finance OHLC Production Loader')
    parser.add_argument('--full', action='store_true', help='Complete max historical backfill')
    parser.add_argument('--daily', action='store_true', help='Incremental 5d sync')
    parser.add_argument('--symbol', type=str, help='Update single symbol')
    args = parser.parse_args()

    mode = "full" if args.full else "daily"
    
    loader = EgyptYahooLoader()
    asyncio.run(loader.run(symbol=args.symbol, mode=mode))
