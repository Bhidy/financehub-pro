"""
StockAnalysis Data Ingester - Robust HTML Scraper
Extracts complete financial statements from StockAnalysis.com

Supports:
- Income Statement (15+ line items)
- Balance Sheet (12+ line items)  
- Cash Flow Statement (12+ line items)
- Ratios (12+ metrics)
- KPIs/Segments

For all EGX stocks with 5+ years of historical data.
"""

import asyncio
import httpx
from bs4 import BeautifulSoup
import json
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from decimal import Decimal
import asyncpg
import logging
import os
from playwright.async_api import async_playwright

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class StockAnalysisScraper:
    """
    Robust scraper for StockAnalysis.com financial data using Playwright.
    Executes JS to hydration full tables.
    """
    
    BASE_URL = "https://stockanalysis.com/quote/egx"
    
    # Statement type to URL path mapping
    STATEMENT_PATHS = {
        "income": "/financials/",
        "balance": "/financials/balance-sheet/",
        "cashflow": "/financials/cash-flow-statement/",
        "ratios": "/financials/ratios/",
    }
    
    # Column name mappings from StockAnalysis to our database
    INCOME_MAPPING = {
        # Banking-specific income
        "Interest Income on Loans": "interest_income_loans",
        "Interest Income on Investments": "interest_income_investments",
        "Total Interest Income": "total_interest_income",
        "Interest Paid on Deposits": "interest_expense",
        "Net Interest Income": "net_interest_income",
        "Net Interest Income Growth (YoY)": "net_interest_income_growth",
        "Revenues Before Loan Losses": "revenues_before_loan_losses",
        # Trading and Fees
        "Income From Trading Activities": "trading_income",
        "Fee and Commission Income": "fee_income",
        "Gain (Loss) on Sale of Assets": "gain_loss_assets",
        "Gain (Loss) on Sale of Investments": "gain_loss_investments",
        "Other Non-Interest Income": "other_noninterest_income",
        "Total Non-Interest Income": "total_noninterest_income",
        # General income (non-banks)
        "Revenue": "revenue",
        "Revenue Growth (YoY)": "revenue_growth",
        "Cost of Revenue": "cost_of_revenue",
        "Gross Profit": "gross_profit",
        "Gross Margin": "gross_margin",
        # Expenses
        "Operating Expenses": "operating_expenses",
        "Research and Development": "rd_expense",
        "Selling, General & Admin": "sga_expense",
        "Depreciation & Amortization": "depreciation",
        "Provision for Credit Losses": "provision_credit_losses",
        "Salaries and Employee Benefits": "salaries_and_benefits",
        "Amortization of Goodwill & Intangibles": "amortization_of_goodwill",
        "Other Unusual Items": "other_unusual_items",
        # Profit lines
        "Operating Income": "operating_income",
        "Operating Margin": "operating_margin",
        "Pretax Income": "pretax_income",
        "Income Tax Expense": "income_tax",
        "Effective Tax Rate": "effective_tax_rate",
        "Net Income": "net_income",
        "Net Income Growth (YoY)": "net_income_growth",
        "Profit Margin": "net_margin",
        # Per share
        "EPS (Basic)": "eps",
        "EPS (Diluted)": "eps_diluted",
        "Shares Outstanding (Basic)": "shares_outstanding",
        "Shares Outstanding (Diluted)": "shares_diluted",
        # Gap Fill Additions 2026-01-26
        "Earnings From Continuing Operations": "earnings_from_continuing_ops",
        "Earnings From Discontinued Operations": "earnings_from_discontinued_ops",
        "Preferred Dividends & Other Adjustments": "preferred_dividends",
        "EBT Excluding Unusual Items": "ebt_excl_unusual",
        "EPS Growth": "eps_growth",
        "Dividend Growth": "dividend_growth",
        "Dividend Per Share": "dividend_per_share",
        "Non-Interest Income Growth (YoY)": "non_interest_income_growth",
        "Shares Change (YoY)": "shares_change",
    }
    
    BALANCE_MAPPING = {
        # Assets
        "Cash & Equivalents": "cash_equivalents",
        "Short-Term Investments": "short_term_investments",
        "Accounts Receivable": "accounts_receivable",
        "Inventory": "inventory",
        "Other Current Assets": "other_current_assets",
        "Total Current Assets": "total_current_assets",
        "Restricted Cash": "restricted_cash",
        "Accrued Interest Receivable": "accrued_interest_receivable",
        # Banking assets
        "Investment Securities": "investment_securities",
        "Trading Asset Securities": "trading_assets",
        "Total Investments": "total_investments",
        "Gross Loans": "gross_loans",
        "Allowance for Loan Losses": "allowance_loan_losses",
        "Net Loans": "net_loans",
        "Other Real Estate Owned & Foreclosed": "other_real_estate_owned",
        # Fixed assets
        "Property, Plant & Equipment": "property_plant_equipment",
        "Goodwill": "goodwill",
        "Intangible Assets": "intangible_assets",
        "Other Non-Current Assets": "other_noncurrent_assets",
        "Total Assets": "total_assets",
        "Long-Term Deferred Tax Assets": "deferred_tax_assets",
        # Liabilities
        "Accounts Payable": "accounts_payable",
        "Short-Term Debt": "short_term_debt",
        "Current Portion of Long-Term Debt": "current_portion_ltd",
        "Accrued Liabilities": "accrued_liabilities",
        "Deferred Revenue": "deferred_revenue",
        "Total Current Liabilities": "total_current_liabilities",
        "Deposits": "deposits",
        "Total Deposits": "deposits",
        "Interest Bearing Deposits": "interest_bearing_deposits",
        "Non-Interest Bearing Deposits": "non_interest_bearing_deposits",
        "Long-Term Debt": "long_term_debt",
        "Deferred Tax Liabilities": "deferred_tax_liabilities",
        "Total Non-Current Liabilities": "total_noncurrent_liabilities",
        "Total Liabilities": "total_liabilities",
        # Equity
        "Common Stock": "common_stock",
        "Additional Paid-In Capital": "additional_paid_in_capital",
        "Retained Earnings": "retained_earnings",
        "Treasury Stock": "treasury_stock",
        "Total Stockholders' Equity": "total_equity",
        "Total Equity": "total_equity",
        "Tangible Book Value": "tangible_book_value",
        "Minority Interest": "minority_interest",
        # Gap Fill Additions 2026-01-26
        "Long-Term Deferred Tax Assets": "deferred_tax_assets",
        "Long-Term Deferred Tax Liabilities": "long_term_deferred_tax_liabilities",
        "Comprehensive Income & Other": "comprehensive_income_other",
        "Current Income Taxes Payable": "current_income_tax_payable",
        "Accrued Interest Payable": "accrued_interest_payable",
        "Accrued Expenses": "accrued_expenses",
        "Other Receivables": "other_receivables",
        "Other Intangible Assets": "other_intangible_assets",
        "Other Long-Term Assets": "other_long_term_assets",
        "Total Common Equity": "total_common_equity",
        "Book Value Per Share": "book_value_per_share",
        "Net Cash Per Share": "net_cash_per_share",
        "Total Debt": "total_debt",
        "Net Cash (Debt)": "net_cash",
        "Net Cash Growth": "net_cash_growth",
    }
    
    CASHFLOW_MAPPING = {
        # Operating
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
        # Investing
        "Capital Expenditures": "capex",
        "Acquisitions": "acquisitions",
        "Purchases of Investments": "investment_purchases",
        "Sales of Investments": "investment_sales",
        "Other Investing Activities": "other_investing_activities",
        "Cash from Investing Activities": "cash_from_investing",
        # Financing
        "Dividends Paid": "dividends_paid",
        "Share Repurchases": "share_repurchases",
        "Debt Issued": "debt_issued",
        "Debt Repaid": "debt_repaid",
        "Other Financing Activities": "other_financing_activities",
        "Cash from Financing Activities": "cash_from_financing",
        # Summary
        "Net Change in Cash": "net_change_cash",
        "Free Cash Flow": "free_cashflow",
        "Cash Income Tax Paid": "cash_income_tax_paid",
        "Net Increase (Decrease) in Deposit Accounts": "net_increase_deposits",
        # Gap Fill Additions 2026-01-26
        "Issuance of Common Stock": "issuance_common_stock",
        "Long-Term Debt Issued": "long_term_debt_issued",
        "Long-Term Debt Repaid": "long_term_debt_repaid",
        "Change in Trading Asset Securities": "change_in_trading_assets",
        "Change in Income Taxes": "change_in_income_tax",
        "Change in Other Net Operating Assets": "change_in_working_capital",
        "Income (Loss) Equity Investments": "income_loss_equity_investments",
        "Total Asset Writedown": "total_asset_writedown",
        "Divestitures": "divestitures",
        "Cash Acquisitions": "cash_acquisitions",
        "Investment in Securities": "investment_in_securities",
        "Sale of Property, Plant and Equipment": "sale_of_ppe",
        "Other Amortization": "other_amortization",
        "Free Cash Flow Growth": "free_cash_flow_growth",
        "Operating Cash Flow Growth": "operating_cash_flow_growth",
        "Free Cash Flow Margin": "free_cash_flow_margin",
        "Free Cash Flow Per Share": "free_cash_flow_per_share",
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
        "EV/Sales": "ev_sales",
        "Debt / Equity Ratio": "debt_equity",
        "Debt / Assets": "debt_assets",
        "Debt / FCF Ratio": "debt_fcf",
        "Interest Coverage": "interest_coverage",
        "Return on Equity (ROE)": "roe",
        "Return on Assets (ROA)": "roa",
        "Return on Capital (ROIC)": "roic",
        "Gross Margin": "gross_margin",
        "Operating Margin": "operating_margin",
        "Profit Margin": "net_margin",
        "Current Ratio": "current_ratio",
        "Quick Ratio": "quick_ratio",
        "Asset Turnover": "asset_turnover",
        "Dividend Yield": "dividend_yield",
        "Payout Ratio": "payout_ratio",
    }
    
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.playwright = None
        self.browser = None
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self):
        """Initialize connections."""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=True)
        self.pool = await asyncpg.create_pool(self.db_url, min_size=2, max_size=10, statement_cache_size=0)
        logger.info("Connected to database and launched Playwright")
    
    async def close(self):
        """Close connections."""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        if self.pool:
            await self.pool.close()
    
    def _parse_value(self, value_str: str) -> Optional[float]:
        """Parse a numeric value from string, handling commas, percentages, etc."""
        if not value_str or value_str in ['-', 'N/A', 'n/a', '—', '']:
            return None
        
        # Remove commas and whitespace
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
                value = value / 100  # Convert to decimal
            return value
        except ValueError:
            return None
    
    def _parse_year(self, header: str) -> Optional[int]:
        """Extract fiscal year from header string like 'FY 2024'."""
        match = re.search(r'(?:FY\s*)?(\d{4})', header)
        if match:
            return int(match.group(1))
        return None
    
    async def fetch_page(self, symbol: str, statement_type: str) -> Optional[BeautifulSoup]:
        """Fetch and parse a financial statement page using Playwright."""
        path = self.STATEMENT_PATHS.get(statement_type, "/financials/")
        url = f"{self.BASE_URL}/{symbol.lower()}{path}"
        
        page = await self.browser.new_page()
        try:
            logger.info(f"Navigating to {url}")
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            
            # Wait for table to appear (Svelte hydration)
            try:
                await page.wait_for_selector('table.financials-table', timeout=10000)
            except:
                logger.warning(f"Timeout waiting for table on {url}")
            
            content = await page.content()
            await page.close()
            return BeautifulSoup(content, 'html.parser')
            
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            await page.close()
            return None
    
    def parse_table(self, soup: BeautifulSoup) -> Tuple[List[int], Dict[str, List[Optional[float]]]]:
        """
        Parse the main financial table from the page.
        
        Returns:
            Tuple of (years list, data dict mapping line items to values per year)
        """
        years = []
        data = {}
        
        # Find the main table - look for financials-table class first
        table = soup.find('table', class_='financials-table')
        if not table:
            table = soup.find('table')
        
        if not table:
            logger.warning("No table found in content")
            return years, data
        
        # Get all rows
        rows = table.find_all('tr')
        if not rows:
            return years, data
        
        # Parse headers from first row (skip first column which is label)
        header_cells = rows[0].find_all('th')
        for cell in header_cells[1:]:  # Skip 'Fiscal Year' column
            text = cell.get_text(strip=True)
            year = self._parse_year(text)
            if year:
                years.append(year)
        
        logger.info(f"Found years: {years}")
        
        # Parse data rows (skip header row and Period Ending row)
        for row in rows[1:]:
            cells = row.find_all(['td', 'th'])
            if not cells or len(cells) < 2:
                continue
            
            # First cell is the line item name
            line_item = cells[0].get_text(strip=True)
            
            # Skip metadata rows
            if not line_item or line_item in ['Period Ending', 'Fiscal Year', '']:
                continue
            
            # Skip upgrade prompts
            if 'Upgrade' in line_item:
                continue
            
            # Parse values for each year (skip first cell which is label, skip last if "Upgrade")
            values = []
            for cell in cells[1:]:  # Skip the label column
                text = cell.get_text(strip=True)
                # Skip TTM column if it's the first value column after label
                if 'Upgrade' in text:
                    continue
                value = self._parse_value(text)
                values.append(value)
            
            # Trim to match years count
            if len(values) > len(years):
                values = values[:len(years)]
            
            # Store with line item as key
            if values:
                data[line_item] = values
        
        logger.info(f"Parsed {len(data)} line items")
        return years, data
    
    async def scrape_income_statement(self, symbol: str) -> List[Dict[str, Any]]:
        """Scrape income statement and return rows for database."""
        soup = await self.fetch_page(symbol, "income")
        if not soup:
            return []
        
        years, data = self.parse_table(soup)
        
        rows = []
        for i, year in enumerate(years):
            row = {
                "symbol": symbol.upper(),
                "fiscal_year": year,
                "fiscal_quarter": None,
                "period_type": "annual",
                "currency": "EGP",
            }
            
            # Map each line item to our column
            used_keys = set()
            for sa_name, db_col in self.INCOME_MAPPING.items():
                if sa_name in data and i < len(data[sa_name]):
                    row[db_col] = data[sa_name][i]
                    used_keys.add(sa_name)
            
            # Collect 100% of remaining data into sector_specific_data
            sector_data = {}
            for sa_name, values in data.items():
                if sa_name not in used_keys and i < len(values) and values[i] is not None:
                    # Clean the key for JSON (optional, but good for querying)
                    key = sa_name.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('&', 'and').replace(',', '').replace('-', '_')
                    sector_data[key] = values[i]
            
            if sector_data:
                row['sector_specific_data'] = json.dumps(sector_data)
            
            rows.append(row)
        
        return rows
    
    async def scrape_balance_sheet(self, symbol: str) -> List[Dict[str, Any]]:
        """Scrape balance sheet and return rows for database."""
        soup = await self.fetch_page(symbol, "balance")
        if not soup:
            return []
        
        years, data = self.parse_table(soup)
        
        rows = []
        for i, year in enumerate(years):
            row = {
                "symbol": symbol.upper(),
                "fiscal_year": year,
                "fiscal_quarter": None,
                "period_type": "annual",
                "currency": "EGP",
            }
            
            used_keys = set()
            for sa_name, db_col in self.BALANCE_MAPPING.items():
                if sa_name in data and i < len(data[sa_name]):
                    row[db_col] = data[sa_name][i]
                    used_keys.add(sa_name)
            
            # Collect 100% of remaining data
            sector_data = {}
            for sa_name, values in data.items():
                if sa_name not in used_keys and i < len(values) and values[i] is not None:
                    key = sa_name.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('&', 'and').replace(',', '').replace('-', '_')
                    sector_data[key] = values[i]
            
            if sector_data:
                row['sector_specific_data'] = json.dumps(sector_data)

            rows.append(row)
        
        return rows
    
    async def scrape_cashflow(self, symbol: str) -> List[Dict[str, Any]]:
        """Scrape cash flow statement and return rows for database."""
        soup = await self.fetch_page(symbol, "cashflow")
        if not soup:
            return []
        
        years, data = self.parse_table(soup)
        
        rows = []
        for i, year in enumerate(years):
            row = {
                "symbol": symbol.upper(),
                "fiscal_year": year,
                "fiscal_quarter": None,
                "period_type": "annual",
                "currency": "EGP",
            }
            
            used_keys = set()
            for sa_name, db_col in self.CASHFLOW_MAPPING.items():
                if sa_name in data and i < len(data[sa_name]):
                    row[db_col] = data[sa_name][i]
                    used_keys.add(sa_name)
            
            # Collect 100% of remaining data
            sector_data = {}
            for sa_name, values in data.items():
                if sa_name not in used_keys and i < len(values) and values[i] is not None:
                    key = sa_name.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('&', 'and').replace(',', '').replace('-', '_')
                    sector_data[key] = values[i]
            
            if sector_data:
                row['sector_specific_data'] = json.dumps(sector_data)

            rows.append(row)
        
        return rows
    
    async def scrape_ratios(self, symbol: str) -> List[Dict[str, Any]]:
        """Scrape ratios and return rows for database."""
        soup = await self.fetch_page(symbol, "ratios")
        if not soup:
            return []
        
        years, data = self.parse_table(soup)
        
        rows = []
        for i, year in enumerate(years):
            row = {
                "symbol": symbol.upper(),
                "fiscal_year": year,
                "currency": "EGP",
            }
            
            for sa_name, db_col in self.RATIOS_MAPPING.items():
                if sa_name in data and i < len(data[sa_name]):
                    row[db_col] = data[sa_name][i]
            
            rows.append(row)
        
        return rows
    
    async def insert_rows(self, table_name: str, rows: List[Dict[str, Any]], 
                          unique_cols: List[str]):
        """Insert rows into database with upsert."""
        if not rows:
            return 0
        
        inserted = 0
        async with self.pool.acquire() as conn:
            for row in rows:
                # Filter out None values and build query
                cols = [k for k, v in row.items() if v is not None]
                vals = [v for v in row.values() if v is not None]
                
                if not cols:
                    continue
                
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
                    logger.error(f"Insert error for {table_name}: {e}")
        
        return inserted
    
    async def ingest_symbol(self, symbol: str) -> Dict[str, int]:
        """
        Ingest all financial data for a single symbol.
        
        Returns counts of rows inserted per statement type.
        """
        logger.info(f"Ingesting {symbol}...")
        counts = {"income": 0, "balance": 0, "cashflow": 0, "ratios": 0}
        
        # Income Statement
        income_rows = await self.scrape_income_statement(symbol)
        counts["income"] = await self.insert_rows(
            "income_statements", income_rows,
            ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
        )
        
        # Balance Sheet
        balance_rows = await self.scrape_balance_sheet(symbol)
        counts["balance"] = await self.insert_rows(
            "balance_sheets", balance_rows,
            ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
        )
        
        # Cash Flow
        cashflow_rows = await self.scrape_cashflow(symbol)
        counts["cashflow"] = await self.insert_rows(
            "cashflow_statements", cashflow_rows,
            ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
        )
        
        # Ratios
        ratios_rows = await self.scrape_ratios(symbol)
        counts["ratios"] = await self.insert_rows(
            "financial_ratios_history", ratios_rows,
            ["symbol", "fiscal_year"]
        )
        
        logger.info(f"Completed {symbol}: {counts}")
        return counts
    
    async def get_egx_symbols(self, limit: Optional[int] = None) -> List[str]:
        """Get list of EGX symbols from our database."""
        async with self.pool.acquire() as conn:
            query = "SELECT DISTINCT symbol FROM market_tickers WHERE market_code = 'EGX' ORDER BY symbol"
            if limit:
                query += f" LIMIT {limit}"
            
            rows = await conn.fetch(query)
            return [r['symbol'] for r in rows]
    
    async def ingest_all_egx(self, limit: Optional[int] = None, 
                              start_from: Optional[str] = None) -> Dict[str, Any]:
        """
        Ingest financial data for all EGX stocks.
        
        Args:
            limit: Optional limit on number of stocks
            start_from: Optional symbol to start from (for resuming)
        """
        symbols = await self.get_egx_symbols(limit)
        
        if start_from:
            try:
                idx = symbols.index(start_from)
                symbols = symbols[idx:]
            except ValueError:
                pass
        
        logger.info(f"Starting ingestion for {len(symbols)} EGX stocks")
        
        totals = {"income": 0, "balance": 0, "cashflow": 0, "ratios": 0}
        errors = []
        
        for i, symbol in enumerate(symbols):
            try:
                counts = await self.ingest_symbol(symbol)
                for k, v in counts.items():
                    totals[k] += v
                
                logger.info(f"Progress: {i+1}/{len(symbols)}")
                
            except Exception as e:
                logger.error(f"Failed to ingest {symbol}: {e}")
                errors.append({"symbol": symbol, "error": str(e)})
            
            # Rate limiting between stocks
            await asyncio.sleep(2)
        
        return {
            "total_stocks": len(symbols),
            "totals": totals,
            "errors": errors
        }


async def main():
    """Test ingestion with COMI."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set")
        return
    
    scraper = StockAnalysisScraper(db_url)
    await scraper.connect()
    
    try:
        # Test with COMI
        result = await scraper.ingest_symbol("COMI")
        print(f"\nCOMI ingestion complete: {result}")
        
    finally:
        await scraper.close()


if __name__ == "__main__":
    asyncio.run(main())
