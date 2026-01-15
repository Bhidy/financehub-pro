#!/usr/bin/env python3
"""
Dividend Ingestion Script - Collects ALL dividend data from StockAnalysis.com
for all EGX stocks with exponential backoff retry logic.
"""

import asyncio
import asyncpg
import httpx
import logging
import argparse
import os
import re
from bs4 import BeautifulSoup
from typing import Dict, Any, List, Optional
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def parse_date(date_str: str) -> Optional[datetime]:
    """Parse a date string into datetime."""
    if not date_str or date_str.strip() in ['-', 'N/A', 'n/a', '—', '']:
        return None
    
    cleaned = date_str.strip()
    
    # Try various formats
    formats = [
        '%b %d, %Y',  # Mar 15, 2024
        '%B %d, %Y',  # March 15, 2024
        '%Y-%m-%d',   # 2024-03-15
        '%m/%d/%Y',   # 03/15/2024
        '%d/%m/%Y',   # 15/03/2024
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    
    return None


def parse_amount(value_str: str) -> Optional[float]:
    """Parse an amount string into a number."""
    if not value_str or value_str.strip() in ['-', 'N/A', 'n/a', '—', '']:
        return None
    
    cleaned = value_str.strip().replace(',', '').replace(' ', '')
    cleaned = re.sub(r'[^\d.\-]', '', cleaned)
    
    try:
        return float(cleaned)
    except ValueError:
        return None


async def fetch_dividend_page(client: httpx.AsyncClient, symbol: str, max_retries: int = 5) -> Optional[BeautifulSoup]:
    """Fetch dividend page with exponential backoff."""
    url = f"https://stockanalysis.com/quote/egx/{symbol.lower()}/dividend/"
    
    base_delay = 30
    
    for attempt in range(max_retries):
        try:
            resp = await client.get(url)
            
            if resp.status_code == 200:
                return BeautifulSoup(resp.text, 'html.parser')
            
            if resp.status_code == 404:
                logger.warning(f"HTTP 404 for {symbol} - Dividend page not found (may not pay dividends)")
                return None
            
            if resp.status_code == 429:
                delay = base_delay * (2 ** attempt)
                logger.warning(f"HTTP 429 for {symbol} - Waiting {delay}s before retry {attempt + 1}/{max_retries}")
                await asyncio.sleep(delay)
                continue
            
            logger.warning(f"HTTP {resp.status_code} for {url}")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                await asyncio.sleep(delay)
                continue
            return None
    
    logger.error(f"Max retries exceeded for {symbol}")
    return None


def extract_dividend_history(soup: BeautifulSoup) -> List[Dict[str, Any]]:
    """Extract dividend history from the page."""
    dividends = []
    
    # Find the dividend history table
    tables = soup.find_all('table')
    
    for table in tables:
        # Look for table with dividend dates
        headers = table.find_all('th')
        header_texts = [h.get_text(strip=True).lower() for h in headers]
        
        # Check if this is the dividend history table
        if any('ex-div' in h or 'ex div' in h or 'date' in h for h in header_texts):
            rows = table.find_all('tr')[1:]  # Skip header
            
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 2:
                    # Extract data based on column positions
                    dividend = {}
                    
                    for i, cell in enumerate(cells):
                        text = cell.get_text(strip=True)
                        
                        if i == 0:  # Ex-Dividend Date
                            dividend['ex_date'] = parse_date(text)
                        elif i == 1:  # Amount
                            dividend['amount'] = parse_amount(text)
                        elif i == 2 and len(cells) > 2:  # Record Date (if present)
                            dividend['record_date'] = parse_date(text)
                        elif i == 3 and len(cells) > 3:  # Pay Date (if present)
                            dividend['pay_date'] = parse_date(text)
                    
                    if dividend.get('ex_date') and dividend.get('amount'):
                        dividends.append(dividend)
    
    return dividends


def extract_dividend_summary(soup: BeautifulSoup) -> Dict[str, Any]:
    """Extract dividend summary metrics."""
    summary = {}
    
    # Look for key metrics in various containers
    # Find divs with financial data
    text_content = soup.get_text()
    
    # Extract dividend yield if present
    yield_match = re.search(r'dividend\s*yield[:\s]*([0-9.]+)%', text_content, re.IGNORECASE)
    if yield_match:
        summary['dividend_yield'] = float(yield_match.group(1)) / 100
    
    # Extract annual dividend
    annual_match = re.search(r'annual\s*dividend[:\s]*([0-9.]+)', text_content, re.IGNORECASE)
    if annual_match:
        summary['annual_dividend'] = float(annual_match.group(1))
    
    # Extract payout ratio
    payout_match = re.search(r'payout\s*ratio[:\s]*([0-9.]+)%', text_content, re.IGNORECASE)
    if payout_match:
        summary['payout_ratio'] = float(payout_match.group(1)) / 100
    
    return summary


async def ingest_symbol(pool: asyncpg.Pool, client: httpx.AsyncClient, symbol: str) -> Dict[str, int]:
    """Ingest dividend data for a single symbol."""
    logger.info(f"Ingesting dividends for {symbol}...")
    
    soup = await fetch_dividend_page(client, symbol)
    if not soup:
        return {'history': 0, 'error': 'fetch_failed'}
    
    # Extract dividend history
    dividends = extract_dividend_history(soup)
    
    if not dividends:
        logger.info(f"  {symbol}: No dividend history found")
        return {'history': 0, 'error': 'no_dividends'}
    
    # Insert dividends into database
    async with pool.acquire() as conn:
        count = 0
        for div in dividends:
            try:
                await conn.execute("""
                    INSERT INTO dividend_history (symbol, ex_date, dividend_amount, record_date, pay_date, currency, updated_at)
                    VALUES ($1, $2, $3, $4, $5, 'EGP', NOW())
                    ON CONFLICT (symbol, ex_date) DO UPDATE SET
                        dividend_amount = EXCLUDED.dividend_amount,
                        record_date = EXCLUDED.record_date,
                        pay_date = EXCLUDED.pay_date,
                        updated_at = NOW()
                """, 
                    symbol,
                    div.get('ex_date'),
                    div.get('amount'),
                    div.get('record_date'),
                    div.get('pay_date')
                )
                count += 1
            except Exception as e:
                logger.error(f"Error inserting dividend for {symbol}: {e}")
    
    logger.info(f"  {symbol}: {count} dividends saved")
    return {'history': count, 'error': None}


async def main():
    parser = argparse.ArgumentParser(description='Ingest dividends from StockAnalysis.com')
    parser.add_argument('--symbol', type=str, help='Single symbol to ingest')
    parser.add_argument('--resume', action='store_true', help='Resume from last completed symbol')
    parser.add_argument('--limit', type=int, help='Limit number of symbols')
    args = parser.parse_args()
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL not set")
        return
    
    pool = await asyncpg.create_pool(database_url, min_size=2, max_size=5, statement_cache_size=0)
    logger.info("Connected to database")
    
    # Ensure unique constraint exists
    async with pool.acquire() as conn:
        try:
            await conn.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_dividend_history_unique 
                ON dividend_history(symbol, ex_date)
            """)
        except Exception as e:
            logger.warning(f"Index creation: {e}")
    
    async with httpx.AsyncClient(
        timeout=30.0,
        follow_redirects=True,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    ) as client:
        
        if args.symbol:
            result = await ingest_symbol(pool, client, args.symbol)
            print(f"\n{args.symbol} ingestion complete: {result}")
        else:
            # All symbols mode
            async with pool.acquire() as conn:
                symbols = await conn.fetch("""
                    SELECT symbol FROM market_tickers 
                    WHERE market_code = 'EGX' 
                    ORDER BY symbol
                """)
            
            symbols = [r['symbol'] for r in symbols]
            if args.limit:
                symbols = symbols[:args.limit]
            
            logger.info(f"Processing {len(symbols)} symbols")
            
            with_dividends = 0
            no_dividends = 0
            failed = 0
            
            for i, symbol in enumerate(symbols, 1):
                try:
                    result = await ingest_symbol(pool, client, symbol)
                    if result['history'] > 0:
                        with_dividends += 1
                    elif result['error'] == 'no_dividends':
                        no_dividends += 1
                    else:
                        failed += 1
                except Exception as e:
                    logger.error(f"Error with {symbol}: {e}")
                    failed += 1
                
                # Progress update every 20 symbols
                if i % 20 == 0:
                    logger.info(f"Progress: {i}/{len(symbols)}")
                
                # Delay between symbols
                await asyncio.sleep(1.5)
            
            print(f"\n{'='*60}")
            print(f"DIVIDEND INGESTION COMPLETE")
            print(f"{'='*60}")
            print(f"Total: {len(symbols)}")
            print(f"With Dividends: {with_dividends}")
            print(f"No Dividends: {no_dividends}")
            print(f"Failed: {failed}")
    
    await pool.close()


if __name__ == '__main__':
    asyncio.run(main())
