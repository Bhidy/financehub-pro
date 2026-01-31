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
from dotenv import load_dotenv

load_dotenv('backend-core/.env')
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, date

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================
# Field Mappings from StockAnalysis to Database
# ============================================================

INCOME_MAPPING = {
    # ============ BANKING TEMPLATE ============
    # Interest Income Section
    "Interest Income on Loans": "interest_income_loans",
    "Interest Income on Investments": "interest_income_investments",
    "Total Interest Income": "total_interest_income",
    "Interest Paid on Deposits": "interest_expense",
    "Net Interest Income": "net_interest_income",
    "Net Interest Income Growth (YoY)": "net_interest_income_growth",
    "Net Interest Income Growth": "net_interest_income_growth",
    
    # Non-Interest Income Section (Banking)
    "Income From Trading Activities": "trading_income",
    "Fee and Commission Income": "fee_income",
    "Gain (Loss) on Sale of Assets": "gain_loss_assets",
    "Loss (Gain) From Sale of Assets": "gain_loss_assets",
    "Gain (Loss) on Sale of Investments": "gain_loss_investments",
    "Loss (Gain) From Sale of Investments": "gain_loss_investments",
    "Other Non-Interest Income": "other_noninterest_income",
    "Total Non-Interest Income": "total_noninterest_income",
    "Non-Interest Income Growth (YoY)": "noninterest_income_growth",
    
    # Banking Revenue
    "Revenues Before Loan Losses": "revenues_before_loan_losses",
    "Provision for Loan Losses": "provision_credit_losses",
    "Provision for Credit Losses": "provision_credit_losses",
    
    # ============ CORPORATE TEMPLATE ============
    # Revenue Section
    "Operating Revenue": "operating_revenue",
    "Revenue": "revenue",
    "Revenue Growth (YoY)": "revenue_growth",
    "Revenue Growth": "revenue_growth",
    
    # Cost & Gross Profit
    "Cost of Revenue": "cost_of_revenue",
    "Gross Profit": "gross_profit",
    "Gross Margin": "gross_margin",
    
    # Operating Expenses
    "Selling, General & Admin": "sga_expense",
    "Selling, General & Administrative": "sga_expense",
    "Other Operating Expenses": "other_operating_expenses",
    "Operating Expenses": "operating_expenses",
    "Research and Development": "rd_expense",
    "Research & Development": "rd_expense",
    "Depreciation & Amortization": "depreciation",
    
    # Banking Expenses
    "Salaries and Employee Benefits": "salaries_and_benefits",
    "Amortization of Goodwill & Intangibles": "amortization_of_goodwill",
    "Other Non-Interest Expense": "other_noninterest_expense",
    "Total Non-Interest Expense": "total_noninterest_expense",
    
    # Operating Income
    "Operating Income": "operating_income",
    "Operating Margin": "operating_margin",
    
    # Non-Operating Items
    "Interest Expense": "interest_expense_nonop",
    "Interest & Investment Income": "interest_investment_income",
    "Earnings From Equity Investments": "earnings_equity_investments",
    "Currency Exchange Gain (Loss)": "fx_gain_loss",
    "Other Non Operating Income (Expenses)": "other_nonop_income",
    
    # Unusual Items (Pre-Tax)
    "Impairment of Goodwill": "impairment_goodwill",
    "Asset Writedown": "asset_writedown",
    
    # Pre-Tax Section
    "EBT Excluding Unusual Items": "ebt_excl_unusual",
    "Other Unusual Items": "other_unusual_items",
    "Pretax Income": "pretax_income",
    "Income Tax Expense": "income_tax",
    "Effective Tax Rate": "effective_tax_rate",
    
    # Net Income Section
    "Earnings From Continuing Operations": "earnings_continuing_ops",
    "Earnings From Discontinued Operations": "earnings_discontinued_ops",
    "Minority Interest in Earnings": "minority_interest_earnings",
    "Net Income": "net_income",
    "Preferred Dividends & Other Adjustments": "preferred_dividends",
    "Net Income to Common": "net_income_common",
    "Net Income Growth (YoY)": "net_income_growth",
    "Net Income Growth": "net_income_growth",
    "Profit Margin": "net_margin",
    
    # Shares & EPS
    "Basic Shares Outstanding": "shares_outstanding",
    "Shares Outstanding (Basic)": "shares_outstanding",
    "Diluted Shares Outstanding": "shares_diluted",
    "Shares Outstanding (Diluted)": "shares_diluted",
    "Shares Change (YoY)": "shares_change",
    "EPS (Basic)": "eps",
    "EPS (Diluted)": "eps_diluted",
    "EPS Growth": "eps_growth",
    
    # Dividends
    "Dividend Per Share": "dividend_per_share",
    "Dividend Growth": "dividend_growth",
    
    # Cash Flow Metrics (in Income tab)
    "Free Cash Flow": "free_cashflow",
    "Free Cash Flow Per Share": "fcf_per_share",
    "Free Cash Flow Margin": "fcf_margin",
    
    # EBITDA/EBIT
    "EBITDA": "ebitda",
    "EBITDA Margin": "ebitda_margin",
    "D&A For EBITDA": "da_for_ebitda",
    "EBIT": "ebit",
    "EBIT Margin": "ebit_margin",
}

BALANCE_MAPPING = {
    # ============ ASSETS ============
    # Cash & Investments
    "Cash & Equivalents": "cash_equivalents",
    "Short-Term Investments": "short_term_investments",
    "Trading Asset Securities": "trading_assets",
    "Cash & Short-Term Investments": "cash_and_st_investments",
    "Cash Growth": "cash_growth",
    
    # Receivables
    "Accounts Receivable": "accounts_receivable",
    "Other Receivables": "other_receivables",
    "Receivables": "total_receivables",
    
    # Inventory & Current
    "Inventory": "inventory",
    "Prepaid Expenses": "prepaid_expenses",
    "Other Current Assets": "other_current_assets",
    "Total Current Assets": "total_current_assets",
    
    # Banking Assets
    "Investment Securities": "investment_securities",
    "Total Investments": "total_investments",
    "Gross Loans": "gross_loans",
    "Allowance for Loan Losses": "allowance_loan_losses",
    "Other Adjustments to Gross Loans": "other_loan_adjustments",
    "Net Loans": "net_loans",
    
    # Fixed Assets
    "Property, Plant & Equipment": "property_plant_equipment",
    "Long-Term Investments": "long_term_investments",
    "Goodwill": "goodwill",
    "Other Intangible Assets": "intangible_assets",
    "Intangible Assets": "intangible_assets",
    "Long-Term Accounts Receivable": "lt_accounts_receivable",
    "Long-Term Deferred Tax Assets": "lt_deferred_tax_assets",
    "Other Long-Term Assets": "other_noncurrent_assets",
    
    # Banking Specific Assets
    "Accrued Interest Receivable": "accrued_interest_receivable",
    "Restricted Cash": "restricted_cash",
    "Other Real Estate Owned & Foreclosed": "other_real_estate_owned",
    
    # Total Assets
    "Total Assets": "total_assets",
    
    # ============ LIABILITIES ============
    # Current Liabilities
    "Accounts Payable": "accounts_payable",
    "Accrued Expenses": "accrued_liabilities",
    "Short-Term Debt": "short_term_debt",
    "Short-Term Borrowings": "short_term_debt",
    "Current Portion of Long-Term Debt": "current_portion_ltd",
    "Current Portion of Leases": "current_portion_leases",
    "Current Income Taxes Payable": "current_taxes_payable",
    "Current Unearned Revenue": "deferred_revenue",
    "Other Current Liabilities": "other_current_liabilities",
    "Total Current Liabilities": "total_current_liabilities",
    
    # Banking Liabilities
    "Interest Bearing Deposits": "interest_bearing_deposits",
    "Non-Interest Bearing Deposits": "non_interest_bearing_deposits",
    "Total Deposits": "deposits",
    "Deposits": "deposits",
    "Accrued Interest Payable": "accrued_interest_payable",
    
    # Long-Term Liabilities
    "Long-Term Debt": "long_term_debt",
    "Long-Term Leases": "long_term_leases",
    "Long-Term Deferred Tax Liabilities": "deferred_tax_liabilities",
    "Other Long-Term Liabilities": "other_noncurrent_liabilities",
    "Total Liabilities": "total_liabilities",
    
    # ============ EQUITY ============
    "Common Stock": "common_stock",
    "Retained Earnings": "retained_earnings",
    "Treasury Stock": "treasury_stock",
    "Comprehensive Income & Other": "accumulated_other_comprehensive_income",
    "Total Common Equity": "total_common_equity",
    "Minority Interest": "minority_interest",
    "Shareholders' Equity": "total_equity",
    "Total Stockholders' Equity": "total_equity",
    "Total Equity": "total_equity",
    "Total Liabilities & Equity": "total_liabilities_equity",
    
    # ============ DERIVED METRICS ============
    "Total Debt": "total_debt",
    "Net Cash (Debt)": "net_cash",
    "Net Cash Growth": "net_cash_growth",
    "Net Cash Per Share": "net_cash_per_share",
    "Filing Date Shares Outstanding": "filing_shares_outstanding",
    "Filing Date": "filing_date",
    "Shares Outstanding": "shares_outstanding",
    "Total Common Shares Outstanding": "shares_outstanding",
    "Working Capital": "working_capital",
    "Book Value Per Share": "book_value_per_share",
    "Tangible Book Value": "tangible_book_value",
    "Tangible Book Value Per Share": "tangible_bv_per_share",
    
    # PP&E Breakdown
    "Land": "ppe_land",
    "Buildings": "ppe_buildings",
    "Machinery": "ppe_machinery",
    "Construction In Progress": "ppe_construction",
    "Leasehold Improvements": "ppe_leasehold",
}

CASHFLOW_MAPPING = {
    # ============ OPERATING ACTIVITIES ============
    "Net Income": "net_income",
    "Depreciation & Amortization": "depreciation_amortization",
    "Other Amortization": "other_amortization",
    "Stock-Based Compensation": "stock_based_compensation",
    "Deferred Income Taxes": "deferred_taxes",
    
    # Gains/Losses
    "Loss (Gain) From Sale of Assets": "gain_loss_assets",
    "Gain (Loss) on Sale of Assets": "gain_loss_assets",
    "Loss (Gain) From Sale of Investments": "gain_loss_investments",
    "Gain (Loss) on Sale of Investments": "gain_loss_investments",
    "Total Asset Writedown": "asset_writedown",
    "Asset Writedown & Restructuring Costs": "asset_writedown_restructuring",
    "Loss (Gain) on Equity Investments": "loss_gain_equity_investments",
    
    # Provisions
    "Provision for Credit Losses": "provision_credit_losses",
    "Provision & Write-off of Bad Debts": "provision_credit_losses",
    
    # Working Capital Changes
    "Change in Trading Asset Securities": "change_in_trading_assets",
    "Change in Income Taxes": "change_in_income_taxes",
    "Change in Other Net Operating Assets": "change_in_other_assets",
    "Change in Accounts Receivable": "change_in_receivables",
    "Change in Receivables": "change_in_receivables",
    "Change in Inventory": "change_in_inventory",
    "Change in Accounts Payable": "change_in_payables",
    "Change in Payables": "change_in_payables",
    "Change in Unearned Revenue": "change_unearned_revenue",
    "Change in Working Capital": "change_in_working_capital",
    "Other Operating Activities": "other_operating_activities",
    "Net Cash from Discontinued Operations": "cash_discontinued_ops",
    
    # Operating Cash Flow Total
    "Operating Cash Flow": "cash_from_operating",
    "Cash from Operating Activities": "cash_from_operating",
    "Operating Cash Flow Growth": "ocf_growth",
    
    # ============ INVESTING ACTIVITIES ============
    "Capital Expenditures": "capex",
    "Sale of Property, Plant and Equipment": "sale_of_ppe",
    "Sale of Property, Plant & Equipment": "sale_of_ppe",
    "Cash Acquisitions": "acquisitions",
    "Acquisitions": "acquisitions",
    "Investment in Securities": "investment_purchases",
    "Purchases of Investments": "investment_purchases",
    "Sales of Investments": "investment_sales",
    "Sale (Purchase) of Intangibles": "intangibles_purchased",
    "Income (Loss) Equity Investments": "equity_investment_income",
    "Divestitures": "divestitures",
    "Other Investing Activities": "other_investing_activities",
    
    # Investing Cash Flow Total
    "Investing Cash Flow": "cash_from_investing",
    "Cash from Investing Activities": "cash_from_investing",
    
    # ============ FINANCING ACTIVITIES ============
    # Debt
    "Short-Term Debt Issued": "short_term_debt_issued",
    "Long-Term Debt Issued": "debt_issued",
    "Total Debt Issued": "total_debt_issued",
    "Short-Term Debt Repaid": "short_term_debt_repaid",
    "Long-Term Debt Repaid": "debt_repaid",
    "Total Debt Repaid": "total_debt_repaid",
    "Net Debt Issued (Repaid)": "net_debt_issued",
    
    # Equity
    "Issuance of Common Stock": "share_issuances",
    "Repurchase of Common Stock": "share_repurchases",
    "Share Repurchases": "share_repurchases",
    "Common Dividends Paid": "dividends_paid",
    "Dividends Paid": "dividends_paid",
    
    # Banking Specific
    "Net Increase (Decrease) in Deposit Accounts": "net_increase_deposits",
    "Other Financing Activities": "other_financing_activities",
    
    # Effects on Cash
    "Miscellaneous Cash Flow Adjustments": "misc_cash_flow_adj",
    
    # Financing Cash Flow Total
    "Financing Cash Flow": "cash_from_financing",
    "Cash from Financing Activities": "cash_from_financing",
    
    # ============ SUMMARY ============
    "Foreign Exchange Rate Adjustments": "fx_effect",
    "Net Cash Flow": "net_change_cash",
    "Net Change in Cash": "net_change_cash",
    
    # ============ FREE CASH FLOW ============
    "Free Cash Flow": "free_cashflow",
    "Free Cash Flow Growth": "fcf_growth",
    "Free Cash Flow Margin": "fcf_margin",
    "Free Cash Flow Per Share": "fcf_per_share",
    
    # ============ OTHER METRICS ============
    "Cash Interest Paid": "cash_interest_paid",
    "Cash Income Tax Paid": "cash_income_tax_paid",
    "Levered Free Cash Flow": "levered_fcf",
    "Unlevered Free Cash Flow": "unlevered_fcf",
}

RATIOS_MAPPING = {
    "Market Capitalization": "market_cap",
    "Market Cap Growth": "market_cap_growth",
    "Enterprise Value": "enterprise_value",
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
    "Debt / EBITDA Ratio": "debt_ebitda",
    "Debt / FCF Ratio": "debt_fcf",
    "Asset Turnover": "asset_turnover",
    "Inventory Turnover": "inventory_turnover",
    "Quick Ratio": "quick_ratio",
    "Current Ratio": "current_ratio",
    "Return on Capital Employed (ROCE)": "roce",
    "Earnings Yield": "earnings_yield",
    "FCF Yield": "fcf_yield",
    "Interest Coverage": "interest_coverage",
    "Receivables Turnover": "receivables_turnover",
    "Revenue Per Share": "revenue_per_share",
    "Free Cash Flow Per Share": "fcf_per_share",
    "Book Value Per Share": "book_value_per_share",
    "EV/Sales": "ev_sales",
}


def parse_date(date_str: str) -> Optional[date]:
    """Parse date strings like '2023-12-31' or 'Dec 31, 2023' or 'Sep '25Sep 30, 2025'."""
    if not date_str or date_str == 'n/a':
        return None
    try:
        # 1. Try ISO format
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        pass
    
    try:
        # 2. Try standard format "Dec 31, 2023"
        return datetime.strptime(date_str, "%b %d, %Y").date()
    except ValueError:
        pass

    # 3. Try to find date pattern in messy text (e.g. "Sep '25Sep 30, 2025")
    # Regex for "Mmm D, YYYY" or "Mmm DD, YYYY"
    # Also handle "2023-12-31" inside text
    
    # ISO search
    match_iso = re.search(r'(\d{4}-\d{2}-\d{2})', date_str)
    if match_iso:
         try:
            return datetime.strptime(match_iso.group(1), "%Y-%m-%d").date()
         except: pass

    # Standard date search
    match = re.search(r'([A-Za-z]{3}\.\s*\d{1,2},?\s+\d{4}|[A-Za-z]{3}\s+\d{1,2},?\s+\d{4})', date_str)
    if match:
        clean_date = match.group(1).replace('.', '') # Remove dot from Jan.
        # Normalize commas
        if ',' not in clean_date:
            # "Jan 01 2022" -> insert comma
            parts = clean_date.split()
            if len(parts) == 3:
                clean_date = f"{parts[0]} {parts[1]}, {parts[2]}"
                
        try:
            return datetime.strptime(clean_date, "%b %d, %Y").date()
        except ValueError:
            pass
            
    return None


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
        return value
    except ValueError:
        return None


def parse_year(header: str) -> Optional[int]:
    """Extract fiscal year from header."""
    # Try 4-digit year directly
    match = re.search(r'(?:FY\s*)?(\d{4})', header)
    if match:
        year = int(match.group(1))
        # Skip years before 2015 (often grouped)
        if year >= 2015:
            return year
            
    # Try parsing date-like header "Dec 30, 2023"
    dt = parse_date(header)
    if dt:
        return dt.year
        
    return None


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
                return None
            
            # Rate limited - retry with exponential backoff
            if resp.status_code == 429:
                delay = base_delay * (2 ** attempt)
                logger.warning(f"HTTP 429 (Rate Limited) for {url} - Waiting {delay}s before retry {attempt + 1}/{max_retries}")
                await asyncio.sleep(delay)
                continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                await asyncio.sleep(delay)
                continue
            return None
    
    logger.error(f"Max retries ({max_retries}) exceeded for {url}")
    return None


def parse_table(soup: BeautifulSoup) -> Tuple[List[int], Dict[str, List[Optional[float]]], Dict[int, str]]:
    """Parse financial table from page."""
    years = []
    data = {}
    period_endings = {} # Map year -> date string (YYYY-MM-DD)
    
    table = soup.find('table', class_='financials-table')
    if not table:
        table = soup.find('table')
    
    if not table:
        return years, data, period_endings
    
    rows = table.find_all('tr')
    if not rows:
        return years, data, period_endings
    
    # Parse headers and identify valid year columns by index
    header_cells = rows[0].find_all('th')
    valid_indices = [] # Indices of columns that contain valid years
    
    # cell 0 is label, start from 1
    for i, cell in enumerate(header_cells[1:], start=1):
        text = cell.get_text(strip=True)
        if 'Current' in text or 'TTM' in text:
             # Skip TTM columns - they create invalid future years
             # TTM data should be handled separately if needed
             logger.info(f"Skipping TTM/Current column: {text}")
             continue
        else:
            year = parse_year(text)
            if year:
                years.append(year)
                valid_indices.append(i)
    
    # Parse data rows
    for row in rows[1:]:
        cells = row.find_all(['td', 'th'])
        if not cells or len(cells) < 2:
            continue
        
        line_item = cells[0].get_text(strip=True)
        logger.info(f"Found row: '{line_item}'")
        
        # Handle Period Ending Row explicitly
        # Check case insensitive
        if line_item.lower().strip() in ['period ending', 'fiscal year end date', 'year end date', 'date']:
            logger.info("Processing Period Ending row")
            for year_idx, col_idx in enumerate(valid_indices):
                if col_idx < len(cells):
                    date_text = cells[col_idx].get_text(strip=True)
                    parsed_date = parse_date(date_text)
                    if year_idx < len(years):
                        logger.info(f"Period Ending: Year={years[year_idx]}, Text='{date_text}', Parsed={parsed_date}")
                        if parsed_date:
                            period_endings[years[year_idx]] = parsed_date
            continue

        # Skip non-data rows
        if not line_item or line_item in ['Fiscal Year', '']:
            continue
        if 'Upgrade' in line_item:
            continue
        
        # Parse values only for valid year indices
        values = []
        # Check if row has enough cells
        for idx in valid_indices:
            if idx < len(cells):
                text = cells[idx].get_text(strip=True)
                if 'Upgrade' in text:
                    values.append(None)
                else:
                    values.append(parse_value(text))
            else:
                values.append(None)
        
        if values:
            data[line_item] = values
    
    return years, data, period_endings


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
    
    years, data, period_endings = parse_table(soup)
    if not years or not data:
        return 0
    
    inserted = 0
    async with pool.acquire() as conn:
        # Clear existing data for this symbol/table to prevent pollution/duplicates
        await conn.execute(f"DELETE FROM {table_name} WHERE symbol = $1", symbol)
        
        for i, year in enumerate(years):
            row = {
                "symbol": symbol.upper(),
                "fiscal_year": year,
                "period_type": "annual",
                "currency": "EGP",
            }
            
            # Insert period_ending if we found it
            # Insert period_ending if we found it
            if year in period_endings:
                # Value is already a date object (or string in legacy, but we fixed parse_date)
                # But let's handle if it is a date object
                val = period_endings[year]
                if isinstance(val, (date, datetime)):
                     row["period_ending"] = val
                else:
                     row["period_ending"] = val # hope it's valid string or None

            if "fiscal_quarter" in unique_cols:
                row["fiscal_quarter"] = None
            
            for sa_name, db_col in mapping.items():
                if sa_name in data and i < len(data[sa_name]):
                    # Check for None explicitly
                    val = data[sa_name][i]
                    if val is not None:
                        row[db_col] = val
            
            cols = list(row.keys())
            vals = list(row.values())
            placeholders = ", ".join(f"${i+1}" for i in range(len(cols)))
            
            # Since we deleted first, conflict shouldn't theoretically happen on the same run,
            # but good to keep safe for race conditions (though we are sequential here).
            # We used DELETE, so just INSERT is fine. But let's keep ON CONFLICT DO NOTHING just in case.
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
    match = re.match(r'Q(\d)\s*(\d{4})', text.strip())
    if match:
        quarter = int(match.group(1))
        year = int(match.group(2))
        return year, quarter
    return None, None


def parse_quarterly_table(soup: BeautifulSoup) -> Tuple[List[Tuple[int, int]], Dict[str, List[Optional[float]]], Dict[Tuple[int, int], date]]:
    """Parse quarterly financial table, returning [(year, quarter), ...], data, and dates."""
    periods = []
    data = {}
    period_endings = {}
    
    table = soup.find('table')
    if not table:
        return periods, data, period_endings
    
    rows = table.find_all('tr')
    if not rows:
        return periods, data, period_endings
    
    header_cells = rows[0].find_all('th')
    for i, cell in enumerate(header_cells[1:]): # 0 is label
        text = cell.get_text(strip=True)
        year, quarter = parse_quarter_header(text)
        if year and quarter:
            periods.append((year, quarter))
        else:
            # Keep index sync? No, periods list corresponds to data columns?
            # StockAnalysis columns usually map 1:1 to headers.
            # But if a header fails parse, we might misalign.
            # Let's assume strict columnar mapping 
            pass
            
    if not periods:
        return periods, data, period_endings
    
    # Identify column indices for valid periods
    # We parsed all headers. Let's assume indices 1..N map to periods 0..N-1
    
    for row in rows[1:]:
        cells = row.find_all(['td', 'th'])
        if not cells or len(cells) < 2:
            continue
        
        line_item = cells[0].get_text(strip=True)
        
        # Handle Period Ending Row
        if line_item.lower().strip() in ['period ending', 'date']:
             for i, period in enumerate(periods):
                 col_idx = i + 1
                 if col_idx < len(cells):
                     date_text = cells[col_idx].get_text(strip=True)
                     parsed = parse_date(date_text)
                     if parsed:
                         period_endings[period] = parsed
             continue
        
        if not line_item or line_item in ['Period Ending', 'Fiscal Year', '']:
            continue
        if 'Upgrade' in line_item:
            continue
        
        values = []
        for i in range(len(periods)):
            col_idx = i + 1
            if col_idx < len(cells):
                text = cells[col_idx].get_text(strip=True)
                if 'Upgrade' in text:
                    values.append(None)
                else:
                    values.append(parse_value(text))
            else:
                values.append(None)
        
        if values:
            data[line_item] = values
    
    return periods, data, period_endings


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
    
    periods, data, period_endings = parse_quarterly_table(soup)
    if not periods or not data:
        return 0
    
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
            
            # Add date if found
            if (year, quarter) in period_endings:
                val = period_endings[(year, quarter)]
                if isinstance(val, (date, datetime)):
                     row["period_ending"] = val
                else:
                     row["period_ending"] = val
            
            for sa_name, db_col in mapping.items():
                if sa_name in data and i < len(data[sa_name]):
                    val = data[sa_name][i]
                    if val is not None:
                        row[db_col] = val
            
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


async def fetch_price_snapshot(client: httpx.AsyncClient, symbol: str) -> Optional[Dict]:
    """Fetch current price snapshot for a symbol."""
    soup = await fetch_page(client, symbol, "")
    if not soup:
        return None
        
    try:
        price_div = soup.find('div', class_='text-4xl font-bold inline-block')
        if not price_div:
            price_div = soup.find('div', class_='text-4xl')
            
        if not price_div:
            return None
            
        price_text = price_div.get_text(strip=True).replace(',', '')
        price = float(price_text)
        
        change = 0.0
        change_pct = 0.0
        change_div = soup.find('div', class_='font-semibold inline-block text-lg')
        if change_div:
            change_text = change_div.get_text(strip=True)
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


async def fetch_company_profile(pool: asyncpg.Pool, client: httpx.AsyncClient, symbol: str) -> int:
    """Fetch and insert company profile."""
    soup = await fetch_page(client, symbol, "/company/")
    if not soup:
        return 0
        
    try:
        desc_div = soup.find('div', class_='text-base')
        if not desc_div:
             desc_div = soup.find('div', class_='description')
             
        description = desc_div.get_text(strip=True) if desc_div else None
        
        info = {
            'Sector': None,
            'Industry': None,
            'Employees': None,
            'Website': None
        }
        
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
                        
        if not info['Website']:
            web_link = soup.find('a', text='Company Website')
            if web_link:
                info['Website'] = web_link.get('href')
        
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
        """, symbol, info['Sector'], info['Industry'], description, info['Website'], 
           int(info['Employees'].replace(',', '')) if info['Employees'] and info['Employees'].replace(',', '').isdigit() else None
        )
        return 1
    except Exception as e:
        logger.error(f"Error fetching profile for {symbol}: {e}")
        return 0


async def fetch_historical_data(pool: asyncpg.Pool, client: httpx.AsyncClient, symbol: str) -> int:
    """Fetch and insert historical OHLCV data from /history/"""
    soup = await fetch_page(client, symbol, "/history/")
    if not soup:
        return 0
        
    inserted = 0
    try:
        table = soup.find('table')
        if not table:
            return 0
            
        rows = table.find_all('tr')
        if len(rows) < 2:
            return 0
            
        records = []
        for row in rows[1:]:
            cols = row.find_all('td')
            if len(cols) < 6:
                continue
                
            try:
                date_str = cols[0].get_text(strip=True)
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
        
        if records:
            await pool.executemany("""
                INSERT INTO ohlc_data (symbol, date, open, high, low, close, volume)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (symbol, date) DO UPDATE SET
                    open = EXCLUDED.open,
                    high = EXCLUDED.high,
                    low = EXCLUDED.low,
                    close = EXCLUDED.close,
                    volume = EXCLUDED.volume
            """, records)
            inserted = len(records)
            
        return inserted
    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {e}")
        return 0


async def ingest_symbol(pool: asyncpg.Pool, client: httpx.AsyncClient, symbol: str) -> Dict[str, int]:
    """Ingest all financial data for a symbol."""
    logger.info(f"Ingesting {symbol}...")
    
    counts = {}
    
    # ============ ANNUAL DATA ============
    counts["income"] = await scrape_and_insert(
        pool, client, symbol, "/financials/", "income_statements", INCOME_MAPPING, ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
    )
    await asyncio.sleep(1)
    
    counts["balance"] = await scrape_and_insert(
        pool, client, symbol, "/financials/balance-sheet/", "balance_sheets", BALANCE_MAPPING, ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
    )
    await asyncio.sleep(1)
    
    counts["cashflow"] = await scrape_and_insert(
        pool, client, symbol, "/financials/cash-flow-statement/", "cashflow_statements", CASHFLOW_MAPPING, ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
    )
    await asyncio.sleep(1)
    
    counts["ratios"] = await scrape_and_insert(
        pool, client, symbol, "/financials/ratios/", "financial_ratios_history", RATIOS_MAPPING, ["symbol", "fiscal_year"]
    )
    await asyncio.sleep(1)
    
    # ============ QUARTERLY DATA ============
    counts["income_q"] = await scrape_and_insert_quarterly(
        pool, client, symbol, "/financials/?p=quarterly", "income_statements", INCOME_MAPPING, ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
    )
    await asyncio.sleep(1)
    
    counts["balance_q"] = await scrape_and_insert_quarterly(
        pool, client, symbol, "/financials/balance-sheet/?p=quarterly", "balance_sheets", BALANCE_MAPPING, ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
    )
    await asyncio.sleep(1)
    
    counts["cashflow_q"] = await scrape_and_insert_quarterly(
        pool, client, symbol, "/financials/cash-flow-statement/?p=quarterly", "cashflow_statements", CASHFLOW_MAPPING, ["symbol", "fiscal_year", "fiscal_quarter", "period_type"]
    )
    
    # ============ METADATA & HISTORY ============
    counts["profile"] = await fetch_company_profile(pool, client, symbol)
    await asyncio.sleep(0.5)
    
    counts["history"] = await fetch_historical_data(pool, client, symbol)
    await asyncio.sleep(0.5)

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
    parser.add_argument("--resume", action="store_true", help="Resume from last check")
    args = parser.parse_args()
    
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)
    
    pool = await asyncpg.create_pool(
        db_url, min_size=2, max_size=10, 
        statement_cache_size=0, command_timeout=60
    )
    logger.info("Connected to database")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    client = httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True)
    
    try:
        if args.symbol:
            result = await ingest_symbol(pool, client, args.symbol)
            print(f"\n{args.symbol} ingestion complete: {result}")
        else:
            symbols = await get_egx_symbols(pool, args.limit)
            
            if args.resume:
                async with pool.acquire() as conn:
                    # Logic for resume could be better, but keeping simple for now
                    pass

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
                        if k in totals:
                            totals[k] += v
                    
                    logger.info(f"Progress: {i+1}/{len(symbols)}")
                except Exception as e:
                    logger.error(f"Failed {symbol}: {e}")
                    errors.append(symbol)
                
                await asyncio.sleep(2)
            
            print(f"INGESTION COMPLETE. History Rows: {totals['history']}")

    finally:
        await client.aclose()
        await pool.close()


async def run_ingestion_job(status_callback=None):
    """
    Callable entry point for the scheduler.
    :param status_callback: Optional async function(dict) to update progress
    """
    logger.info("Starting scheduled ingestion job...")
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return {"status": "failed", "error": "DATABASE_URL not set"}

    pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10, statement_cache_size=0, command_timeout=60)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    }
    client = httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True)
    
    start_time = datetime.now()
    totals = {
        "income": 0, "balance": 0, "cashflow": 0, "ratios": 0,
        "income_q": 0, "balance_q": 0, "cashflow_q": 0,
        "profile": 0, "history": 0
    }
    errors = []
    
    try:
        symbols = await get_egx_symbols(pool)
        for i, symbol in enumerate(symbols):
            try:
                counts = await ingest_symbol(pool, client, symbol)
                for k, v in counts.items():
                    if k in totals:
                        totals[k] += v
                logger.info(f"Progress: {i+1}/{len(symbols)}")
            except Exception as e:
                logger.error(f"Failed {symbol}: {e}")
                errors.append(symbol)
            await asyncio.sleep(2)
            
            # Update progress via callback if provided
            if status_callback:
                try:
                    await status_callback({
                        "current_index": i + 1,
                        "total_symbols": len(symbols),
                        "last_symbol": symbol,
                        "percent_complete": round(((i + 1) / len(symbols)) * 100, 1)
                    })
                except Exception as e:
                    logger.error(f"Callback error: {e}")
            
        duration = datetime.now() - start_time
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
