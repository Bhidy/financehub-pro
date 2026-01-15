#!/usr/bin/env python3
"""
Statistics Ingestion Script - Collects ALL statistics data from StockAnalysis.com
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
from typing import Dict, Any, Optional
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Field mapping from page labels to database columns
FIELD_MAPPING = {
    # Stock Price Statistics
    'Beta (5Y)': 'beta_5y',
    'Beta': 'beta_5y',
    '52-Week Price Change': 'price_change_52w',
    '50-Day MA': 'ma_50d',
    '50-Day Moving Average': 'ma_50d',
    '200-Day MA': 'ma_200d',
    '200-Day Moving Average': 'ma_200d',
    'RSI': 'rsi_14',
    'RSI (14)': 'rsi_14',
    'Avg Volume (20D)': 'avg_volume_20d',
    'Average Volume (20 Days)': 'avg_volume_20d',
    
    # Valuation Ratios
    'PE Ratio': 'pe_ratio',
    'P/E Ratio': 'pe_ratio',
    'Forward PE': 'forward_pe',
    'PS Ratio': 'ps_ratio',
    'P/S Ratio': 'ps_ratio',
    'PB Ratio': 'pb_ratio',
    'P/B Ratio': 'pb_ratio',
    'P/TBV Ratio': 'p_tbv',
    'P/FCF Ratio': 'p_fcf',
    'P/OCF Ratio': 'p_ocf',
    'PEG Ratio': 'peg_ratio',
    
    # Enterprise Valuation
    'Enterprise Value': 'enterprise_value',
    'EV / Earnings': 'ev_earnings',
    'EV / Sales': 'ev_sales',
    'EV / EBITDA': 'ev_ebitda',
    'EV / EBIT': 'ev_ebit',
    'EV / FCF': 'ev_fcf',
    
    # Financial Position
    'Current Ratio': 'current_ratio',
    'Quick Ratio': 'quick_ratio',
    'Debt / Equity': 'debt_equity',
    'Debt/Equity': 'debt_equity',
    'Debt / EBITDA': 'debt_ebitda',
    'Debt / FCF': 'debt_fcf',
    'Interest Coverage': 'interest_coverage',
    
    # Financial Efficiency
    'Return on Equity (ROE)': 'roe',
    'ROE': 'roe',
    'Return on Assets (ROA)': 'roa',
    'ROA': 'roa',
    'Return on Invested Capital (ROIC)': 'roic',
    'ROIC': 'roic',
    'Return on Capital Employed (ROCE)': 'roce', 
    'ROCE': 'roce',
    'Asset Turnover': 'asset_turnover',
    'Inventory Turnover': 'inventory_turnover',
    
    # Margins
    'Gross Margin': 'gross_margin',
    'Operating Margin': 'operating_margin',
    'Pretax Margin': 'pretax_margin',
    'Profit Margin': 'profit_margin',
    'Net Margin': 'profit_margin',
    'EBITDA Margin': 'ebitda_margin',
    'FCF Margin': 'fcf_margin',
    
    # Share Statistics
    'Shares Outstanding': 'shares_outstanding',
    'Float': 'float_shares',
    'Owned by Insiders (%)': 'insider_ownership',
    'Insider Ownership': 'insider_ownership',
    'Owned by Institutions (%)': 'institutional_ownership',
    'Institutional Ownership': 'institutional_ownership',
    
    # Dividends & Yields
    'Dividend Per Share': 'dps',
    'Dividend Yield': 'dividend_yield',
    'Div Yield': 'dividend_yield',
    'Payout Ratio': 'payout_ratio',
    'Earnings Yield': 'earnings_yield',
    'FCF Yield': 'fcf_yield',
    
    # Income Statement TTM
    'Revenue': 'revenue_ttm',
    'Net Income': 'net_income_ttm',
    'EBITDA': 'ebitda_ttm',
    'EPS (Diluted)': 'eps_ttm',
    'Earnings Per Share (EPS)': 'eps_ttm',
    
    # Balance Sheet
    'Cash & Cash Equivalents': 'cash_ttm',
    'Cash & Equivalents': 'cash_ttm',
    'Total Debt': 'total_debt',
    'Net Cash': 'net_cash',
    'Book Value': 'book_value',
    'Equity (Book Value)': 'book_value',
    'Book Value Per Share': 'bvps',
    'Working Capital': 'working_capital',
    
    # Cash Flow
    'Operating Cash Flow': 'ocf_ttm',
    'Free Cash Flow': 'fcf_ttm',
    'FCF Per Share': 'fcf_per_share',
    
    # Taxes
    'Effective Tax Rate': 'effective_tax_rate',
    
    # Scores
    'Altman Z-Score': 'altman_z_score',
    'Piotroski F-Score': 'piotroski_f_score',
}


def parse_value(value_str: str, field_name: str = '') -> Optional[float]:
    """Parse a value string into a number."""
    if not value_str or value_str.strip() in ['-', 'N/A', 'n/a', '—', '', 'Upgrade', 'n/a']:
        return None
    
    cleaned = value_str.strip().replace(',', '').replace(' ', '')
    
    # Handle percentages
    is_percent = '%' in cleaned
    cleaned = cleaned.replace('%', '')
    
    # Handle B (billions) and M (millions)
    multiplier = 1
    if cleaned.endswith('B'):
        multiplier = 1_000_000_000
        cleaned = cleaned[:-1]
    elif cleaned.endswith('M'):
        multiplier = 1_000_000
        cleaned = cleaned[:-1]
    elif cleaned.endswith('K'):
        multiplier = 1_000
        cleaned = cleaned[:-1]
    
    # Handle parentheses for negatives
    if cleaned.startswith('(') and cleaned.endswith(')'):
        cleaned = '-' + cleaned[1:-1]
    
    try:
        value = float(cleaned) * multiplier
        if is_percent:
            value = value / 100
        return value
    except ValueError:
        return None


async def fetch_statistics_page(client: httpx.AsyncClient, symbol: str, max_retries: int = 5) -> Optional[BeautifulSoup]:
    """Fetch statistics page with exponential backoff."""
    url = f"https://stockanalysis.com/quote/egx/{symbol.lower()}/statistics/"
    
    base_delay = 30  # Start with 30 seconds
    
    for attempt in range(max_retries):
        try:
            resp = await client.get(url)
            
            if resp.status_code == 200:
                return BeautifulSoup(resp.text, 'html.parser')
            
            if resp.status_code == 404:
                logger.warning(f"HTTP 404 for {symbol} - Statistics page not found")
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


def extract_statistics(soup: BeautifulSoup) -> Dict[str, Any]:
    """Extract all statistics from the page."""
    stats = {}
    
    # Find all tables on the page (statistics are in tables)
    tables = soup.find_all('table')
    
    for table in tables:
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 2:
                label = cells[0].get_text(strip=True)
                value = cells[-1].get_text(strip=True)
                
                # Map to database column
                if label in FIELD_MAPPING:
                    col_name = FIELD_MAPPING[label]
                    parsed_value = parse_value(value, label)
                    if parsed_value is not None:
                        stats[col_name] = parsed_value
    
    # Also check for div-based layouts (flex containers)
    flex_divs = soup.find_all('div', class_=lambda x: x and 'flex' in x and 'justify-between' in x)
    for div in flex_divs:
        spans = div.find_all('span')
        if len(spans) >= 2:
            label = spans[0].get_text(strip=True)
            value = spans[-1].get_text(strip=True)
            
            if label in FIELD_MAPPING:
                col_name = FIELD_MAPPING[label]
                parsed_value = parse_value(value, label)
                if parsed_value is not None:
                    stats[col_name] = parsed_value
    
    return stats


async def ingest_symbol(pool: asyncpg.Pool, client: httpx.AsyncClient, symbol: str) -> Dict[str, int]:
    """Ingest statistics for a single symbol."""
    logger.info(f"Ingesting statistics for {symbol}...")
    
    soup = await fetch_statistics_page(client, symbol)
    if not soup:
        return {'fields': 0, 'error': 'fetch_failed'}
    
    stats = extract_statistics(soup)
    
    if not stats:
        logger.warning(f"No statistics found for {symbol}")
        return {'fields': 0, 'error': 'no_data'}
    
    # Build upsert query
    columns = ['symbol', 'market_code', 'updated_at'] + list(stats.keys())
    values = [symbol, 'EGX', datetime.now()] + list(stats.values())
    placeholders = ', '.join([f'${i+1}' for i in range(len(values))])
    
    update_set = ', '.join([f'{col} = EXCLUDED.{col}' for col in stats.keys()])
    
    query = f"""
        INSERT INTO stock_statistics ({', '.join(columns)})
        VALUES ({placeholders})
        ON CONFLICT (symbol, market_code)
        DO UPDATE SET {update_set}, updated_at = EXCLUDED.updated_at
    """
    
    async with pool.acquire() as conn:
        await conn.execute(query, *values)
    
    logger.info(f"  {symbol}: {len(stats)} fields saved")
    return {'fields': len(stats), 'error': None}


async def main():
    parser = argparse.ArgumentParser(description='Ingest statistics from StockAnalysis.com')
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
    
    async with httpx.AsyncClient(
        timeout=30.0,
        follow_redirects=True,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    ) as client:
        
        if args.symbol:
            # Single symbol mode
            result = await ingest_symbol(pool, client, args.symbol)
            print(f"\n{args.symbol} ingestion complete: {result}")
        else:
            # All symbols mode
            async with pool.acquire() as conn:
                if args.resume:
                    # Get symbols not yet in stock_statistics
                    symbols = await conn.fetch("""
                        SELECT mt.symbol FROM market_tickers mt
                        WHERE mt.market_code = 'EGX'
                        AND NOT EXISTS (
                            SELECT 1 FROM stock_statistics ss 
                            WHERE ss.symbol = mt.symbol
                        )
                        ORDER BY mt.symbol
                    """)
                else:
                    symbols = await conn.fetch("""
                        SELECT symbol FROM market_tickers 
                        WHERE market_code = 'EGX' 
                        ORDER BY symbol
                    """)
            
            symbols = [r['symbol'] for r in symbols]
            if args.limit:
                symbols = symbols[:args.limit]
            
            logger.info(f"Processing {len(symbols)} symbols")
            
            success = 0
            failed = 0
            
            for i, symbol in enumerate(symbols, 1):
                try:
                    result = await ingest_symbol(pool, client, symbol)
                    if result['fields'] > 0:
                        success += 1
                    else:
                        failed += 1
                except Exception as e:
                    logger.error(f"Error with {symbol}: {e}")
                    failed += 1
                
                # Progress update every 10 symbols
                if i % 10 == 0:
                    logger.info(f"Progress: {i}/{len(symbols)} ({success} success, {failed} failed)")
                
                # Delay between symbols to avoid rate limiting
                await asyncio.sleep(2)
            
            print(f"\n{'='*60}")
            print(f"INGESTION COMPLETE")
            print(f"{'='*60}")
            print(f"Total: {len(symbols)}")
            print(f"Success: {success}")
            print(f"Failed: {failed}")
    
    await pool.close()


if __name__ == '__main__':
    asyncio.run(main())
