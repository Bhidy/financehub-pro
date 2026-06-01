# -*- coding: utf-8 -*-
"""
🕵️ Egypt Yahoo Daily Chart Deep Auditor & Self-Healer
=====================================================
Enterprise-grade diagnostic tool that audits daily chart records for all 
EGX stocks in Supabase, identifies data gaps, missing tickers, or truncated histories, 
and dynamically backfills them with yfinance using advanced anti-blocking evasions.
"""

import asyncio
import os
import sys
import logging
import random
from datetime import datetime, date, timedelta
from typing import List, Dict, Tuple, Optional
import requests
import yfinance as yf
import asyncpg

# Config logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger('ChartAuditor')

DATABASE_URL = os.environ.get(
    'DATABASE_URL', 
    'postgres://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require'
)

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0"
]

class ChartAuditor:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.tickers_summary = []
        self.stats = {
            'total_tickers': 0,
            'fully_healthy': 0,
            'missing_data': 0,
            'short_history': 0,
            'healed_tickers': 0,
            'upserted_candles': 0
        }

    async def connect(self):
        logger.info("Connecting to Database...")
        self.pool = await asyncpg.create_pool(DATABASE_URL, statement_cache_size=0, min_size=1, max_size=5)
        logger.info("✅ Database connected.")

    async def close(self):
        if self.pool:
            await self.pool.close()
            logger.info("Database connection closed.")

    def _get_configured_session(self) -> requests.Session:
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

    async def get_egx_symbols(self) -> List[str]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT DISTINCT symbol FROM market_tickers WHERE market_code = 'EGX' ORDER BY symbol"
            )
            return [r['symbol'] for r in rows]

    async def heal_symbol(self, symbol: str) -> int:
        """Dynamic healer that pulls max history from Yahoo Finance and upserts missing candles."""
        symbol_upper = symbol.upper()
        # Clean up double suffixes if present
        if symbol_upper.endswith(".CA"):
            symbol_upper = symbol_upper[:-3]
        yahoo_symbol = f"{symbol_upper}.CA"
        logger.info(f"🏥 [Self-Healing] Backfilling full history for {symbol_upper} ({yahoo_symbol})...")
        
        try:
            # yfinance internally uses advanced curl_cffi for Cloudflare evasion. Stop passing custom standard requests session.
            ticker = yf.Ticker(yahoo_symbol)
            
            loop = asyncio.get_running_loop()
            df = await loop.run_in_executor(
                None,
                lambda: ticker.history(period="max")
            )

            if df is None or len(df) == 0:
                logger.warning(f"⚠️  Yahoo returned zero quotes for {yahoo_symbol} (possibly delisted or restricted)")
                return 0

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
                        continue
                        
                    records.append((
                        symbol_upper,
                        record_date,
                        o,
                        h,
                        l,
                        c,
                        c,
                        v
                    ))
                except Exception:
                    continue

            if not records:
                return 0

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

            logger.info(f"✅ [Healed] Upserted {len(records)} candles for {symbol_upper}.")
            return len(records)

        except Exception as e:
            logger.error(f"❌ Failed to heal {symbol_upper}: {e}")
            return 0

    async def audit(self):
        await self.connect()
        symbols = await self.get_egx_symbols()
        self.stats['total_tickers'] = len(symbols)
        
        logger.info(f"📊 Auditing {len(symbols)} EGX tickers...")
        
        for i, sym in enumerate(symbols, 1):
            async with self.pool.acquire() as conn:
                # Query db status for this symbol
                row = await conn.fetchrow("""
                    SELECT 
                        COUNT(*)::integer as total_count,
                        MIN(date) as min_date,
                        MAX(date) as max_date
                    FROM ohlc_data 
                    WHERE symbol = $1
                """, sym.upper())
                
                total_count = row['total_count']
                min_date = row['min_date']
                max_date = row['max_date']

                status = "HEALTHY"
                notes = ""

                # Diagnostic checks
                if total_count == 0:
                    status = "MISSING_DATA"
                    self.stats['missing_data'] += 1
                    notes = "Has absolutely 0 records in database."
                elif total_count < 1000:
                    status = "SHORT_HISTORY"
                    self.stats['short_history'] += 1
                    notes = f"Truncated history: only {total_count} days of data starting from {min_date}."
                else:
                    self.stats['fully_healthy'] += 1
                    notes = f"Excellent: {total_count} candles starting from {min_date} to {max_date}."

                self.tickers_summary.append({
                    'symbol': sym,
                    'count': total_count,
                    'start_date': min_date,
                    'end_date': max_date,
                    'status': status,
                    'notes': notes
                })

                logger.info(f"[{i}/{len(symbols)}] {sym.upper()}: count={total_count}, status={status}")

                # Self-healing trigger for missing or truncated stock histories
                if status in ("MISSING_DATA", "SHORT_HISTORY"):
                    healed_candles = await self.heal_symbol(sym)
                    if healed_candles > 0:
                        self.stats['healed_tickers'] += 1
                        self.stats['upserted_candles'] += healed_candles
                        
                        # Re-verify and update summary
                        row_new = await conn.fetchrow("""
                            SELECT 
                                COUNT(*)::integer as total_count,
                                MIN(date) as min_date,
                                MAX(date) as max_date
                            FROM ohlc_data 
                            WHERE symbol = $1
                        """, sym.upper())
                        
                        idx = len(self.tickers_summary) - 1
                        self.tickers_summary[idx].update({
                            'count': row_new['total_count'],
                            'start_date': row_new['min_date'],
                            'end_date': row_new['max_date'],
                            'status': "HEALED",
                            'notes': f"Successfully self-healed! Backfilled history to {row_new['min_date']} ({row_new['total_count']} candles)."
                        })
                    
                    # Evade rate limits with a small sleep on healer fetches
                    delay = random.uniform(1.5, 3.5)
                    await asyncio.sleep(delay)

        # Generate markdown report
        await self.generate_report()
        await self.close()

    async def generate_report(self):
        report_path = "/Users/home/Documents/startamarkets/docs/CHART_DATA_AUDIT_REPORT.md"
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        
        with open(report_path, "w", encoding="utf-8") as f:
            f.write("# 🕵️ Deep Chart Data Integrity Audit & Self-Healing Report\n\n")
            f.write(f"Generated at: `{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`\n\n")
            
            f.write("## 📈 Diagnostic Summary\n\n")
            f.write("| Diagnostic Metric | Value |\n")
            f.write("| --- | --- |\n")
            f.write(f"| **Total EGX Stocks Audited** | {self.stats['total_tickers']} |\n")
            f.write(f"| **Healthy Histories (>1000 candles)** | {self.stats['fully_healthy']} |\n")
            f.write(f"| **Stocks with Missing Data (Prior to Audit)** | {self.stats['missing_data']} |\n")
            f.write(f"| **Stocks with Short/Truncated Histories** | {self.stats['short_history']} |\n")
            f.write(f"| **Successfully Self-Healed & Backfilled** | {self.stats['healed_tickers']} |\n")
            f.write(f"| **Total Historical Candles Upserted** | {self.stats['upserted_candles']:,} |\n\n")
            
            f.write("## 🏥 Self-Healing Execution Log\n\n")
            f.write("| Ticker | Count | Start Date | End Date | Status | Diagnosis & Healing Notes |\n")
            f.write("| --- | --- | --- | --- | --- | --- |\n")
            
            for t in self.tickers_summary:
                f.write(f"| **{t['symbol']}** | {t['count']} | {t['start_date']} | {t['end_date']} | `{t['status']}` | {t['notes']} |\n")
                
        logger.info(f"✨ Deep Audit complete. Report saved to: {report_path}")

if __name__ == "__main__":
    auditor = ChartAuditor()
    asyncio.run(auditor.audit())
