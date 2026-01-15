#!/usr/bin/env python3
"""
StockAnalysis Complete Ingester
Ingests all financial data from StockAnalysis.com for EGX stocks.

Usage:
    python ingest_stockanalysis.py [--symbol SYMBOL] [--limit N]
"""

import asyncio
import asyncpg
import httpx
from bs4 import BeautifulSoup
import re
import os
import sys
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================
# Field Mappings from StockAnalysis to Database
# ============================================================

INCOME_MAPPING = {
    "Interest Income on Loans": "interest_income_loans",
    "Interest Income on Investments": "interest_income_investments",
    "Total Interest Income": "total_interest_income",
    "Interest Paid on Deposits": "interest_expense",
    "Net Interest Income": "net_interest_income",
    "Net Interest Income Growth (YoY)": "net_interest_income_growth",
    "Income From Trading Activities": "trading_income",
    "Fee and Commission Income": "fee_income",
    "Gain (Loss) on Sale of Assets": "gain_loss_assets",
    "Gain (Loss) on Sale of Investments": "gain_loss_investments",
    "Other Non-Interest Income": "other_noninterest_income",
    "Total Non-Interest Income": "total_noninterest_income",
    "Revenue": "revenue",
    "Revenue Growth (YoY)": "revenue_growth",
    "Cost of Revenue": "cost_of_revenue",
    "Gross Profit": "gross_profit",
    "Gross Margin": "gross_margin",
    "Operating Expenses": "operating_expenses",
    "Research and Development": "rd_expense",
    "Selling, General & Admin": "sga_expense",
    "Depreciation & Amortization": "depreciation",
    "Provision for Credit Losses": "provision_credit_losses",
    "Operating Income": "operating_income",
    "Operating Margin": "operating_margin",
    "Pretax Income": "pretax_income",
    "Income Tax Expense": "income_tax",
    "Effective Tax Rate": "effective_tax_rate",
    "Net Income": "net_income",
    "Net Income Growth (YoY)": "net_income_growth",
    "Profit Margin": "net_margin",
    "EPS (Basic)": "eps",
    "EPS (Diluted)": "eps_diluted",
}

BALANCE_MAPPING = {
    "Cash & Equivalents": "cash_equivalents",
    "Short-Term Investments": "short_term_investments",
    "Accounts Receivable": "accounts_receivable",
    "Inventory": "inventory",
    "Total Current Assets": "total_current_assets",
    "Investment Securities": "investment_securities",
    "Trading Asset Securities": "trading_assets",
    "Total Investments": "total_investments",
    "Gross Loans": "gross_loans",
    "Allowance for Loan Losses": "allowance_loan_losses",
    "Net Loans": "net_loans",
    "Property, Plant & Equipment": "property_plant_equipment",
    "Goodwill": "goodwill",
    "Intangible Assets": "intangible_assets",
    "Total Assets": "total_assets",
    "Deposits": "deposits",
    "Short-Term Debt": "short_term_debt",
    "Long-Term Debt": "long_term_debt",
    "Total Current Liabilities": "total_current_liabilities",
    "Total Liabilities": "total_liabilities",
    "Common Stock": "common_stock",
    "Retained Earnings": "retained_earnings",
    "Total Stockholders' Equity": "total_equity",
    "Total Equity": "total_equity",
}

CASHFLOW_MAPPING = {
    "Net Income": "net_income",
    "Depreciation & Amortization": "depreciation_amortization",
    "Stock-Based Compensation": "stock_based_compensation",
    "Deferred Income Taxes": "deferred_taxes",
    "Gain (Loss) on Sale of Assets": "gain_loss_assets",
    "Gain (Loss) on Sale of Investments": "gain_loss_investments",
    "Provision for Credit Losses": "provision_credit_losses",
    "Change in Receivables": "change_in_receivables",
    "Change in Inventory": "change_in_inventory",
    "Change in Payables": "change_in_payables",
    "Other Operating Activities": "other_operating_activities",
    "Cash from Operating Activities": "cash_from_operating",
    "Operating Cash Flow": "cash_from_operating",
    "Capital Expenditures": "capex",
    "Acquisitions": "acquisitions",
    "Purchases of Investments": "investment_purchases",
    "Sales of Investments": "investment_sales",
    "Cash from Investing Activities": "cash_from_investing",
    "Dividends Paid": "dividends_paid",
    "Share Repurchases": "share_repurchases",
    "Debt Issued": "debt_issued",
    "Debt Repaid": "debt_repaid",
    "Cash from Financing Activities": "cash_from_financing",
    "Net Change in Cash": "net_change_cash",
    "Free Cash Flow": "free_cashflow",
}

RATIOS_MAPPING = {
    "Market Capitalization": "market_cap",
    "Market Cap Growth": "market_cap_growth",
    "Last Close Price": "last_close_price",
    "PE Ratio": "pe_ratio",
    "Forward PE": "pe_forward",
    "PEG Ratio": "peg_ratio",
    "PS Ratio": "ps_ratio",
    "PB Ratio": "pb_ratio",
    "P/TBV Ratio": "ptbv_ratio",
    "P/FCF Ratio": "pfcf_ratio",
    "P/OCF Ratio": "pocf_ratio",
    "EV/EBITDA": "ev_ebitda",
    "Debt / Equity Ratio": "debt_equity",
    "Debt / Assets": "debt_assets",
    "Return on Equity (ROE)": "roe",
    "Return on Assets (ROA)": "roa",
    "Return on Capital (ROIC)": "roic",
    "Gross Margin": "gross_margin",
    "Operating Margin": "operating_margin",
    "Profit Margin": "net_margin",
    "Dividend Yield": "dividend_yield",
    "Payout Ratio": "payout_ratio",
}


def parse_value(value_str: str) -> Optional[float]:
    """Parse numeric value from string."""
    if not value_str or value_str in ['-', 'N/A', 'n/a', '—', '', 'Upgrade']:
        return None
    
    cleaned = value_str.replace(',', '').replace(' ', '').strip()
    
    # Handle percentages
    is_percent = '%' in cleaned
    cleaned = cleaned.replace('%', '')
    
    # Handle parentheses for negatives
    if cleaned.startswith('(') and cleaned.endswith(')'):
        cleaned = '-' + cleaned[1:-1]
    
    try:
        value = float(cleaned)
        if is_percent:
            value = value / 100
        return value
    except ValueError:
        return None


def parse_year(header: str) -> Optional[int]:
    """Extract fiscal year from header."""
    match = re.search(r'(?:FY\s*)?(\d{4})', header)
    if match:
        year = int(match.group(1))
        # Skip years before 2015 (often grouped)
        if year >= 2015:
            return year
    return None


async def fetch_page(client: httpx.AsyncClient, symbol: str, path: str, max_retries: int = 5) -> Optional[BeautifulSoup]:
    """Fetch and parse a StockAnalysis page with exponential backoff retry."""
    url = f"https://stockanalysis.com/quote/egx/{symbol.lower()}{path}"
    
    base_delay = 30  # Start with 30 seconds
    
    for attempt in range(max_retries):
        try:
            resp = await client.get(url)
            
            # Success
            if resp.status_code == 200:
                return BeautifulSoup(resp.text, 'html.parser')
            
            # Not found - symbol doesn't exist on StockAnalysis
            if resp.status_code == 404:
                logger.warning(f"HTTP 404 (Not Found) for {url} - Symbol may not exist on StockAnalysis")
                return None
            
            # Rate limited - retry with exponential backoff
            if resp.status_code == 429:
                delay = base_delay * (2 ** attempt)  # 30, 60, 120, 240, 480 seconds
                logger.warning(f"HTTP 429 (Rate Limited) for {url} - Waiting {delay}s before retry {attempt + 1}/{max_retries}")
                await asyncio.sleep(delay)
                continue
            
            # Other errors
            logger.warning(f"HTTP {resp.status_code} for {url}")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                logger.info(f"Retrying in {delay}s...")
                await asyncio.sleep(delay)
                continue
            return None
    
    logger.error(f"Max retries ({max_retries}) exceeded for {url}")
    return None


def parse_table(soup: BeautifulSoup) -> Tuple[List[int], Dict[str, List[Optional[float]]]]:
    """Parse financial table from page."""
    years = []
    data = {}
    
    table = soup.find('table', class_='financials-table')
    if not table:
        table = soup.find('table')
    
    if not table:
        return years, data
    
    rows = table.find_all('tr')
    if not rows:
        return years, data
    
    # Parse headers from first row
    header_cells = rows[0].find_all('th')
    for cell in header_cells[1:]:  # Skip label column
        text = cell.get_text(strip=True)
        year = parse_year(text)
        if year:
            years.append(year)
    
    # Parse data rows
    for row in rows[1:]:
        cells = row.find_all(['td', 'th'])
        if not cells or len(cells) < 2:
            continue
        
        line_item = cells[0].get_text(strip=True)
        
        # Skip non-data rows
        if not line_item or line_item in ['Period Ending', 'Fiscal Year', '']:
            continue
        if 'Upgrade' in line_item:
            continue
        
        # Parse values
        values = []
        for cell in cells[1:]:
            text = cell.get_text(strip=True)
            if 'Upgrade' in text:
                continue
            values.append(parse_value(text))
        
        # Trim to match years
        if len(values) > len(years):
            values = values[:len(years)]
        
        if values:
            data[line_item] = values
    
    return years, data


async def scrape_and_insert(
    pool: asyncpg.Pool,
    client: httpx.AsyncClient,
    symbol: str,
    path: str,
    table_name: str,
    mapping: Dict[str, str],
    unique_cols: List[str]
) -> int:
    """Scrape a statement type and insert into database."""
    soup = await fetch_page(client, symbol, path)
    if not soup:
        return 0
    
    years, data = parse_table(soup)
    if not years or not data:
        return 0
    
    logger.info(f"  {table_name}: {len(years)} years, {len(data)} line items")
    
    inserted = 0
    async with pool.acquire() as conn:
        for i, year in enumerate(years):
            row = {
                "symbol": symbol.upper(),
                "fiscal_year": year,
                "period_type": "annual",
                "currency": "EGP",
            }
            
            # Add fiscal_quarter for tables that need it
            if "fiscal_quarter" in unique_cols:
                row["fiscal_quarter"] = None
            
            # Map line items to columns
            for sa_name, db_col in mapping.items():
                if sa_name in data and i < len(data[sa_name]):
                    val = data[sa_name][i]
                    if val is not None:
                        row[db_col] = val
            
            # Build insert query
            cols = list(row.keys())
            vals = list(row.values())
            placeholders = ", ".join(f"${i+1}" for i in range(len(cols)))
            
            update_cols = [c for c in cols if c not in unique_cols]
            if update_cols:
                update_clause = ", ".join(f"{c} = EXCLUDED.{c}" for c in update_cols)
                conflict_clause = f"ON CONFLICT ({', '.join(unique_cols)}) DO UPDATE SET {update_clause}"
            else:
                conflict_clause = f"ON CONFLICT ({', '.join(unique_cols)}) DO NOTHING"
            
            query = f"""
                INSERT INTO {table_name} ({', '.join(cols)})
                VALUES ({placeholders})
                {conflict_clause}
            """
            
            try:
                await conn.execute(query, *vals)
                inserted += 1
            except Exception as e:
                logger.error(f"Insert error: {e}")
    
    return inserted


def parse_quarter_header(text: str) -> Tuple[Optional[int], Optional[int]]:
    """Parse quarterly header like 'Q1 2024' or 'Q4 2023' -> (year, quarter)."""
    import re
    match = re.match(r'Q(\d)\s*(\d{4})', text.strip())
    if match:
        quarter = int(match.group(1))
        year = int(match.group(2))
        return year, quarter
    return None, None


def parse_quarterly_table(soup: BeautifulSoup) -> Tuple[List[Tuple[int, int]], Dict[str, List[Optional[float]]]]:
    """Parse quarterly financial table, returning [(year, quarter), ...] and data."""
    periods = []
    data = {}
    
    table = soup.find('table')
    if not table:
        return periods, data
    
    rows = table.find_all('tr')
    if not rows:
        return periods, data
    
    # Parse headers - look for 'Q1 2024', 'Q2 2024', etc.
    header_cells = rows[0].find_all('th')
    for cell in header_cells[1:]:
        text = cell.get_text(strip=True)
        year, quarter = parse_quarter_header(text)
        if year and quarter:
            periods.append((year, quarter))
    
    # If no quarterly headers found, try parsing as TTM
    if not periods:
        return periods, data
    
    # Parse data rows
    for row in rows[1:]:
        cells = row.find_all(['td', 'th'])
        if not cells or len(cells) < 2:
            continue
        
        line_item = cells[0].get_text(strip=True)
        
        if not line_item or line_item in ['Period Ending', 'Fiscal Year', '']:
            continue
        if 'Upgrade' in line_item:
            continue
        
        values = []
        for cell in cells[1:]:
            text = cell.get_text(strip=True)
            if 'Upgrade' in text:
                continue
            values.append(parse_value(text))
        
        if len(values) > len(periods):
            values = values[:len(periods)]
        
        if values:
            data[line_item] = values
    
    return periods, data


async def scrape_and_insert_quarterly(
    pool: asyncpg.Pool,
    client: httpx.AsyncClient,
    symbol: str,
    path: str,
    table_name: str,
    mapping: Dict[str, str],
    unique_cols: List[str]
) -> int:
    """Scrape quarterly data and insert into database."""
    soup = await fetch_page(client, symbol, path)
    if not soup:
        return 0
    
    periods, data = parse_quarterly_table(soup)
    if not periods or not data:
        logger.info(f"  {table_name} quarterly: no data found")
        return 0
    
    logger.info(f"  {table_name} quarterly: {len(periods)} quarters, {len(data)} line items")
    
    inserted = 0
    async with pool.acquire() as conn:
        for i, (year, quarter) in enumerate(periods):
            row = {
                "symbol": symbol.upper(),
                "fiscal_year": year,
                "fiscal_quarter": quarter,
                "period_type": "quarterly",
                "currency": "EGP",
            }
            
            # Map line items to columns
            for sa_name, db_col in mapping.items():
                if sa_name in data and i < len(data[sa_name]):
                    val = data[sa_name][i]
                    if val is not None:
                        row[db_col] = val
            
            # Build insert query
            cols = list(row.keys())
            vals = list(row.values())
            placeholders = ", ".join(f"${i+1}" for i in range(len(cols)))
            
            update_cols = [c for c in cols if c not in unique_cols]
            if update_cols:
                update_clause = ", ".join(f"{c} = EXCLUDED.{c}" for c in update_cols)
                conflict_clause = f"ON CONFLICT ({', '.join(unique_cols)}) DO UPDATE SET {update_clause}"
            else:
                conflict_clause = f"ON CONFLICT ({', '.join(unique_cols)}) DO NOTHING"
            
            query = f"""
                INSERT INTO {table_name} ({', '.join(cols)})
                VALUES ({placeholders})
                {conflict_clause}
            """
            
            try:
                await conn.execute(query, *vals)
                inserted += 1
            except Exception as e:
                logger.error(f"Insert quarterly error: {e}")
    
    return inserted

    return inserted


async def fetch_price_snapshot(client: httpx.AsyncClient, symbol: str) -> Optional[Dict]:
    """
    Fetch current price snapshot for a symbol from StockAnalysis.
    Used for real-time price updates for Egypt stocks.
    """
    soup = await fetch_page(client, symbol, "")
    if not soup:
        return None
        
    try:
        # StockAnalysis class names change, but structure is usually consistent
        # Try to find the price element
        price_div = soup.find('div', class_='text-4xl font-bold inline-block')
        if not price_div:
            # Fallback for different layouts
            price_div = soup.find('div', class_='text-4xl')
            
        if not price_div:
            return None
            
        price_text = price_div.get_text(strip=True).replace(',', '')
        price = float(price_text)
        
        # Find change and % change
        change_div = soup.find('div', class_='font-semibold inline-block text-lg')
        change = 0.0
        change_pct = 0.0
        
        if change_div:
            change_text = change_div.get_text(strip=True)
            # Format usually: "+1.50 (+0.45%)"
            parts = change_text.split('(')
            if len(parts) >= 1:
                try:
                    change = float(parts[0].replace('+', '').strip())
                except: pass
            if len(parts) >= 2:
                try:
                    pct_str = parts[1].replace(')', '').replace('%', '').replace('+', '').strip()
                    change_pct = float(pct_str)
                except: pass
        
        return {
            "symbol": symbol,
            "last_price": price,
            "change": change,
            "change_percent": change_pct,
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error parsing price for {symbol}: {e}")
        return None
async def ingest_symbol(pool: asyncpg.Pool, client: httpx.AsyncClient, symbol: str) -> Dict[str, int]:
    """Ingest all financial data for a symbol."""
    logger.info(f"Ingesting {symbol}...")
    
    counts = {}
    
    # ============ ANNUAL DATA ============
    # Income Statement (Annual)
    counts["income"] = await scrape_and_insert(
        pool, client, symbol,
        "/financials/",
        "income_statements",
        INCOME_MAPPING,
        ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
    )
    await asyncio.sleep(1)
    
    # Balance Sheet (Annual)
    counts["balance"] = await scrape_and_insert(
        pool, client, symbol,
        "/financials/balance-sheet/",
        "balance_sheets",
        BALANCE_MAPPING,
        ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
    )
    await asyncio.sleep(1)
    
    # Cash Flow (Annual)
    counts["cashflow"] = await scrape_and_insert(
        pool, client, symbol,
        "/financials/cash-flow-statement/",
        "cashflow_statements",
        CASHFLOW_MAPPING,
        ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
    )
    await asyncio.sleep(1)
    
    # Ratios
    counts["ratios"] = await scrape_and_insert(
        pool, client, symbol,
        "/financials/ratios/",
        "financial_ratios_history",
        RATIOS_MAPPING,
        ["symbol", "fiscal_year"]
    )
    await asyncio.sleep(1)
    
    # ============ QUARTERLY DATA ============
    # Income Statement (Quarterly)
    counts["income_q"] = await scrape_and_insert_quarterly(
        pool, client, symbol,
        "/financials/?p=quarterly",
        "income_statements",
        INCOME_MAPPING,
        ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
    )
    await asyncio.sleep(1)
    
    return inserted


async def fetch_company_profile(pool: asyncpg.Pool, client: httpx.AsyncClient, symbol: str) -> int:
    """
    Fetch and insert company profile (Sector, Industry, Description, etc.)
    """
    soup = await fetch_page(client, symbol, "/company/")
    if not soup:
        return 0
        
    try:
        # 1. Description
        desc_div = soup.find('div', class_='text-base')
        # Fallback
        if not desc_div:
             desc_div = soup.find('div', class_='description')
             
        description = desc_div.get_text(strip=True) if desc_div else None
        
        # 2. Info Table (Sector, Industry, Employees, Website)
        info = {
            'Sector': None,
            'Industry': None,
            'Employees': None,
            'Website': None
        }
        
        # Look for the info grid or table
        # StockAnalysis usually has a list of key-values
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cols = row.find_all('td')
                if len(cols) == 2:
                    key = cols[0].get_text(strip=True).replace(':', '')
                    val = cols[1].get_text(strip=True)
                    if key in info:
                        info[key] = val
                        
        # Website often a separate link
        if not info['Website']:
            web_link = soup.find('a', text='Company Website')
            if web_link:
                info['Website'] = web_link.get('href')
        
        # Insert/Update
        await pool.execute("""
            INSERT INTO company_profiles (symbol, sector, industry, description, website, employees, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (symbol) DO UPDATE SET
                sector = COALESCE(EXCLUDED.sector, company_profiles.sector),
                industry = COALESCE(EXCLUDED.industry, company_profiles.industry),
                description = COALESCE(EXCLUDED.description, company_profiles.description),
                website = COALESCE(EXCLUDED.website, company_profiles.website),
                employees = COALESCE(EXCLUDED.employees, company_profiles.employees),
                updated_at = NOW()
        """, symbol, 
           info['Sector'], 
           info['Industry'], 
           description, 
           info['Website'], 
           int(info['Employees'].replace(',', '')) if info['Employees'] and info['Employees'].replace(',', '').isdigit() else None
        )
        return 1
        
    except Exception as e:
        logger.error(f"Error fetching profile for {symbol}: {e}")
        return 0


async def fetch_historical_data(pool: asyncpg.Pool, client: httpx.AsyncClient, symbol: str) -> int:
    """
    Fetch and insert historical OHLCV data from /history/
    """
    soup = await fetch_page(client, symbol, "/history/")
    if not soup:
        return 0
        
    inserted = 0
    try:
        table = soup.find('table')
        if not table:
            return 0
            
        rows = table.find_all('tr')
        # Skip header
        if len(rows) < 2:
            return 0
            
        records = []
        for row in rows[1:]:
            cols = row.find_all('td')
            if len(cols) < 6:
                continue
                
            # Date, Open, High, Low, Close, Volume
            try:
                date_str = cols[0].get_text(strip=True)
                # Parse date: "Jan 5, 2024" or "2024-01-05"
                try:
                    dt = datetime.strptime(date_str, "%b %d, %Y").date()
                except:
                    try:
                        dt = datetime.strptime(date_str, "%Y-%m-%d").date()
                    except:
                        continue
                        
                op = float(cols[1].get_text(strip=True).replace(',', ''))
                hi = float(cols[2].get_text(strip=True).replace(',', ''))
                lo = float(cols[3].get_text(strip=True).replace(',', ''))
                cl = float(cols[4].get_text(strip=True).replace(',', ''))
                vol_str = cols[5].get_text(strip=True).replace(',', '')
                vol = int(vol_str) if vol_str.isdigit() else 0
                
                records.append((symbol, dt, op, hi, lo, cl, vol))
                
            except ValueError:
                continue
        
        # Batch insert
        if records:
            await pool.executemany("""
                INSERT INTO ohlc_data (symbol, date, open, high, low, close, volume)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (symbol, date) DO NOTHING
            """, records)
            inserted = len(records)
            
        return inserted
        
    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {e}")
        return 0
        
        
    # Balance Sheet (Quarterly)
    counts["balance_q"] = await scrape_and_insert_quarterly(
        pool, client, symbol,
        "/financials/balance-sheet/?p=quarterly",
        "balance_sheets",
        BALANCE_MAPPING,
        ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
    )
    await asyncio.sleep(1)
    
    # Cash Flow (Quarterly)
    counts["cashflow_q"] = await scrape_and_insert_quarterly(
        pool, client, symbol,
        "/financials/cash-flow-statement/?p=quarterly",
        "cashflow_statements",
        CASHFLOW_MAPPING,
        ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
    )
    
    
    # Profile
    counts["profile"] = await fetch_company_profile(pool, client, symbol)
    await asyncio.sleep(1)
    
    # Historical Data
    counts["history"] = await fetch_historical_data(pool, client, symbol)
    await asyncio.sleep(1)

    logger.info(f"Completed {symbol}: {counts}")
    return counts


async def get_egx_symbols(pool: asyncpg.Pool, limit: Optional[int] = None) -> List[str]:
    """Get list of EGX symbols."""
    async with pool.acquire() as conn:
        query = "SELECT DISTINCT symbol FROM market_tickers WHERE market_code = 'EGX' ORDER BY symbol"
        if limit:
            query += f" LIMIT {limit}"
        rows = await conn.fetch(query)
        return [r['symbol'] for r in rows]


async def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Ingest StockAnalysis financial data")
    parser.add_argument("--symbol", type=str, help="Single symbol to ingest")
    parser.add_argument("--limit", type=int, help="Limit number of symbols")
    parser.add_argument("--resume", action="store_true", help="Skip symbols that already have data")
    args = parser.parse_args()
    
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)
    
    # Connect to database with statement cache disabled for pgbouncer
    pool = await asyncpg.create_pool(
        db_url, 
        min_size=2, 
        max_size=10,
        statement_cache_size=0,
        command_timeout=60
    )
    logger.info("Connected to database")
    
    # Create HTTP client
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    client = httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True)
    
    try:
        if args.symbol:
            # Single symbol
            result = await ingest_symbol(pool, client, args.symbol)
            print(f"\n{args.symbol} ingestion complete: {result}")
        else:
            # All EGX symbols
            symbols = await get_egx_symbols(pool, args.limit)
            
            # Check for resume mode
            if args.resume:
                logger.info("Resume mode checking for completed symbols...")
                # Check financial_ratios_history as it's the last step
                async with pool.acquire() as conn:
                    done_rows = await conn.fetch("SELECT DISTINCT symbol FROM financial_ratios_history")
                done_symbols = set(r['symbol'] for r in done_rows)
                logger.info(f"Found {len(done_symbols)} completed symbols in database")
                
                # Filter list
                original_count = len(symbols)
                symbols = [s for s in symbols if s not in done_symbols]
                logger.info(f"Resuming: Skipping {original_count - len(symbols)} symbols. {len(symbols)} remaining.")
            
            logger.info(f"Starting ingestion for {len(symbols)} EGX stocks")
            
            totals = {
                "income": 0, "balance": 0, "cashflow": 0, "ratios": 0,
                "income_q": 0, "balance_q": 0, "cashflow_q": 0,
                "profile": 0, "history": 0
            }
            errors = []
            
            for i, symbol in enumerate(symbols):
                try:
                    counts = await ingest_symbol(pool, client, symbol)
                    for k, v in counts.items():
                        totals[k] += v
                    
                    logger.info(f"Progress: {i+1}/{len(symbols)}")
                    
                except Exception as e:
                    logger.error(f"Failed {symbol}: {e}")
                    errors.append(symbol)
                
                # Rate limiting
                await asyncio.sleep(2)
            
            print(f"\n{'='*50}")
            print(f"INGESTION COMPLETE")
            print(f"{'='*50}")
            print(f"Total stocks: {len(symbols)}")
            print(f"Income statements: {totals['income']} rows")
            print(f"Balance sheets: {totals['balance']} rows")
            print(f"Cash flow statements: {totals['cashflow']} rows")
            print(f"Ratios: {totals['ratios']} rows")
            if errors:
                print(f"Errors: {len(errors)} - {errors[:5]}...")
    
    finally:
        await client.aclose()
        await pool.close()

async def run_ingestion_job():
    """Callable entry point for the scheduler."""
    logger.info("Starting scheduled ingestion job...")
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not set")

    pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10, statement_cache_size=0, command_timeout=60)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    client = httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True)
    
    start_time = datetime.datetime.now()
    totals = {
        "income": 0, "balance": 0, "cashflow": 0, "ratios": 0,
        "income_q": 0, "balance_q": 0, "cashflow_q": 0
    }
    errors = []
    
    try:
        symbols = await get_egx_symbols(pool)
        for i, symbol in enumerate(symbols):
            try:
                counts = await ingest_symbol(pool, client, symbol)
                for k, v in counts.items():
                    totals[k] += v
                logger.info(f"Progress: {i+1}/{len(symbols)}")
            except Exception as e:
                logger.error(f"Failed {symbol}: {e}")
                errors.append(symbol)
            await asyncio.sleep(2) # Rate limit
            
        duration = datetime.datetime.now() - start_time
        return {
            "status": "success",
            "totals": totals,
            "errors": errors,
            "duration": str(duration),
            "symbols_count": len(symbols)
        }
            
    except Exception as e:
        logger.error(f"Job failed: {e}")
        return {"status": "failed", "error": str(e)}
    finally:
        await client.aclose()
        await pool.close()

if __name__ == "__main__":
    asyncio.run(main())
