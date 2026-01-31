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
# FORMAT: list of tuples (db_column, display_label, options_dict)
# Options: isSubtotal, isPercent, isGrowth, indent, section

# ORDERED INCOME STATEMENT DISPLAY (matches stockanalysis.com exactly)
INCOME_DISPLAY_ORDERED = [
    # ============ BANKING TEMPLATE ============
    # Period Info
    ("period_ending", "Period Ending", {"isHeader": True}),
    
    # Interest Income Section
    ("interest_income_loans", "Interest Income on Loans", {"indent": 1}),
    ("interest_income_investments", "Interest Income on Investments", {"indent": 1}),
    ("total_interest_income", "Total Interest Income", {"isSubtotal": True}),
    ("interest_expense", "Interest Paid on Deposits", {"indent": 1}),
    ("net_interest_income", "Net Interest Income", {"isSubtotal": True}),
    ("net_interest_income_growth", "Net Interest Income Growth", {"isPercent": True, "isGrowth": True}),
    
    # Non-Interest Income Section
    ("trading_income", "Income From Trading Activities", {"indent": 1}),
    ("fee_income", "Fee and Commission Income", {"indent": 1}),
    ("gain_loss_assets", "Gain (Loss) on Sale of Assets", {"indent": 1}),
    ("gain_loss_investments", "Gain (Loss) on Sale of Investments", {"indent": 1}),
    ("other_noninterest_income", "Other Non-Interest Income", {"indent": 1}),
    ("total_noninterest_income", "Total Non-Interest Income", {"isSubtotal": True}),
    ("noninterest_income_growth", "Non-Interest Income Growth", {"isPercent": True, "isGrowth": True}),
    
    # Banking Revenue Total
    ("revenues_before_loan_losses", "Revenues Before Loan Losses", {"isSubtotal": True}),
    ("provision_credit_losses", "Provision for Loan Losses", {"indent": 1}),
    
    # ============ CORPORATE TEMPLATE ============
    # Revenue Section
    ("revenue", "Revenue", {"isSubtotal": True}),
    ("revenue_growth", "Revenue Growth", {"isPercent": True, "isGrowth": True}),
    
    # Cost & Gross Profit
    ("cost_of_revenue", "Cost of Revenue", {"indent": 1}),
    ("gross_profit", "Gross Profit", {"isSubtotal": True}),
    ("gross_margin", "Gross Margin", {"isPercent": True}),
    
    # Operating Expenses
    ("sga_expense", "Selling, General & Admin", {"indent": 1}),
    ("other_operating_expenses", "Other Operating Expenses", {"indent": 1}),
    ("operating_expenses", "Operating Expenses", {"isSubtotal": True}),
    ("rd_expense", "Research & Development", {"indent": 1}),
    ("depreciation", "Depreciation & Amortization", {"indent": 1}),
    
    # Banking Expenses
    ("salaries_and_benefits", "Salaries and Employee Benefits", {"indent": 1}),
    ("amortization_of_goodwill", "Amortization of Goodwill & Intangibles", {"indent": 1}),
    ("other_noninterest_expense", "Other Non-Interest Expense", {"indent": 1}),
    ("total_noninterest_expense", "Total Non-Interest Expense", {"isSubtotal": True}),
    
    # Operating Income
    ("operating_income", "Operating Income", {"isSubtotal": True}),
    ("operating_margin", "Operating Margin", {"isPercent": True}),
    
    # Non-Operating Items
    ("interest_expense_nonop", "Interest Expense", {"indent": 1}),
    ("interest_investment_income", "Interest & Investment Income", {"indent": 1}),
    ("earnings_equity_investments", "Earnings From Equity Investments", {"indent": 1}),
    ("fx_gain_loss", "Currency Exchange Gain (Loss)", {"indent": 1}),
    ("other_nonop_income", "Other Non Operating Income (Expenses)", {"indent": 1}),
    
    # Unusual Items (Pre-Tax)
    ("ebt_excl_unusual", "EBT Excluding Unusual Items", {"isSubtotal": True}),
    ("impairment_goodwill", "Impairment of Goodwill", {"indent": 1}),
    ("asset_writedown", "Asset Writedown", {"indent": 1}),
    ("other_unusual_items", "Other Unusual Items", {"indent": 1}),
    ("pretax_income", "Pretax Income", {"isSubtotal": True}),
    ("income_tax", "Income Tax Expense", {"indent": 1}),
    ("effective_tax_rate", "Effective Tax Rate", {"isPercent": True}),
    
    # Net Income Section
    ("earnings_continuing_ops", "Earnings From Continuing Operations", {"indent": 1}),
    ("earnings_discontinued_ops", "Earnings From Discontinued Operations", {"indent": 1}),
    ("minority_interest_earnings", "Minority Interest in Earnings", {"indent": 1}),
    ("net_income", "Net Income", {"isSubtotal": True}),
    ("preferred_dividends", "Preferred Dividends & Other Adjustments", {"indent": 1}),
    ("net_income_common", "Net Income to Common", {"isSubtotal": True}),
    ("net_income_growth", "Net Income Growth", {"isPercent": True, "isGrowth": True}),
    ("net_margin", "Profit Margin", {"isPercent": True}),
    
    # Shares & EPS
    ("shares_outstanding", "Basic Shares Outstanding", {}),
    ("shares_diluted", "Diluted Shares Outstanding", {}),
    ("shares_change", "Shares Change", {"isPercent": True, "isGrowth": True}),
    ("eps", "EPS (Basic)", {}),
    ("eps_diluted", "EPS (Diluted)", {}),
    ("eps_growth", "EPS Growth", {"isPercent": True, "isGrowth": True}),
    
    # Dividends
    ("dividend_per_share", "Dividend Per Share", {}),
    ("dividend_growth", "Dividend Growth", {"isPercent": True, "isGrowth": True}),
    
    # Cash Flow Metrics (in Income tab)
    ("free_cashflow", "Free Cash Flow", {}),
    ("fcf_per_share", "Free Cash Flow Per Share", {}),
    ("fcf_margin", "Free Cash Flow Margin", {"isPercent": True}),
    
    # EBITDA/EBIT
    ("ebitda", "EBITDA", {"isSubtotal": True}),
    ("ebitda_margin", "EBITDA Margin", {"isPercent": True}),
    ("da_for_ebitda", "D&A For EBITDA", {"indent": 1}),
    ("ebit", "EBIT", {"isSubtotal": True}),
    ("ebit_margin", "EBIT Margin", {"isPercent": True}),
]

# ORDERED BALANCE SHEET DISPLAY
BALANCE_DISPLAY_ORDERED = [
    # Period Info
    ("period_ending", "Period Ending", {"isHeader": True}),
    
    # ============ ASSETS ============
    # Cash & Investments
    ("cash_equivalents", "Cash & Equivalents", {"indent": 1}),
    ("short_term_investments", "Short-Term Investments", {"indent": 1}),
    ("trading_assets", "Trading Asset Securities", {"indent": 1}),
    ("cash_and_st_investments", "Cash & Short-Term Investments", {"isSubtotal": True}),
    ("cash_growth", "Cash Growth", {"isPercent": True, "isGrowth": True}),
    
    # Receivables
    ("accounts_receivable", "Accounts Receivable", {"indent": 1}),
    ("other_receivables", "Other Receivables", {"indent": 1}),
    ("total_receivables", "Receivables", {"isSubtotal": True}),
    
    # Inventory & Current
    ("inventory", "Inventory", {"indent": 1}),
    ("prepaid_expenses", "Prepaid Expenses", {"indent": 1}),
    ("other_current_assets", "Other Current Assets", {"indent": 1}),
    ("total_current_assets", "Total Current Assets", {"isSubtotal": True}),
    
    # Banking Assets
    ("investment_securities", "Investment Securities", {"indent": 1}),
    ("total_investments", "Total Investments", {"isSubtotal": True}),
    ("gross_loans", "Gross Loans", {"indent": 1}),
    ("allowance_loan_losses", "Allowance for Loan Losses", {"indent": 1}),
    ("other_loan_adjustments", "Other Adjustments to Gross Loans", {"indent": 1}),
    ("net_loans", "Net Loans", {"isSubtotal": True}),
    
    # Fixed Assets
    ("property_plant_equipment", "Property, Plant & Equipment", {"indent": 1}),
    ("long_term_investments", "Long-Term Investments", {"indent": 1}),
    ("goodwill", "Goodwill", {"indent": 1}),
    ("intangible_assets", "Other Intangible Assets", {"indent": 1}),
    ("lt_accounts_receivable", "Long-Term Accounts Receivable", {"indent": 1}),
    ("lt_deferred_tax_assets", "Long-Term Deferred Tax Assets", {"indent": 1}),
    ("other_noncurrent_assets", "Other Long-Term Assets", {"indent": 1}),
    
    # Banking Specific
    ("accrued_interest_receivable", "Accrued Interest Receivable", {"indent": 1}),
    ("restricted_cash", "Restricted Cash", {"indent": 1}),
    ("other_real_estate_owned", "Other Real Estate Owned", {"indent": 1}),
    
    # Total Assets
    ("total_assets", "Total Assets", {"isSubtotal": True}),
    
    # ============ LIABILITIES ============
    # Current Liabilities
    ("accounts_payable", "Accounts Payable", {"indent": 1}),
    ("accrued_liabilities", "Accrued Expenses", {"indent": 1}),
    ("short_term_debt", "Short-Term Debt", {"indent": 1}),
    ("current_portion_ltd", "Current Portion of Long-Term Debt", {"indent": 1}),
    ("current_portion_leases", "Current Portion of Leases", {"indent": 1}),
    ("current_taxes_payable", "Current Income Taxes Payable", {"indent": 1}),
    ("deferred_revenue", "Current Unearned Revenue", {"indent": 1}),
    ("other_current_liabilities", "Other Current Liabilities", {"indent": 1}),
    ("total_current_liabilities", "Total Current Liabilities", {"isSubtotal": True}),
    
    # Banking Liabilities
    ("interest_bearing_deposits", "Interest Bearing Deposits", {"indent": 1}),
    ("non_interest_bearing_deposits", "Non-Interest Bearing Deposits", {"indent": 1}),
    ("deposits", "Total Deposits", {"isSubtotal": True}),
    ("accrued_interest_payable", "Accrued Interest Payable", {"indent": 1}),
    
    # Long-Term Liabilities
    ("long_term_debt", "Long-Term Debt", {"indent": 1}),
    ("long_term_leases", "Long-Term Leases", {"indent": 1}),
    ("deferred_tax_liabilities", "Long-Term Deferred Tax Liabilities", {"indent": 1}),
    ("other_noncurrent_liabilities", "Other Long-Term Liabilities", {"indent": 1}),
    ("total_liabilities", "Total Liabilities", {"isSubtotal": True}),
    
    # ============ EQUITY ============
    ("common_stock", "Common Stock", {"indent": 1}),
    ("retained_earnings", "Retained Earnings", {"indent": 1}),
    ("treasury_stock", "Treasury Stock", {"indent": 1}),
    ("accumulated_other_comprehensive_income", "Comprehensive Income & Other", {"indent": 1}),
    ("total_common_equity", "Total Common Equity", {"isSubtotal": True}),
    ("minority_interest", "Minority Interest", {"indent": 1}),
    ("total_equity", "Shareholders' Equity", {"isSubtotal": True}),
    ("total_liabilities_equity", "Total Liabilities & Equity", {"isSubtotal": True}),
    
    # ============ DERIVED METRICS ============
    ("total_debt", "Total Debt", {}),
    ("net_cash", "Net Cash (Debt)", {}),
    ("net_cash_growth", "Net Cash Growth", {"isPercent": True, "isGrowth": True}),
    ("net_cash_per_share", "Net Cash Per Share", {}),
    ("shares_outstanding", "Total Common Shares Outstanding", {}),
    ("working_capital", "Working Capital", {}),
    ("book_value_per_share", "Book Value Per Share", {}),
    ("tangible_book_value", "Tangible Book Value", {}),
    ("tangible_bv_per_share", "Tangible Book Value Per Share", {}),
]

# ORDERED CASH FLOW DISPLAY
CASHFLOW_DISPLAY_ORDERED = [
    # Period Info
    ("period_ending", "Period Ending", {"isHeader": True}),
    
    # ============ OPERATING ACTIVITIES ============
    ("net_income", "Net Income", {"isSubtotal": True}),
    ("depreciation_amortization", "Depreciation & Amortization", {"indent": 1}),
    ("other_amortization", "Other Amortization", {"indent": 1}),
    ("stock_based_compensation", "Stock-Based Compensation", {"indent": 1}),
    ("deferred_taxes", "Deferred Income Taxes", {"indent": 1}),
    
    # Gains/Losses
    ("gain_loss_assets", "Loss (Gain) From Sale of Assets", {"indent": 1}),
    ("gain_loss_investments", "Loss (Gain) From Sale of Investments", {"indent": 1}),
    ("asset_writedown", "Total Asset Writedown", {"indent": 1}),
    
    # Provisions
    ("provision_credit_losses", "Provision for Credit Losses", {"indent": 1}),
    
    # Working Capital Changes
    ("change_in_trading_assets", "Change in Trading Asset Securities", {"indent": 1}),
    ("change_in_income_taxes", "Change in Income Taxes", {"indent": 1}),
    ("change_in_other_assets", "Change in Other Net Operating Assets", {"indent": 1}),
    ("change_in_receivables", "Change in Accounts Receivable", {"indent": 1}),
    ("change_in_inventory", "Change in Inventory", {"indent": 1}),
    ("change_in_payables", "Change in Accounts Payable", {"indent": 1}),
    ("change_in_working_capital", "Change in Working Capital", {"indent": 1}),
    ("other_operating_activities", "Other Operating Activities", {"indent": 1}),
    ("cash_discontinued_ops", "Net Cash from Discontinued Operations", {"indent": 1}),
    
    # Operating Total
    ("cash_from_operating", "Operating Cash Flow", {"isSubtotal": True}),
    ("ocf_growth", "Operating Cash Flow Growth", {"isPercent": True, "isGrowth": True}),
    
    # ============ INVESTING ACTIVITIES ============
    ("capex", "Capital Expenditures", {"indent": 1}),
    ("sale_of_ppe", "Sale of Property, Plant and Equipment", {"indent": 1}),
    ("acquisitions", "Cash Acquisitions", {"indent": 1}),
    ("investment_purchases", "Investment in Securities", {"indent": 1}),
    ("investment_sales", "Sales of Investments", {"indent": 1}),
    ("intangibles_purchased", "Sale (Purchase) of Intangibles", {"indent": 1}),
    ("equity_investment_income", "Income (Loss) Equity Investments", {"indent": 1}),
    ("divestitures", "Divestitures", {"indent": 1}),
    ("other_investing_activities", "Other Investing Activities", {"indent": 1}),
    
    # Investing Total
    ("cash_from_investing", "Investing Cash Flow", {"isSubtotal": True}),
    
    # ============ FINANCING ACTIVITIES ============
    # Debt
    ("short_term_debt_issued", "Short-Term Debt Issued", {"indent": 1}),
    ("debt_issued", "Long-Term Debt Issued", {"indent": 1}),
    ("total_debt_issued", "Total Debt Issued", {"indent": 1}),
    ("short_term_debt_repaid", "Short-Term Debt Repaid", {"indent": 1}),
    ("debt_repaid", "Long-Term Debt Repaid", {"indent": 1}),
    ("total_debt_repaid", "Total Debt Repaid", {"indent": 1}),
    ("net_debt_issued", "Net Debt Issued (Repaid)", {"indent": 1}),
    
    # Equity
    ("share_issuances", "Issuance of Common Stock", {"indent": 1}),
    ("share_repurchases", "Repurchase of Common Stock", {"indent": 1}),
    ("dividends_paid", "Common Dividends Paid", {"indent": 1}),
    
    # Banking
    ("net_increase_deposits", "Net Increase (Decrease) in Deposit Accounts", {"indent": 1}),
    ("other_financing_activities", "Other Financing Activities", {"indent": 1}),
    
    # Financing Total
    ("cash_from_financing", "Financing Cash Flow", {"isSubtotal": True}),
    
    # ============ SUMMARY ============
    ("fx_effect", "Foreign Exchange Rate Adjustments", {"indent": 1}),
    ("net_change_cash", "Net Cash Flow", {"isSubtotal": True}),
    
    # ============ FREE CASH FLOW ============
    ("free_cashflow", "Free Cash Flow", {"isSubtotal": True}),
    ("fcf_growth", "Free Cash Flow Growth", {"isPercent": True, "isGrowth": True}),
    ("fcf_margin", "Free Cash Flow Margin", {"isPercent": True}),
    ("fcf_per_share", "Free Cash Flow Per Share", {}),
    
    # ============ OTHER ============
    ("cash_interest_paid", "Cash Interest Paid", {"indent": 1}),
    ("cash_income_tax_paid", "Cash Income Tax Paid", {"indent": 1}),
    ("levered_fcf", "Levered Free Cash Flow", {}),
    ("unlevered_fcf", "Unlevered Free Cash Flow", {}),
]

# ORDERED RATIOS DISPLAY
RATIOS_DISPLAY_ORDERED = [
    # Period
    ("fiscal_year", "Fiscal Year", {"isHeader": True}),
    
    # ============ VALUATION ============
    ("last_close_price", "Last Close Price", {}),
    ("market_cap", "Market Capitalization", {}),
    ("market_cap_growth", "Market Cap Growth", {"isPercent": True, "isGrowth": True}),
    ("enterprise_value", "Enterprise Value", {}),
    ("pe_ratio", "PE Ratio", {}),
    ("pe_forward", "Forward PE", {}),
    ("peg_ratio", "PEG Ratio", {}),
    ("ps_ratio", "PS Ratio", {}),
    ("pb_ratio", "PB Ratio", {}),
    ("ptbv_ratio", "P/TBV Ratio", {}),
    ("pfcf_ratio", "P/FCF Ratio", {}),
    ("pocf_ratio", "P/OCF Ratio", {}),
    ("ev_ebitda", "EV/EBITDA", {}),
    ("ev_sales", "EV/Sales", {}),
    ("earnings_yield", "Earnings Yield", {"isPercent": True}),
    ("fcf_yield", "FCF Yield", {"isPercent": True}),
    
    # ============ PROFITABILITY ============
    ("roe", "Return on Equity (ROE)", {"isPercent": True}),
    ("roa", "Return on Assets (ROA)", {"isPercent": True}),
    ("roic", "Return on Capital (ROIC)", {"isPercent": True}),
    ("roce", "Return on Capital Employed (ROCE)", {"isPercent": True}),
    ("gross_margin", "Gross Margin", {"isPercent": True}),
    ("operating_margin", "Operating Margin", {"isPercent": True}),
    ("net_margin", "Profit Margin", {"isPercent": True}),
    
    # ============ LEVERAGE ============
    ("debt_equity", "Debt / Equity Ratio", {}),
    ("debt_assets", "Debt / Assets", {}),
    ("debt_ebitda", "Debt / EBITDA", {}),
    ("debt_fcf", "Debt / FCF", {}),
    ("interest_coverage", "Interest Coverage", {}),
    ("current_ratio", "Current Ratio", {}),
    ("quick_ratio", "Quick Ratio", {}),
    
    # ============ EFFICIENCY ============
    ("asset_turnover", "Asset Turnover", {}),
    ("inventory_turnover", "Inventory Turnover", {}),
    ("receivables_turnover", "Receivables Turnover", {}),
    
    # ============ PER SHARE ============
    ("revenue_per_share", "Revenue Per Share", {}),
    ("fcf_per_share", "Free Cash Flow Per Share", {}),
    ("book_value_per_share", "Book Value Per Share", {}),
    
    # ============ DIVIDENDS ============
    ("dividend_yield", "Dividend Yield", {"isPercent": True}),
    ("payout_ratio", "Payout Ratio", {"isPercent": True}),
]

# Legacy dict format for backward compatibility
INCOME_DISPLAY = {col: label for col, label, _ in INCOME_DISPLAY_ORDERED}
BALANCE_DISPLAY = {col: label for col, label, _ in BALANCE_DISPLAY_ORDERED}
CASHFLOW_DISPLAY = {col: label for col, label, _ in CASHFLOW_DISPLAY_ORDERED}
RATIOS_DISPLAY = {col: label for col, label, _ in RATIOS_DISPLAY_ORDERED}




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
    
    # CRITICAL: Get stock_statistics for TTM KPIs (ROE, ROA, margins, OCF, FCF, etc.)
    stock_stats = await conn.fetchrow(
        "SELECT * FROM stock_statistics WHERE symbol = $1",
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
        'income': _process_rows(income_annual, INCOME_DISPLAY, INCOME_DISPLAY_ORDERED),
        'balance': _process_rows(balance_annual, BALANCE_DISPLAY, BALANCE_DISPLAY_ORDERED),
        'cashflow': _process_rows(cashflow_annual, CASHFLOW_DISPLAY, CASHFLOW_DISPLAY_ORDERED),
        'ratios': _process_rows(ratios_rows, RATIOS_DISPLAY, RATIOS_DISPLAY_ORDERED),
        'kpis': _process_rows(ratios_rows, RATIOS_DISPLAY, RATIOS_DISPLAY_ORDERED),
    }
    
    quarterly_data = {
        'years': extract_years(income_quarterly),
        'income': _process_rows_quarterly(income_quarterly, INCOME_DISPLAY, INCOME_DISPLAY_ORDERED),
        'balance': _process_rows_quarterly(balance_quarterly, BALANCE_DISPLAY, BALANCE_DISPLAY_ORDERED),
        'cashflow': _process_rows_quarterly(cashflow_quarterly, CASHFLOW_DISPLAY, CASHFLOW_DISPLAY_ORDERED),
        'ratios': [],  # Ratios typically only annual
        'kpis': [],
    }


    # Calculate TTM (Trailing Twelve Months)
    # TTM = Sum of last 4 quarters for Income/Cashflow, Latest Quarter for Balance Sheet
    # Calculate TTM (Trailing Twelve Months) - ROBUST VERSION
    def calculate_ttm(quarterly_rows, display_map, is_snapshot=False):
        if not quarterly_rows or len(quarterly_rows) < 4:
            return []
        
        # 1. Map data by (Year, Quarter) for O(1) lookup
        # Filter out invalid future years (e.g. 2027 parsed from TTM column)
        current_year = datetime.now().year
        valid_rows = [r for r in quarterly_rows if r['fiscal_year'] <= current_year + 1]
        
        # Sort desc
        sorted_rows = sorted(valid_rows, key=lambda x: (x['fiscal_year'], x['fiscal_quarter']), reverse=True)
        
        ttm_rows = []
        
        # 2. Iterate through rows and look for the PREVIOUS 3 quarters explicitly
        for i, current in enumerate(sorted_rows):
            # We need the current quarter + 3 previous sequential quarters
            c_y = current['fiscal_year']
            c_q = current['fiscal_quarter']
            
            # Determine required keys for a full TTM
            required_periods = []
            for delta in range(4): # 0, 1, 2, 3
                target_q = c_q - delta
                target_y = c_y
                while target_q <= 0:
                    target_q += 4
                    target_y -= 1
                required_periods.append((target_y, target_q))
                
            # Find these periods in our sorted_rows
            window = []
            for (ry, rq) in required_periods:
                match = next((r for r in sorted_rows if r['fiscal_year'] == ry and r['fiscal_quarter'] == rq), None)
                if match:
                    window.append(match)
                else:
                    break # Gap found, cannot calculate TTM for this period
            
            if len(window) != 4:
                continue # Skip partial TTMs
                
            # We have a valid 4-quarter window
            period_label = f"TTM Q{c_q} {c_y}"
            mapped_data = {}
            
            for col, label in display_map.items():
                if is_snapshot:
                    # Balance Sheet: Latest quarter only
                    val = window[0].get(col)
                else:
                    # Income/Cashflow: Sum of 4 quarters
                    # EXCEPTION: Do not sum margins/rates - they must be recalculated
                    if col in ['gross_margin', 'operating_margin', 'net_margin', 'ebitda_margin', 'ebit_margin', 'effective_tax_rate']:
                        val = None # Placeholder, calculated below
                    else:
                        try:
                            # Safely sum numbers
                            vals = [float(r.get(col) or 0) for r in window]
                            val = sum(vals)
                        except (ValueError, TypeError):
                            val = None
                mapped_data[col] = val
            
            # Recalculate Margins/Ratios for TTM if Income Statement
            if not is_snapshot:
                revenue = mapped_data.get('revenue') or 0
                if revenue != 0:
                    if mapped_data.get('gross_profit') is not None:
                        mapped_data['gross_margin'] = (mapped_data['gross_profit'] / revenue) * 100
                    if mapped_data.get('operating_income') is not None:
                        mapped_data['operating_margin'] = (mapped_data['operating_income'] / revenue) * 100
                    if mapped_data.get('net_income') is not None:
                        mapped_data['net_margin'] = (mapped_data['net_income'] / revenue) * 100
                    if mapped_data.get('ebitda') is not None:
                        mapped_data['ebitda_margin'] = (mapped_data['ebitda'] / revenue) * 100
                    if mapped_data.get('ebit') is not None:
                        mapped_data['ebit_margin'] = (mapped_data['ebit'] / revenue) * 100
                
                # Recalculate Tax Rate
                pretax = mapped_data.get('pretax_income') or 0
                tax = mapped_data.get('income_tax') or 0
                if pretax != 0:
                    mapped_data['effective_tax_rate'] = (tax / pretax) * 100

            ttm_rows.append({
                'period': period_label,
                'data': mapped_data
            })
            
        return ttm_rows

    def process_ttm_to_ui(ttm_series, display_map):
        if not ttm_series:
            return [], []
            
        # Deduplicate periods if any
        seen = set()
        unique_series = []
        for r in ttm_series:
            if r['period'] not in seen:
                seen.add(r['period'])
                unique_series.append(r)
                
        ttm_periods = [r['period'] for r in unique_series]
        processed = []
        
        # Calculate Deltas (Latest vs Previous)
        has_prev = len(unique_series) >= 2
        latest_idx = 0
        prev_idx = 1
        
        for col, label in display_map.items():
            row_obj = {
                'label': label,
                'values': {},
                'isGrowth': 'growth' in col,
                'isSubtotal': col in ['revenue', 'gross_profit', 'operating_income', 'net_income', 'total_assets', 'total_equity'],
                'indent': 1 if col not in ['revenue', 'gross_profit', 'operating_income', 'net_income'] else 0,
                'change_abs': None,
                'change_pct': None,
                'prev_val': None
            }
            
            has_val = False
            for entry in unique_series:
                p = entry['period']
                val = entry['data'].get(col)
                if val is not None:
                    row_obj['values'][p] = val
                    has_val = True
                else:
                    row_obj['values'][p] = None
            
            # Compute Delta
            if has_prev and has_val:
                v0 = unique_series[latest_idx]['data'].get(col)
                v1 = unique_series[prev_idx]['data'].get(col)
                
                if v0 is not None and v1 is not None:
                    row_obj['prev_val'] = v1
                    try:
                        # Absolute Change
                        row_obj['change_abs'] = v0 - v1
                        
                        # Percent Change
                        if v1 != 0:
                            row_obj['change_pct'] = ((v0 - v1) / abs(v1)) * 100
                        else:
                             row_obj['change_pct'] = 0 if v0 == 0 else 100 # Simple fallback
                    except Exception:
                        pass

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

    # 4. Build KPI Summary from stock_statistics (for CFA analysis)
    kpi_summary = {}
    if stock_stats:
        ss = dict(stock_stats)
        # Helper to format numbers with scale
        def fmt_num(val, scale='auto', suffix=''):
            if val is None:
                return None
            v = float(val)
            if scale == 'auto':
                if abs(v) >= 1_000_000_000:
                    return f"{v/1_000_000_000:,.2f}B{suffix}"
                elif abs(v) >= 1_000_000:
                    return f"{v/1_000_000:,.2f}M{suffix}"
                elif abs(v) >= 1_000:
                    return f"{v/1_000:,.2f}K{suffix}"
                else:
                    return f"{v:,.2f}{suffix}"
            return f"{v:,.2f}{suffix}"
        
        def fmt_pct(val):
            if val is None:
                return None
            v = float(val)
            # Handle decimal form (0.43) vs percentage form (43.0)
            if abs(v) <= 1:
                return f"{v * 100:.2f}%"
            return f"{v:.2f}%"
            
        # Build comprehensive KPI summary for CFA analysis
        kpi_summary = {
            # Profitability
            'revenue_ttm': fmt_num(ss.get('revenue_ttm')),
            'net_income_ttm': fmt_num(ss.get('net_income_ttm')),
            'eps_ttm': f"{ss.get('eps_ttm'):.2f}" if ss.get('eps_ttm') else None,
            'roe': fmt_pct(ss.get('roe')),
            'roa': fmt_pct(ss.get('roa')),
            'roic': fmt_pct(ss.get('roic')),
            'roce': fmt_pct(ss.get('roce')),
            # Margins
            'gross_margin': fmt_pct(ss.get('gross_margin')),
            'operating_margin': fmt_pct(ss.get('operating_margin')),
            'pretax_margin': fmt_pct(ss.get('pretax_margin')),
            'profit_margin': fmt_pct(ss.get('profit_margin')),
            'ebitda_margin': fmt_pct(ss.get('ebitda_margin')),
            'fcf_margin': fmt_pct(ss.get('fcf_margin')),
            # Cash Flow (CRITICAL for CFA analysis)
            'ocf_ttm': fmt_num(ss.get('ocf_ttm')),
            'fcf_ttm': fmt_num(ss.get('fcf_ttm')),
            'fcf_per_share': f"{ss.get('fcf_per_share'):.2f}" if ss.get('fcf_per_share') else None,
            'cash_ttm': fmt_num(ss.get('cash_ttm')),
            'net_cash': fmt_num(ss.get('net_cash')),
            # Balance Sheet
            'total_debt': fmt_num(ss.get('total_debt')),
            'book_value': fmt_num(ss.get('book_value')),
            'bvps': f"{ss.get('bvps'):.2f}" if ss.get('bvps') else None,
            'working_capital': fmt_num(ss.get('working_capital')),
            # Valuation
            'pe_ratio': f"{ss.get('pe_ratio'):.2f}x" if ss.get('pe_ratio') else None,
            'forward_pe': f"{ss.get('forward_pe'):.2f}x" if ss.get('forward_pe') else None,
            'pb_ratio': f"{ss.get('pb_ratio'):.2f}x" if ss.get('pb_ratio') else None,
            'ps_ratio': f"{ss.get('ps_ratio'):.2f}x" if ss.get('ps_ratio') else None,
            'dividend_yield': fmt_pct(ss.get('dividend_yield')),
            'payout_ratio': fmt_pct(ss.get('payout_ratio')),
            'earnings_yield': fmt_pct(ss.get('earnings_yield')),
            'fcf_yield': fmt_pct(ss.get('fcf_yield')),
            # Quality Scores
            'piotroski_f_score': str(int(ss.get('piotroski_f_score'))) if ss.get('piotroski_f_score') else None,
            'altman_z_score': f"{ss.get('altman_z_score'):.2f}" if ss.get('altman_z_score') else None,
            # Technical
            'beta_5y': f"{ss.get('beta_5y'):.2f}" if ss.get('beta_5y') else None,
            'shares_outstanding': fmt_num(ss.get('shares_outstanding')),
            'effective_tax_rate': fmt_pct(ss.get('effective_tax_rate')),
        }
        # Remove None values
        kpi_summary = {k: v for k, v in kpi_summary.items() if v is not None}

    # 5. Build response with BOTH datasets
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
        # CRITICAL: KPI Summary for CFA Analysis (from stock_statistics)
        'kpi_summary': kpi_summary,
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

def _process_rows(rows: List[asyncpg.Record], display_map: Dict[str, str], ordered_list: List[tuple] = None) -> List[Dict[str, Any]]:
    """Convert DB rows into UI-ready row objects with years as columns.
    
    If ordered_list is provided (e.g., INCOME_DISPLAY_ORDERED), use it for ordering and metadata.
    Otherwise fall back to display_map dict.
    """
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
        'isPercent': False,
        'indent': 0,
        'format': 'string'
    }
    has_period = False
    for y in years:
        raw_date = data_by_year.get(y, {}).get('period_ending')
        if raw_date:
            try:
                if hasattr(raw_date, 'strftime'):
                    val_str = raw_date.strftime("%b %d, %Y")
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

    # 2. Process columns - use ordered_list if available for proper ordering and metadata
    if ordered_list:
        for col, label, options in ordered_list:
            if col == 'period_ending':
                continue  # Already handled above
                
            row_obj = {
                'label': label,
                'values': {},
                'isGrowth': options.get('isGrowth', False),
                'isSubtotal': options.get('isSubtotal', False),
                'isPercent': options.get('isPercent', False),
                'isHeader': options.get('isHeader', False),
                'indent': options.get('indent', 0)
            }
            
            has_val = False
            for y in years:
                val = data_by_year.get(y, {}).get(col)
                if val is not None:
                    try:
                        row_obj['values'][y] = float(val)
                        has_val = True
                    except (ValueError, TypeError):
                        row_obj['values'][y] = None
                else:
                    row_obj['values'][y] = None
                
            if has_val:
                processed.append(row_obj)
    else:
        # Fallback to dict-based processing
        for col, label in display_map.items():
            if col == 'period_ending':
                continue
                
            row_obj = {
                'label': label,
                'values': {},
                'isGrowth': 'growth' in col.lower(),
                'isSubtotal': col in ['revenue', 'gross_profit', 'operating_income', 'net_income', 'total_assets', 'total_equity', 'total_liabilities', 'cash_from_operating', 'cash_from_investing', 'cash_from_financing', 'free_cashflow'],
                'isPercent': 'margin' in col.lower() or 'growth' in col.lower() or 'rate' in col.lower() or col.startswith('roe') or col.startswith('roa'),
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
                        row_obj['values'][y] = None
                else:
                    row_obj['values'][y] = None
                
            if has_val:
                processed.append(row_obj)
            
    return processed


def _process_rows_quarterly(rows: List[asyncpg.Record], display_map: Dict[str, str], ordered_list: List[tuple] = None) -> List[Dict[str, Any]]:
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
        'isPercent': False,
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

    # 2. Process columns - use ordered_list if available
    if ordered_list:
        for col, label, options in ordered_list:
            if col == 'period_ending':
                continue
                
            row_obj = {
                'label': label,
                'values': {},
                'isGrowth': options.get('isGrowth', False),
                'isSubtotal': options.get('isSubtotal', False),
                'isPercent': options.get('isPercent', False),
                'isHeader': options.get('isHeader', False),
                'indent': options.get('indent', 0)
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
    else:
        # Fallback to dict-based processing
        for col, label in display_map.items():
            if col == 'period_ending':
                continue
                
            row_obj = {
                'label': label,
                'values': {},
                'isGrowth': 'growth' in col.lower(),
                'isSubtotal': col in ['revenue', 'gross_profit', 'operating_income', 'net_income', 'total_assets', 'total_equity'],
                'isPercent': 'margin' in col.lower() or 'growth' in col.lower(),
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
