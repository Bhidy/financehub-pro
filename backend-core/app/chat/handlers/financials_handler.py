"""
Financials Handler - FINANCIALS and REVENUE_TREND intents.
Ultra-premium responses with complete data from BOTH market_tickers AND raw_data.
"""

import asyncpg
import json
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime


def _format_number(value: float, decimals: int = 2) -> Optional[str]:
    """Format number with commas and proper scale."""
    if value is None:
        return None
    if abs(value) >= 1_000_000_000:
        return f"{value/1_000_000_000:.2f}B"
    if abs(value) >= 1_000_000:
        return f"{value/1_000_000:.2f}M"
    if abs(value) >= 1_000:
        return f"{value/1_000:.2f}K"
    return f"{value:,.{decimals}f}"


def _format_percent(value: float) -> Optional[str]:
    """Format as percentage."""
    if value is None:
        return None
    # Handle both decimal (0.31) and percentage (31.0) formats
    if abs(value) < 1:
        return f"{value * 100:.2f}%"
    return f"{value:.2f}%"


# Column Mappings for Display - Complete StockAnalysis Parity
INCOME_DISPLAY = {
    # Banking-specific line items
    "interest_income_loans": "Interest Income on Loans",
    "interest_income_investments": "Interest Income on Investments",
    "total_interest_income": "Total Interest Income",
    "interest_expense": "Interest Paid on Deposits",
    "net_interest_income": "Net Interest Income",
    "net_interest_income_growth": "Net Interest Income Growth",
    "trading_income": "Income From Trading Activities",
    "fee_income": "Fee and Commission Income",
    "gain_loss_assets": "Gain (Loss) on Sale of Assets",
    "gain_loss_investments": "Gain (Loss) on Sale of Investments",
    "other_noninterest_income": "Other Non-Interest Income",
    "total_noninterest_income": "Total Non-Interest Income",
    # Standard corporate line items
    "revenue": "Revenue",
    "revenue_growth": "Revenue Growth",
    "cost_of_revenue": "Cost of Revenue",
    "gross_profit": "Gross Profit",
    "gross_margin": "Gross Margin",
    "operating_expenses": "Operating Expenses",
    "rd_expense": "Research & Development",
    "sga_expense": "Selling, General & Admin",
    "depreciation": "Depreciation & Amortization",
    "provision_credit_losses": "Provision for Credit Losses",
    "operating_income": "Operating Income",
    "operating_margin": "Operating Margin",
    "interest_expense_nonop": "Interest Expense (Non-Op)",
    "pretax_income": "Pretax Income",
    "income_tax": "Income Tax Expense",
    "effective_tax_rate": "Effective Tax Rate",
    "net_income": "Net Income",
    "net_income_growth": "Net Income Growth",
    "net_margin": "Profit Margin",
    "eps": "EPS (Basic)",
    "eps_diluted": "EPS (Diluted)",
    "shares_outstanding": "Shares Outstanding",
    "shares_diluted": "Shares Diluted",
    "ebitda": "EBITDA",
    "ebitda_margin": "EBITDA Margin",
    "ebit": "EBIT",
    "ebit_margin": "EBIT Margin",
}

BALANCE_DISPLAY = {
    # Assets
    "cash_equivalents": "Cash & Equivalents",
    "short_term_investments": "Short-Term Investments",
    "accounts_receivable": "Accounts Receivable",
    "inventory": "Inventory",
    "other_current_assets": "Other Current Assets",
    "total_current_assets": "Total Current Assets",
    "investment_securities": "Investment Securities",
    "trading_assets": "Trading Asset Securities",
    "total_investments": "Total Investments",
    "gross_loans": "Gross Loans",
    "allowance_loan_losses": "Allowance for Loan Losses",
    "net_loans": "Net Loans",
    "property_plant_equipment": "Property, Plant & Equipment",
    "ppe_net": "Net PP&E",
    "goodwill": "Goodwill",
    "intangible_assets": "Intangible Assets",
    "other_noncurrent_assets": "Other Non-Current Assets",
    "total_noncurrent_assets": "Total Non-Current Assets",
    "total_assets": "Total Assets",
    # Liabilities
    "accounts_payable": "Accounts Payable",
    "short_term_debt": "Short-Term Debt",
    "current_portion_ltd": "Current Portion of LT Debt",
    "accrued_liabilities": "Accrued Liabilities",
    "deferred_revenue": "Deferred Revenue",
    "other_current_liabilities": "Other Current Liabilities",
    "total_current_liabilities": "Total Current Liabilities",
    "deposits": "Deposits",
    "long_term_debt": "Long-Term Debt",
    "deferred_tax_liabilities": "Deferred Tax Liabilities",
    "other_noncurrent_liabilities": "Other Non-Current Liabilities",
    "total_noncurrent_liabilities": "Total Non-Current Liabilities",
    "total_liabilities": "Total Liabilities",
    # Equity
    "common_stock": "Common Stock",
    "additional_paid_in_capital": "Additional Paid-In Capital",
    "retained_earnings": "Retained Earnings",
    "treasury_stock": "Treasury Stock",
    "accumulated_other_comprehensive_income": "Accumulated OCI",
    "minority_interest": "Minority Interest",
    "total_equity": "Total Stockholders' Equity",
}

CASHFLOW_DISPLAY = {
    # Operating Activities
    "net_income": "Net Income",
    "depreciation_amortization": "Depreciation & Amortization",
    "stock_based_compensation": "Stock-Based Compensation",
    "deferred_taxes": "Deferred Income Taxes",
    "gain_loss_assets": "Gain (Loss) on Sale of Assets",
    "gain_loss_investments": "Gain (Loss) on Sale of Investments",
    "provision_credit_losses": "Provision for Credit Losses",
    "change_in_receivables": "Change in Receivables",
    "change_in_inventory": "Change in Inventory",
    "change_in_payables": "Change in Payables",
    "other_operating_activities": "Other Operating Activities",
    "cash_from_operating": "Operating Cash Flow",
    # Investing Activities
    "capex": "Capital Expenditures",
    "acquisitions": "Acquisitions",
    "investment_purchases": "Purchases of Investments",
    "investment_sales": "Sales of Investments",
    "cash_from_investing": "Investing Cash Flow",
    # Financing Activities
    "dividends_paid": "Dividends Paid",
    "share_repurchases": "Share Repurchases",
    "debt_issued": "Debt Issued",
    "debt_repaid": "Debt Repaid",
    "cash_from_financing": "Financing Cash Flow",
    # Summary
    "net_change_cash": "Net Change in Cash",
    "free_cashflow": "Free Cash Flow",
}

RATIOS_DISPLAY = {
    # Valuation
    "fiscal_year": "Fiscal Year",
    "last_close_price": "Last Close Price",
    "market_cap": "Market Cap",
    "market_cap_growth": "Market Cap Growth",
    "enterprise_value": "Enterprise Value",
    "pe_ratio": "Pe Ratio",
    "pe_forward": "Forward PE",
    "ps_ratio": "Ps Ratio",
    "pb_ratio": "Pb Ratio",
    "pfcf_ratio": "Pfcf Ratio",
    "pocf_ratio": "Pocf Ratio",
    "ev_ebitda": "EV/EBITDA",
    "debt_ebitda": "Debt / EBITDA Ratio",
    "debt_fcf": "Debt / FCF Ratio",
    # Profitability
    "roe": "Return on Equity (ROE)",
    "roa": "Return on Assets (ROA)",
    "roce": "Return on Capital Employed (ROCE)",
    "roic": "Return on Capital (ROIC)",
    "earnings_yield": "Earnings Yield",
    "fcf_yield": "FCF Yield",
    "gross_margin": "Gross Margin",
    "operating_margin": "Operating Margin",
    "net_margin": "Net Margin",
    "asset_turnover": "Asset Turnover",
    "inventory_turnover": "Inventory Turnover",
    # Leverage
    "debt_equity": "Debt / Equity Ratio",
    "debt_assets": "Debt / Assets",
    "current_ratio": "Current Ratio",
    "quick_ratio": "Quick Ratio",
    "interest_coverage": "Interest Coverage",
    # Per Share
    "revenue_per_share": "Revenue Per Share",
    "fcf_per_share": "FCF Per Share",
    "book_value_per_share": "Book Value Per Share",
    # Activity
    "asset_turnover": "Asset Turnover",
    "inventory_turnover": "Inventory Turnover",
    "receivables_turnover": "Receivables Turnover",
    # Others
    "ev_sales": "EV/Sales",
    # Dividends
    "dividend_yield": "Dividend Yield",
    "payout_ratio": "Payout Ratio",
}


async def handle_financials(
    conn: asyncpg.Connection,
    symbol: str,
    statement_type: str = 'income',
    period_type: str = 'annual',
    limit: int = 7,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle FINANCIALS intent.
    Now redirects to the unified 'Financial Explorer' package which returns ALL statements.
    """
    return await handle_financials_package(conn, symbol, period_type, limit, language)


def _parse_raw_data(raw_data: Any) -> Dict[str, Any]:
    """Parse raw_data which may be dict, string, or None."""
    if raw_data is None:
        return {}
    if isinstance(raw_data, dict):
        return raw_data
    if isinstance(raw_data, str):
        try:
            return json.loads(raw_data)
        except:
            return {}
    return {}


async def handle_revenue_trend(conn: asyncpg.Connection, symbol: str, language: str = 'en') -> Dict[str, Any]:
    # Reuse valid logic but update to use income_statements table if preferred
    # For now, sticking to what works or updating if needed.
    # The previous implementation of revenue_trend was simple enough.
    
    # Get company info
    ticker_row = await conn.fetchrow("""
        SELECT name_en, name_ar, market_code, currency
        FROM market_tickers WHERE symbol = $1
    """, symbol)
    
    if not ticker_row:
        return {
            'success': False,
            'error': 'symbol_not_found',
            'message': f"Could not find stock: {symbol}" if language == 'en' else f"لم يتم العثور على السهم: {symbol}",
            'cards': [],
            'actions': []
        }
    
    name = ticker_row['name_ar'] if language == 'ar' else ticker_row['name_en']
    currency = ticker_row['currency'] or 'EGP'

    rows = await conn.fetch("""
        SELECT fiscal_year, revenue, net_income
        FROM income_statements
        WHERE symbol = $1 AND period_type = 'annual' AND revenue > 0
        ORDER BY fiscal_year ASC
        LIMIT 10
    """, symbol)
    
    chart_data = []
    for row in rows:
        if row['revenue']:
             chart_data.append({
                'time': str(row['fiscal_year']),
                'revenue': float(row['revenue']),
                'net_income': float(row['net_income']) if row['net_income'] else 0
            })
            
    if not chart_data:
        return {
            'success': True,
            'message': f"No revenue data available for {symbol}",
            'cards': [],
            'actions': []
        }
    
    # Fetch full financials package to include as a card
    explorer_result = await handle_financials_package(conn, symbol, 'annual', 10, language)
    explorer_cards = explorer_result.get('cards', [])

    if language == 'ar':
        message = f"📈 **اتجاه الإيرادات والأرباح لـ {name}** ({symbol})"
    else:
        message = f"📈 **Revenue & Profit Trend for {name}** ({symbol})"
        

    # Define Actions
    actions = [
        {'label': '📊 Price Chart', 'label_ar': '📊 شارت السعر', 'action_type': 'query', 'payload': f'Chart {symbol}'},
        {'label': '💰 Dividends', 'label_ar': '💰 توزيعات الأرباح', 'action_type': 'query', 'payload': f'Dividends {symbol}'},
    ]

    # Add Egypt-specific suggestions
    is_egx = ticker_row['market_code'] == 'EGX' or currency == 'EGP'
    if is_egx:
        actions.extend([
            {'label': '👥 Shareholders', 'label_ar': '👥 المساهمين', 'action_type': 'query', 'payload': f'{symbol} shareholders'},
            {'label': '⚙️ Technicals', 'label_ar': '⚙️ التحليل الفني', 'action_type': 'query', 'payload': f'{symbol} technicals'},
        ])

    return {
        'success': True, 
        'message': message,
        'cards': [
            {
                'type': 'stock_header',
                'data': {
                    'symbol': symbol,
                    'name': name,
                    'market_code': ticker_row['market_code'],
                    'currency': currency
                }
            }
        ] + explorer_cards,
        'chart': {
            'type': 'financial_growth',
            'symbol': symbol,
            'title': 'Revenue & Net Income' if language == 'en' else 'الإيرادات وصافي الدخل',
            'data': chart_data,
            'range': 'ALL'
        },
        'actions': actions
    }

import asyncio

# ... imports ...

async def handle_financials_package(
    conn: asyncpg.Connection,
    symbol: str, 
    period_type: str = 'annual',
    limit: int = 10,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Fetch ALL financial statements (Income, Balance, Cash, Ratios) in parallel
    and return a single 'financial_explorer' package.
    """
    # 1. Get Ticker Info
    ticker = await conn.fetchrow("""
        SELECT name_en, name_ar, market_code, currency 
        FROM market_tickers WHERE symbol = $1
    """, symbol)
    
    if not ticker:
        return {'success': False, 'message': 'Symbol not found'}

    currency = ticker['currency'] or 'EGP'
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']

    # 2. Define Queries - Fetch BOTH annual and quarterly for frontend switching
    # Annual data
    income_annual = await conn.fetch(
        f"SELECT * FROM income_statements WHERE symbol = $1 AND period_type = 'annual' ORDER BY fiscal_year DESC LIMIT {limit}",
        symbol
    )
    balance_annual = await conn.fetch(
        f"SELECT * FROM balance_sheets WHERE symbol = $1 AND period_type = 'annual' ORDER BY fiscal_year DESC LIMIT {limit}",
        symbol
    )
    cashflow_annual = await conn.fetch(
        f"SELECT * FROM cashflow_statements WHERE symbol = $1 AND period_type = 'annual' ORDER BY fiscal_year DESC LIMIT {limit}",
        symbol
    )
    ratios_rows = await conn.fetch(
        f"SELECT * FROM financial_ratios_history WHERE symbol = $1 ORDER BY fiscal_year DESC LIMIT {limit}",
        symbol
    )
    
    # Quarterly data
    income_quarterly = await conn.fetch(
        "SELECT * FROM income_statements WHERE symbol = $1 AND period_type = 'quarterly' ORDER BY fiscal_year DESC, fiscal_quarter DESC LIMIT 20",
        symbol
    )
    balance_quarterly = await conn.fetch(
        "SELECT * FROM balance_sheets WHERE symbol = $1 AND period_type = 'quarterly' ORDER BY fiscal_year DESC, fiscal_quarter DESC LIMIT 20",
        symbol
    )
    cashflow_quarterly = await conn.fetch(
        "SELECT * FROM cashflow_statements WHERE symbol = $1 AND period_type = 'quarterly' ORDER BY fiscal_year DESC, fiscal_quarter DESC LIMIT 20",
        symbol
    )

    # 3. Process Annual Data
    def extract_years(rows):
        """Extract unique years/periods from rows."""
        seen = set()
        years = []
        for row in rows:
            y = str(row['fiscal_year'])
            q = row.get('fiscal_quarter')
            label = f"Q{q} {y}" if q else y
            if label not in seen:
                seen.add(label)
                years.append(label)
        return years
    
    annual_data = {
        'years': extract_years(income_annual),
        'income': _process_rows(income_annual, INCOME_DISPLAY),
        'balance': _process_rows(balance_annual, BALANCE_DISPLAY),
        'cashflow': _process_rows(cashflow_annual, CASHFLOW_DISPLAY),
        'ratios': _process_rows(ratios_rows, RATIOS_DISPLAY),
        'kpis': _process_rows(ratios_rows, RATIOS_DISPLAY),
    }
    
    quarterly_data = {
        'years': extract_years(income_quarterly),
        'income': _process_rows_quarterly(income_quarterly, INCOME_DISPLAY),
        'balance': _process_rows_quarterly(balance_quarterly, BALANCE_DISPLAY),
        'cashflow': _process_rows_quarterly(cashflow_quarterly, CASHFLOW_DISPLAY),
        'ratios': [],  # Ratios typically only annual
        'kpis': [],
    }

    # Calculate TTM (Trailing Twelve Months)
    # TTM = Sum of last 4 quarters for Income/Cashflow, Latest Quarter for Balance Sheet
    def calculate_ttm(quarterly_rows, display_map, is_snapshot=False):
        if not quarterly_rows or len(quarterly_rows) < 4:
            return []
        
        # Sort by date descending
        sorted_rows = sorted(quarterly_rows, key=lambda x: (x['fiscal_year'], x['fiscal_quarter']), reverse=True)
        
        # We only calculate TTM for the most recent period available
        # But we can calculate it for every TTM window (rolling)
        # For parity with StockAnalysis, usually "TTM" column is just the current TTM
        # But here we will try to provide TTM history if possible, or at least the latest TTM
        
        ttm_rows = []
        # Calculate Rolling TTM
        # We need at least 4 quarters provided
        for i in range(len(sorted_rows) - 3):
            window = sorted_rows[i:i+4]
            current_period = window[0] # Most recent in window
            
            # Label as "TTM" or "TTM Q2 2024" if we have history
            # StockAnalysis usually just shows one "TTM" column at the start
            # But let's build history: "TTM Q2 2024" means sum of Q3'23, Q4'23, Q1'24, Q2'24
            y = str(current_period['fiscal_year'])
            q = current_period.get('fiscal_quarter')
            period_label = f"TTM Q{q} {y}"
            
            # Create a synthetic row for this TTM period
            mapped_data = {}
            
            for col, label in display_map.items():
                if is_snapshot:
                    # Balance Sheet: Take value from most recent quarter in window
                    val = window[0].get(col) 
                else:
                    # Income/Cashflow: Sum of 4 quarters
                    try:
                        vals = [float(r.get(col) or 0) for r in window]
                        # Only sum if we have valid data for most quarters (lax rule)
                        if any(v != 0 for v in vals): 
                            val = sum(vals)
                        else:
                            val = None
                    except (ValueError, TypeError):
                        val = None
                
                mapped_data[col] = val
            
            # Create the TTM row structure expected by UI (year columns)
            # Actually, _process_rows output format is list of {label, values: {period: val}}
            # So we first gather data, then pivot.
            ttm_rows.append({
                'period': period_label,
                'data': mapped_data
            })
            
        return ttm_rows

    def process_ttm_to_ui(ttm_series, display_map):
        if not ttm_series:
            return [], []
            
        ttm_periods = [r['period'] for r in ttm_series]
        processed = []
        
        for col, label in display_map.items():
            row_obj = {
                'label': label,
                'values': {},
                'isGrowth': 'growth' in col,
                'isSubtotal': col in ['revenue', 'gross_profit', 'operating_income', 'net_income', 'total_assets', 'total_equity'],
                'indent': 1 if col not in ['revenue', 'gross_profit', 'operating_income', 'net_income'] else 0
            }
            
            has_val = False
            for entry in ttm_series:
                p = entry['period']
                val = entry['data'].get(col)
                if val is not None:
                    row_obj['values'][p] = val
                    has_val = True
                else:
                    row_obj['values'][p] = None
            
            if has_val:
                processed.append(row_obj)
        return processed, ttm_periods

    # Compute TTM datasets
    ttm_income_series = calculate_ttm(income_quarterly, INCOME_DISPLAY, is_snapshot=False)
    ttm_balance_series = calculate_ttm(balance_quarterly, BALANCE_DISPLAY, is_snapshot=True)
    ttm_cashflow_series = calculate_ttm(cashflow_quarterly, CASHFLOW_DISPLAY, is_snapshot=False)
    
    # Process into UI format
    ttm_income_ui, ttm_periods = process_ttm_to_ui(ttm_income_series, INCOME_DISPLAY)
    ttm_balance_ui, _ = process_ttm_to_ui(ttm_balance_series, BALANCE_DISPLAY)
    ttm_cashflow_ui, _ = process_ttm_to_ui(ttm_cashflow_series, CASHFLOW_DISPLAY)

    ttm_data = {
        'years': ttm_periods,
        'income': ttm_income_ui,
        'balance': ttm_balance_ui,
        'cashflow': ttm_cashflow_ui,
        'ratios': [], 
        'kpis': [],
    }

    # 4. Build response with BOTH datasets
    pkg = {
        'symbol': symbol,
        'currency': currency,
        'period_type': period_type,
        'years': annual_data['years'],  # Default to annual
        'income': annual_data['income'],
        'balance': annual_data['balance'],
        'cashflow': annual_data['cashflow'],
        'ratios': annual_data['ratios'],
        'kpis': annual_data['kpis'],
        # Include both datasets for frontend switching
        'annual_data': annual_data,
        'quarterly_data': quarterly_data,
        'ttm_data': ttm_data,
    }

    # 5. Construct Actions
    actions = [
        {'label': '📊 Price Chart', 'label_ar': '📊 شارت السعر', 'action_type': 'query', 'payload': f'Chart {symbol}'},
        {'label': '💰 Dividends', 'label_ar': '💰 توزيعات الأرباح', 'action_type': 'query', 'payload': f'{symbol} dividends'},
    ]

    is_egx = ticker['market_code'] == 'EGX' or currency == 'EGP'
    if is_egx:
        actions.extend([
            {'label': '👥 Shareholders', 'label_ar': '👥 المساهمين', 'action_type': 'query', 'payload': f'{symbol} shareholders'},
            {'label': '⚙️ Technicals', 'label_ar': '⚙️ التحليل الفني', 'action_type': 'query', 'payload': f'{symbol} technicals'},
        ])

    # 6. Construct Response
    return {
        'success': True,
        'message': f"Financial Explorer for {name}",
        'cards': [
            {
                'type': 'stock_header',
                'data': {
                    'symbol': symbol,
                    'name': name,
                    'market_code': ticker['market_code'],
                    'currency': currency
                }
            },
            {
                'type': 'financial_explorer', # New Mega-Card
                'data': pkg
            }
        ],
        'actions': actions
    }

def _process_rows(rows: List[asyncpg.Record], display_map: Dict[str, str]) -> List[Dict[str, Any]]:
    """Convert DB rows into UI-ready row objects with years as columns."""
    if not rows:
        return []

    # deduplicate years
    years = []
    data_by_year = {}
    seen = set()
    for r in rows:
        y = str(r['fiscal_year'])
        if y not in seen:
            seen.add(y)
            years.append(y)
            data_by_year[y] = dict(r)

    processed = []
    
    # 1. Inject "Period Ending" row if available
    period_ending_row = {
        'label': 'Period Ending',
        'values': {},
        'isGrowth': False,
        'isSubtotal': False,
        'indent': 0,
        'format': 'string' # Hint for frontend
    }
    has_period = False
    for y in years:
        # Check for period_ending in the raw row data
        raw_date = data_by_year.get(y, {}).get('period_ending')
        if raw_date:
            # Format: 2026-01-14 -> Jan 14, 2026
            try:
                # If it's a date object
                if hasattr(raw_date, 'strftime'):
                    val_str = raw_date.strftime("%b %d, %Y")
                # If it's a string (YYYY-MM-DD)
                else:
                    val_str = datetime.strptime(str(raw_date), "%Y-%m-%d").strftime("%b %d, %Y")
                
                period_ending_row['values'][y] = val_str
                has_period = True
            except:
                period_ending_row['values'][y] = None
        else:
            period_ending_row['values'][y] = None
            
    if has_period:
        processed.append(period_ending_row)

    # 2. Process standard columns
    for col, label in display_map.items():
        row_obj = {
            'label': label,
            'values': {},
            'isGrowth': 'growth' in col,
            'isSubtotal': col in ['revenue', 'gross_profit', 'operating_income', 'net_income', 'total_assets', 'total_equity'],
            'indent': 1 if col not in ['revenue', 'gross_profit', 'operating_income', 'net_income'] else 0
        }
        
        has_val = False
        for y in years:
            val = data_by_year.get(y, {}).get(col)
            if val is not None:
                try:
                    row_obj['values'][y] = float(val)
                    has_val = True
                except (ValueError, TypeError):
                    # Skip non-numeric values (like currency strings)
                    row_obj['values'][y] = None
            else:
                row_obj['values'][y] = None
            
        if has_val:
            processed.append(row_obj)
            
    return processed


def _process_rows_quarterly(rows: List[asyncpg.Record], display_map: Dict[str, str]) -> List[Dict[str, Any]]:
    """Convert quarterly DB rows into UI-ready row objects with Q1 2024 style labels."""
    if not rows:
        return []

    # Build period labels and map data
    periods = []
    data_by_period = {}
    seen = set()
    for r in rows:
        y = str(r['fiscal_year'])
        q = r.get('fiscal_quarter')
        label = f"Q{q} {y}" if q else y
        if label not in seen:
            seen.add(label)
            periods.append(label)
            data_by_period[label] = dict(r)

    processed = []
    
    # 1. Inject "Period Ending" row if available
    period_ending_row = {
        'label': 'Period Ending',
        'values': {},
        'isGrowth': False,
        'isSubtotal': False,
        'indent': 0,
        'format': 'string'
    }
    has_period = False
    for period in periods:
        raw_date = data_by_period.get(period, {}).get('period_ending')
        if raw_date:
            try:
                if hasattr(raw_date, 'strftime'):
                    val_str = raw_date.strftime("%b %d, %Y")
                else:
                    val_str = datetime.strptime(str(raw_date), "%Y-%m-%d").strftime("%b %d, %Y")
                period_ending_row['values'][period] = val_str
                has_period = True
            except:
                period_ending_row['values'][period] = None
        else:
             period_ending_row['values'][period] = None

    if has_period:
        processed.append(period_ending_row)

    # 2. Process standard columns
    for col, label in display_map.items():
        row_obj = {
            'label': label,
            'values': {},
            'isGrowth': 'growth' in col,
            'isSubtotal': col in ['revenue', 'gross_profit', 'operating_income', 'net_income', 'total_assets', 'total_equity'],
            'indent': 1 if col not in ['revenue', 'gross_profit', 'operating_income', 'net_income'] else 0
        }
        
        has_val = False
        for period in periods:
            val = data_by_period.get(period, {}).get(col)
            if val is not None:
                try:
                    row_obj['values'][period] = float(val)
                    has_val = True
                except (ValueError, TypeError):
                    row_obj['values'][period] = None
            else:
                row_obj['values'][period] = None
            
        if has_val:
            processed.append(row_obj)
            
    return processed


async def handle_financial_metric(
    conn: asyncpg.Connection,
    symbol: str,
    intent: str,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle deep financial metrics like MARGINS, DEBT, CASH, GROWTH, EPS.
    Computes real-time from financial statements to ensure data availability.
    """
    # 1. Get Company Info
    ticker = await conn.fetchrow("SELECT name_en, name_ar, currency, market_code FROM market_tickers WHERE symbol = $1", symbol)
    if not ticker: return {'success': False, 'message': 'Symbol not found'}
    
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    curr = ticker['currency'] or 'EGP'
    
    # 2. Fetch Latest Financials (Income Statement & Balance Sheet)
    # Get last 2 years to calculate growth if needed
    income_rows = await conn.fetch("""
        SELECT * FROM income_statements 
        WHERE symbol = $1 AND period_type = 'annual' 
        ORDER BY fiscal_year DESC LIMIT 2
    """, symbol)
    
    balance_row = await conn.fetchrow("""
        SELECT * FROM balance_sheets 
        WHERE symbol = $1 AND period_type = 'annual' 
        ORDER BY fiscal_year DESC LIMIT 1
    """, symbol)
    
    latest_income = income_rows[0] if income_rows else None
    prev_income = income_rows[1] if len(income_rows) > 1 else None
    
    if not latest_income:
        return {
            'success': True, # success=True but with message
            'message': f"No financial data available for {symbol}.",
            'cards': []
        }
        
    year = latest_income['fiscal_year']
    
    # 3. Compute Metrics based on Intent
    data_points = {}
    title_en = ""
    title_ar = ""
    insight_en = ""
    insight_ar = ""
    
    def safe_div(n, d):
        return n / d if d and d != 0 else None

    revenue = float(latest_income.get('revenue') or 0)
    net_income = float(latest_income.get('net_income') or 0)
    
    if intent == "FIN_MARGINS":
        title_en = "Profitability Margins"
        title_ar = "هوامش الربحية"
        
        # Calculate
        gross_profit = float(latest_income.get('gross_profit') or 0)
        op_income = float(latest_income.get('operating_income') or 0)
        
        gross_margin = safe_div(gross_profit, revenue)
        op_margin = safe_div(op_income, revenue)
        net_margin = safe_div(net_income, revenue)
        
        data_points = {
            "Gross Margin": _format_percent(gross_margin),
            "Operating Margin": _format_percent(op_margin),
            "Net Profit Margin": _format_percent(net_margin),
            "Revenue": _format_number(revenue),
            "Net Income": _format_number(net_income)
        }
        
        # Insight
        if net_margin:
            insight_en = f"{name} generated a Net Profit Margin of **{net_margin*100:.1f}%** in {year}."
            insight_ar = f"حققت {name} هامش صافي ربح قدره **{net_margin*100:.1f}%** في عام {year}."
            
    elif intent == "FIN_GROWTH":
        title_en = "Growth Trajectory"
        title_ar = "مسار النمو"
        
        rev_growth = None
        ni_growth = None
        
        if prev_income:
            prev_rev = float(prev_income.get('revenue') or 0)
            prev_ni = float(prev_income.get('net_income') or 0)
            
            rev_growth = safe_div(revenue - prev_rev, prev_rev)
            ni_growth = safe_div(net_income - prev_ni, abs(prev_ni))
            
        data_points = {
            "Revenue Growth (YoY)": _format_percent(rev_growth),
            "Net Income Growth": _format_percent(ni_growth),
            "Current Revenue": _format_number(revenue),
            "Current Net Income": _format_number(net_income)
        }
        
        if rev_growth:
            direction = "grew" if rev_growth > 0 else "declined"
            insight_en = f"Revenue {direction} by **{abs(rev_growth)*100:.1f}%** vs previous year."
            direction_ar = "نمو" if rev_growth > 0 else "انخفاض"
            insight_ar = f"شهدت الإيرادات {direction_ar} بنسبة **{abs(rev_growth)*100:.1f}%** مقارنة بالعام السابق."

    elif intent == "FIN_DEBT":
        title_en = "Debt & Leverage"
        title_ar = "الديون والرافعة المالية"
        
        if balance_row:
            total_assets = float(balance_row.get('total_assets') or 0)
            total_equity = float(balance_row.get('total_equity') or 0)
            lt_debt = float(balance_row.get('long_term_debt') or 0)
            st_debt = float(balance_row.get('short_term_debt') or 0)
            total_debt = lt_debt + st_debt
            
            debt_equity = safe_div(total_debt, total_equity)
            debt_assets = safe_div(total_debt, total_assets)
            
            de_str = f"{debt_equity:.2f}x" if debt_equity else None
            da_str = _format_percent(debt_assets)
            
            data_points = {
                "Debt / Equity": de_str,
                "Debt / Assets": da_str,
                "Total Debt": _format_number(total_debt),
                "Total Equity": _format_number(total_equity)
            }
        else:
             data_points = {"Status": "No Balance Sheet Data"}

    elif intent == "FIN_EPS":
        title_en = "Earnings Per Share"
        title_ar = "ربحية السهم"
        
        eps = float(latest_income.get('eps') or 0)
        eps_diluted = float(latest_income.get('eps_diluted') or 0)
        
        data_points = {
            "Basic EPS": f"{eps:.2f} {curr}",
            "Diluted EPS": f"{eps_diluted:.2f} {curr}",
            "Net Income": _format_number(net_income)
        }
        
    # Default fallback
    if not data_points:
        return await handle_financials(conn, symbol, 'income', 'annual', 5, language)

    # Message - Comprehensive Data Update
    insight = insight_ar if language == 'ar' else insight_en
    title = title_ar if language == 'ar' else title_en
    
    message_text = f"📊 **{title}** for {name} ({year})\n\n{insight}\n\n"
    
    # Add Data Table explicitly to message text
    if language == 'ar':
        message_text += "**أبرز الأرقام:**\n"
    else:
        message_text += "**Key Figures:**\n"
        
    for k, v in data_points.items():
        # Ensure we don't show internal N/A if possible, or do show it but formatted
        if v:
            message_text += f"- **{k}**: {v}\n"

    actions = [
        {'label': '📑 Income Statement', 'label_ar': '📑 قائمة الدخل', 'action_type': 'query', 'payload': f'Financials {symbol}'},
        {'label': '📈 Revenue Trend', 'label_ar': '📈 اتجاه الإيرادات', 'action_type': 'query', 'payload': f'Revenue trend {symbol}'},
    ]

    return {
        'success': True,
        'message': message_text,
        'cards': [
            {
                'type': 'stats',
                'title': title_ar if language == 'ar' else title_en,
                'data': data_points
            }
        ],
        'actions': actions
    }

async def handle_ratio_analysis(
    conn: asyncpg.Connection,
    symbol: str,
    intent: str,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Handle deep ratio analysis: VALUATION, EFFICIENCY, LIQUIDITY.
    """
    # Reuse logic basically
    ticker = await conn.fetchrow("SELECT name_en, name_ar, currency FROM market_tickers WHERE symbol = $1", symbol)
    if not ticker: return {'success': False, 'message': 'Symbol not found'}
    
    name = ticker['name_ar'] if language == 'ar' else ticker['name_en']
    
    cols = []
    title_en = ""
    title_ar = ""
    
    if intent == "RATIO_VALUATION":
        cols = ['pe_ratio', 'pb_ratio', 'ps_ratio', 'peg_ratio', 'ev_ebitda']
        title_en = "Valuation Ratios"
        title_ar = "مؤشرات التقييم"
    elif intent == "RATIO_EFFICIENCY":
        cols = ['roe', 'roa', 'roic', 'asset_turnover', 'inventory_turnover']
        title_en = "Efficiency & Returns"
        title_ar = "الكفاءة والعائد"
    elif intent == "RATIO_LIQUIDITY":
        cols = ['current_ratio', 'quick_ratio', 'debt_equity']
        title_en = "Liquidity & Health"
        title_ar = "السيولة والصحة المالية"
        
    row = await conn.fetchrow(f"""
        SELECT fiscal_year, {', '.join(cols)}
        FROM financial_ratios_history 
        WHERE symbol = $1 
        ORDER BY fiscal_year DESC LIMIT 1
    """, symbol)
    
    if not row:
        return {'success': False, 'message': "No ratio data available."}
        
    data_points = {}
    for c in cols:
        val = row[c]
        if val is None:
            data_points[c] = "N/A"
            continue
            
        if 'turnover' in c or 'ratio' in c or 'pe' in c or 'pb' in c or 'peg' in c or 'ps' in c or 'ev' in c:
             # These are multiples (e.g. 15.4x)
             fmt = f"{val:.2f}x"
        else:
             # Percentages (ROE, ROA)
             fmt = f"{val * 100:.2f}%"
             
        label = c.replace('_', ' ').title().replace('Pe', 'P/E').replace('Pb', 'P/B').replace('Ps', 'P/S').replace('Peg', 'PEG').replace('Ev', 'EV').replace('Ebitda', 'EBITDA').replace('Roe', 'ROE').replace('Roa', 'ROA').replace('Roic', 'ROIC')
        data_points[label] = fmt
        
    return {
        'success': True,
        'message': f"🔍 **{title_ar if language == 'ar' else title_en}** for {name} ({row['fiscal_year']})",
        'cards': [
            {
                'type': 'stats',
                'title': title_ar if language == 'ar' else title_en,
                'data': data_points
            }
        ]
    }
