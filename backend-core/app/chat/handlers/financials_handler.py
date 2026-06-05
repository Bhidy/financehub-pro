"""
Financials Handler - FINANCIALS and REVENUE_TREND intents.
Ultra-premium responses with complete data from BOTH market_tickers AND raw_data.
"""

from app.chat.currency_utils import get_ticker_currency, is_egx_market
import asyncpg
import json
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime


def _format_number(
    value: float,
    decimals: int = 2,
    assume_millions: bool = False,
    currency: Optional[str] = None
) -> Optional[str]:
    """Format number with scale and optional currency suffix.

    `income_statements` / `balance_sheets` values are stored in millions for many fields.
    Use `assume_millions=True` for those amounts so display units remain economically correct.
    """
    if value is None:
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None

    if assume_millions:
        num *= 1_000_000

    if abs(num) >= 1_000_000_000:
        out = f"{num/1_000_000_000:.2f}B"
    elif abs(num) >= 1_000_000:
        out = f"{num/1_000_000:.2f}M"
    elif abs(num) >= 1_000:
        out = f"{num/1_000:.2f}K"
    else:
        out = f"{num:,.{decimals}f}"

    if currency:
        return f"{out} {currency}"
    return out


def _format_share_count_from_millions(shares_mn: Optional[float], decimals: int = 2) -> Optional[str]:
    """Convert share count stored in millions to readable M/B shares text."""
    if shares_mn is None:
        return None
    try:
        s = float(shares_mn)
    except (TypeError, ValueError):
        return None
    if s >= 1000:
        return f"{s/1000:.{decimals}f}B shares"
    return f"{s:.{decimals}f}M shares"


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

# ORDERED INCOME STATEMENT DISPLAY
# We keep separate templates so non-banks follow StockAnalysis corporate sequence
# while banks keep banking-native sequence.
INCOME_DISPLAY_ORDERED_CORPORATE = [
    ("period_ending", "Period Ending", {"isHeader": True}),
    ("revenue", "Revenue", {"isSubtotal": True}),
    ("operating_revenue", "Operating Revenue", {"indent": 1}),
    ("revenue_growth", "Revenue Growth (YoY)", {"isPercent": True, "isGrowth": True, "indent": 1}),
    ("cost_of_revenue", "Cost of Revenue", {"indent": 1}),
    ("gross_profit", "Gross Profit", {"isSubtotal": True}),
    ("sga_expense", "Selling, General & Admin", {"indent": 1}),
    ("other_operating_expenses", "Other Operating Expenses", {"indent": 1}),
    ("operating_expenses", "Operating Expenses", {"isSubtotal": True}),
    ("rd_expense", "Research & Development", {"indent": 1}),
    ("depreciation", "Depreciation & Amortization", {"indent": 1}),
    ("operating_income", "Operating Income", {"isSubtotal": True}),
    ("interest_expense_nonop", "Interest Expense", {"indent": 1}),
    ("interest_investment_income", "Interest & Investment Income", {"indent": 1}),
    ("earnings_equity_investments", "Earnings From Equity Investments", {"indent": 1}),
    ("fx_gain_loss", "Currency Exchange Gain (Loss)", {"indent": 1}),
    ("other_nonop_income", "Other Non Operating Income (Expenses)", {"indent": 1}),
    ("ebt_excl_unusual", "EBT Excluding Unusual Items", {"isSubtotal": True}),
    ("gain_loss_investments", "Gain (Loss) on Sale of Investments", {"indent": 1}),
    ("gain_loss_assets", "Gain (Loss) on Sale of Assets", {"indent": 1}),
    ("impairment_goodwill", "Impairment of Goodwill", {"indent": 1}),
    ("asset_writedown", "Asset Writedown", {"indent": 1}),
    ("other_unusual_items", "Other Unusual Items", {"indent": 1}),
    ("pretax_income", "Pretax Income", {"isSubtotal": True}),
    ("income_tax", "Income Tax Expense", {"indent": 1}),
    ("earnings_continuing_ops", "Earnings From Continuing Operations", {"indent": 1}),
    ("earnings_discontinued_ops", "Earnings From Discontinued Operations", {"indent": 1}),
    ("minority_interest_earnings", "Minority Interest in Earnings", {"indent": 1}),
    ("net_income", "Net Income", {"isSubtotal": True}),
    ("preferred_dividends", "Preferred Dividends & Other Adjustments", {"indent": 1}),
    ("net_income_common", "Net Income to Common", {"isSubtotal": True}),
    ("net_income_growth", "Net Income Growth (YoY)", {"isPercent": True, "isGrowth": True, "indent": 1}),
    ("shares_outstanding", "Shares Outstanding (Basic)", {}),
    ("shares_diluted", "Shares Outstanding (Diluted)", {}),
    ("shares_change", "Shares Change (YoY)", {"isPercent": True, "isGrowth": True, "indent": 1}),
    ("eps", "EPS (Basic)", {}),
    ("eps_diluted", "EPS (Diluted)", {}),
    ("eps_growth", "EPS Growth", {"isPercent": True, "isGrowth": True, "indent": 1}),
    ("free_cashflow", "Free Cash Flow", {}),
    ("fcf_per_share", "Free Cash Flow Per Share", {}),
    ("dividend_per_share", "Dividend Per Share", {}),
    ("dividend_growth", "Dividend Growth", {"isPercent": True, "isGrowth": True, "indent": 1}),
    ("gross_margin", "Gross Margin", {"isPercent": True, "indent": 1}),
    ("operating_margin", "Operating Margin", {"isPercent": True, "indent": 1}),
    ("net_margin", "Profit Margin", {"isPercent": True, "indent": 1}),
    ("fcf_margin", "Free Cash Flow Margin", {"isPercent": True, "indent": 1}),
    ("ebitda", "EBITDA", {"isSubtotal": True}),
    ("ebitda_margin", "EBITDA Margin", {"isPercent": True, "indent": 1}),
    ("da_for_ebitda", "D&A For EBITDA", {"indent": 1}),
    ("ebit", "EBIT", {"isSubtotal": True}),
    ("ebit_margin", "EBIT Margin", {"isPercent": True, "indent": 1}),
    ("effective_tax_rate", "Effective Tax Rate", {"isPercent": True, "indent": 1}),
]

INCOME_DISPLAY_ORDERED_BANKING = [
    ("period_ending", "Period Ending", {"isHeader": True}),
    ("interest_income_loans", "Interest Income on Loans", {"indent": 1}),
    ("interest_income_investments", "Interest Income on Investments", {"indent": 1}),
    ("total_interest_income", "Total Interest Income", {"isSubtotal": True}),
    ("interest_expense", "Interest Paid on Deposits", {"indent": 1}),
    ("net_interest_income", "Net Interest Income", {"isSubtotal": True}),
    ("net_interest_income_growth", "Net Interest Income Growth", {"isPercent": True, "isGrowth": True, "indent": 1}),
    ("trading_income", "Income From Trading Activities", {"indent": 1}),
    ("fee_income", "Fee and Commission Income", {"indent": 1}),
    ("gain_loss_assets", "Gain (Loss) on Sale of Assets", {"indent": 1}),
    ("gain_loss_investments", "Gain (Loss) on Sale of Investments", {"indent": 1}),
    ("other_noninterest_income", "Other Non-Interest Income", {"indent": 1}),
    ("total_noninterest_income", "Total Non-Interest Income", {"isSubtotal": True}),
    ("noninterest_income_growth", "Non-Interest Income Growth", {"isPercent": True, "isGrowth": True, "indent": 1}),
    ("revenues_before_loan_losses", "Revenues Before Loan Losses", {"isSubtotal": True}),
    ("provision_credit_losses", "Provision for Loan Losses", {"indent": 1}),
    ("salaries_and_benefits", "Salaries and Employee Benefits", {"indent": 1}),
    ("amortization_of_goodwill", "Amortization of Goodwill & Intangibles", {"indent": 1}),
    ("other_noninterest_expense", "Other Non-Interest Expense", {"indent": 1}),
    ("total_noninterest_expense", "Total Non-Interest Expense", {"isSubtotal": True}),
    ("operating_income", "Operating Income", {"isSubtotal": True}),
    ("interest_investment_income", "Interest & Investment Income", {"indent": 1}),
    ("fx_gain_loss", "Currency Exchange Gain (Loss)", {"indent": 1}),
    ("other_nonop_income", "Other Non Operating Income (Expenses)", {"indent": 1}),
    ("ebt_excl_unusual", "EBT Excluding Unusual Items", {"isSubtotal": True}),
    ("other_unusual_items", "Other Unusual Items", {"indent": 1}),
    ("pretax_income", "Pretax Income", {"isSubtotal": True}),
    ("income_tax", "Income Tax Expense", {"indent": 1}),
    ("effective_tax_rate", "Effective Tax Rate", {"isPercent": True, "indent": 1}),
    ("net_income", "Net Income", {"isSubtotal": True}),
    ("net_income_growth", "Net Income Growth (YoY)", {"isPercent": True, "isGrowth": True, "indent": 1}),
    ("eps", "EPS (Basic)", {}),
    ("eps_diluted", "EPS (Diluted)", {}),
    ("shares_outstanding", "Shares Outstanding (Basic)", {}),
    ("shares_diluted", "Shares Outstanding (Diluted)", {}),
    ("dividend_per_share", "Dividend Per Share", {}),
    ("gross_margin", "Gross Margin", {"isPercent": True, "indent": 1}),
    ("operating_margin", "Operating Margin", {"isPercent": True, "indent": 1}),
    ("net_margin", "Profit Margin", {"isPercent": True, "indent": 1}),
]

# Backward compatibility for imports that expect INCOME_DISPLAY_ORDERED.
INCOME_DISPLAY_ORDERED = INCOME_DISPLAY_ORDERED_CORPORATE

BANKING_INCOME_MARKER_COLUMNS = (
    "interest_income_loans",
    "interest_income_investments",
    "total_interest_income",
    "net_interest_income",
    "revenues_before_loan_losses",
    "provision_credit_losses",
    "total_noninterest_income",
    "total_noninterest_expense",
)


def _has_meaningful_value(value: Any) -> bool:
    """Return True when a row field has meaningful numeric/textual content."""
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip() != ""
    try:
        return abs(float(value)) > 0
    except (TypeError, ValueError):
        return True


def _select_income_display_order(rows: Optional[List[asyncpg.Record]]) -> List[tuple]:
    """Select banking vs corporate income template based on available row fields."""
    if not rows:
        return INCOME_DISPLAY_ORDERED_CORPORATE

    for row in rows:
        row_dict = dict(row)
        for marker in BANKING_INCOME_MARKER_COLUMNS:
            if _has_meaningful_value(row_dict.get(marker)):
                return INCOME_DISPLAY_ORDERED_BANKING

    return INCOME_DISPLAY_ORDERED_CORPORATE


def _build_display_map(*ordered_lists: List[tuple]) -> Dict[str, str]:
    """Build a display label map from one or more ordered lists."""
    display_map: Dict[str, str] = {}
    for ordered_list in ordered_lists:
        for col, label, _ in ordered_list:
            display_map[col] = label
    return display_map

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
    ("ppe_land", "Land", {"indent": 2}),
    ("ppe_buildings", "Buildings", {"indent": 2}),
    ("ppe_machinery", "Machinery", {"indent": 2}),
    ("ppe_leasehold", "Leasehold Improvements", {"indent": 2}),
    ("ppe_construction", "Construction In Progress", {"indent": 2}),
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
    ("filing_date", "Filing Date", {}),
    ("filing_shares_outstanding", "Filing Date Shares Outstanding", {}),
    
    
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
    ("loss_gain_equity_investments", "Loss (Gain) on Equity Investments", {"indent": 1}),
    ("asset_writedown", "Total Asset Writedown", {"indent": 1}),
    ("asset_writedown_restructuring", "Asset Writedown & Restructuring Costs", {"indent": 1}),
    
    # Provisions
    ("provision_credit_losses", "Provision for Credit Losses", {"indent": 1}),
    
    # Working Capital Changes
    ("change_in_trading_assets", "Change in Trading Asset Securities", {"indent": 1}),
    ("change_in_income_taxes", "Change in Income Taxes", {"indent": 1}),
    ("change_in_other_assets", "Change in Other Net Operating Assets", {"indent": 1}),
    ("change_in_receivables", "Change in Accounts Receivable", {"indent": 1}),
    ("change_in_inventory", "Change in Inventory", {"indent": 1}),
    ("change_in_payables", "Change in Accounts Payable", {"indent": 1}),
    ("change_unearned_revenue", "Change in Unearned Revenue", {"indent": 1}),
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
    ("misc_cash_flow_adj", "Miscellaneous Cash Flow Adjustments", {"indent": 1}),
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
INCOME_DISPLAY = _build_display_map(INCOME_DISPLAY_ORDERED_CORPORATE, INCOME_DISPLAY_ORDERED_BANKING)
BALANCE_DISPLAY = {col: label for col, label, _ in BALANCE_DISPLAY_ORDERED}
CASHFLOW_DISPLAY = {col: label for col, label, _ in CASHFLOW_DISPLAY_ORDERED}
RATIOS_DISPLAY = {col: label for col, label, _ in RATIOS_DISPLAY_ORDERED}

# ARABIC TRANSLATIONS MAP
AR_TERMS = {
    # Period Info
    "Period Ending": "نهاية الفترة",
    "Fiscal Year": "السنة المالية",
    
    # Income Statement
    "Interest Income on Loans": "عائد القروض",
    "Interest Income on Investments": "عائد الاستثمارات",
    "Total Interest Income": "إجمالي دخل الفائدة",
    "Interest Paid on Deposits": "فوائد الودائع",
    "Net Interest Income": "صافي دخل الفائدة",
    "Net Interest Income Growth": "نمو صافي دخل الفائدة",
    "Income From Trading Activities": "دخل المتاجرة",
    "Fee and Commission Income": "دخل الأتعاب والعمولات",
    "Gain (Loss) on Sale of Assets": "ربح (خسارة) بيع أصول",
    "Gain (Loss) on Sale of Investments": "ربح (خسارة) بيع استثمارات",
    "Other Non-Interest Income": "إيرادات أخرى غير الفائدة",
    "Total Non-Interest Income": "إجمالي الدخل من غير الفائدة",
    "Non-Interest Income Growth": "نمو الدخل من غير الفائدة",
    "Revenues Before Loan Losses": "الإيرادات قبل مخصصات القروض",
    "Provision for Loan Losses": "مخصص خسائر القروض",
    "Revenue": "الإيرادات",
    "Operating Revenue": "الإيرادات التشغيلية",
    "Revenue Growth": "نمو الإيرادات",
    "Revenue Growth (YoY)": "نمو الإيرادات (سنوي)",
    "Cost of Revenue": "تكلفة الإيرادات",
    "Gross Profit": "إجمالي الربح",
    "Gross Margin": "هامش إجمالي الربح",
    "Selling, General & Admin": "مصاريف عمومية وإدارية",
    "Other Operating Expenses": "مصاريف تشغيلية أخرى",
    "Operating Expenses": "المصاريف التشغيلية",
    "Research & Development": "البحث والتطوير",
    "Depreciation & Amortization": "الإهلاك والاستهلاك",
    "Salaries and Employee Benefits": "الرواتب ومزايا الموظفين",
    "Amortization of Goodwill & Intangibles": "إطفاء الشهرة والأصول غير الملموسة",
    "Other Non-Interest Expense": "مصاريف أخرى غير الفائدة",
    "Total Non-Interest Expense": "إجمالي المصاريف من غير الفائدة",
    "Operating Income": "الدخل التشغيلي",
    "Operating Margin": "الهامش التشغيلي",
    "Interest Expense": "مصروف الفائدة",
    "Interest & Investment Income": "دخل الفوائد والاستثمار",
    "Earnings From Equity Investments": "أرباح الاستثمارات في حقوق الملكية",
    "Currency Exchange Gain (Loss)": "أرباح (خسائر) العملات الأجنبية",
    "Other Non Operating Income (Expenses)": "إيرادات (مصاريف) غير تشغيلية أخرى",
    "EBT Excluding Unusual Items": "الربح قبل الضرائب (باستثناء البنود غير العادية)",
    "Impairment of Goodwill": "انخفاض قيمة الشهرة",
    "Asset Writedown": "شطب أصول",
    "Other Unusual Items": "بنود غير عادية أخرى",
    "Pretax Income": "الدخل قبل الضرائب",
    "Income Tax Expense": "مصروف ضريبة الدخل",
    "Effective Tax Rate": "معدل الضريبة الفعلي",
    "Earnings From Continuing Operations": "أرباح العمليات المستمرة",
    "Earnings From Discontinued Operations": "أرباح العمليات المتوقفة",
    "Minority Interest in Earnings": "حقوق الأقلية في الأرباح",
    "Net Income": "صافي الدخل",
    "Preferred Dividends & Other Adjustments": "توزيعات الأسهم الممتازة وتعديلات أخرى",
    "Net Income to Common": "صافي الدخل (للمساهمين العاديين)",
    "Net Income Growth": "نمو صافي الدخل",
    "Net Income Growth (YoY)": "نمو صافي الدخل (سنوي)",
    "Profit Margin": "هامش صافي الربح",
    "Basic Shares Outstanding": "الأسهم القائمة (الأساسية)",
    "Diluted Shares Outstanding": "الأسهم القائمة (المخففة)",
    "Shares Outstanding (Basic)": "الأسهم القائمة (الأساسية)",
    "Shares Outstanding (Diluted)": "الأسهم القائمة (المخففة)",
    "Shares Change": "تغير الأسهم",
    "Shares Change (YoY)": "تغير الأسهم (سنوي)",
    "EPS (Basic)": "ربحية السهم (الأساسية)",
    "EPS (Diluted)": "ربحية السهم (المخففة)",
    "EPS Growth": "نمو ربحية السهم",
    "Dividend Per Share": "توزيعات السهم",
    "Dividend Growth": "نمو التوزيعات",
    "Free Cash Flow": "التدفق النقدي الحر",
    "Free Cash Flow Per Share": "التدفق النقدي الحر للسهم",
    "Free Cash Flow Margin": "هامش التدفق النقدي الحر",
    "EBITDA": "الربح قبل الفوائد والضرائب والإهلاك والاستهلاك",
    "EBITDA Margin": "هامش EBITDA",
    "D&A For EBITDA": "الإهلاك والاستهلاك لـ EBITDA",
    "EBIT": "الربح قبل الفوائد والضرائب (EBIT)",
    "EBIT Margin": "هامش EBIT",

    # Balance Sheet
    "Cash & Equivalents": "النقد وما في حكمه",
    "Short-Term Investments": "استثمارات قصيرة الأجل",
    "Trading Asset Securities": "أوراق مالية للمتاجرة",
    "Cash & Short-Term Investments": "النقد والاستثمارات قصيرة الأجل",
    "Cash Growth": "نمو النقد",
    "Accounts Receivable": "الذمم المدينة",
    "Other Receivables": "ذمم مدينة أخرى",
    "Receivables": "الذمم المدينة",
    "Inventory": "المخزون",
    "Prepaid Expenses": "مصاريف مدفوعة مقدماً",
    "Other Current Assets": "أصول متداولة أخرى",
    "Total Current Assets": "إجمالي الأصول المتداولة",
    "Investment Securities": "أوراق مالية استثمارية",
    "Total Investments": "إجمالي الاستثمارات",
    "Gross Loans": "إجمالي القروض",
    "Allowance for Loan Losses": "مخصص خسائر القروض",
    "Other Adjustments to Gross Loans": "تعديلات أخرى على القروض",
    "Net Loans": "صافي القروض",
    "Property, Plant & Equipment": "الممتلكات والمصانع والمعدات",
    "Land": "أراضي",
    "Buildings": "مباني",
    "Machinery": "آلات",
    "Leasehold Improvements": "تحسينات الأصول المستأجرة",
    "Construction In Progress": "مشروعات تحت التنفيذ",
    "Long-Term Investments": "استثمارات طويلة الأجل",
    "Goodwill": "الشهرة",
    "Other Intangible Assets": "أصول غير ملموسة أخرى",
    "Long-Term Accounts Receivable": "ذمم مدينة طويلة الأجل",
    "Long-Term Deferred Tax Assets": "أصول ضريبية مؤجلة",
    "Other Long-Term Assets": "أصول طويلة الأجل أخرى",
    "Accrued Interest Receivable": "فوائد مستحقة القبض",
    "Restricted Cash": "نقد مقيد",
    "Other Real Estate Owned": "عقارات أخرى مملوكة",
    "Total Assets": "إجمالي الأصول",
    "Filing Date": "تاريخ الملف",
    "Filing Date Shares Outstanding": "الأسهم القائمة بتاريخ الملف",
    "Accounts Payable": "الذمم الدائنة",
    "Accrued Expenses": "مصاريف مستحقة",
    "Short-Term Debt": "ديون قصيرة الأجل",
    "Current Portion of Long-Term Debt": "الجزء المتداول من الديون طويلة الأجل",
    "Current Portion of Leases": "الجزء المتداول من عقود الإيجار",
    "Current Income Taxes Payable": "ضرائب دخل مستحقة",
    "Current Unearned Revenue": "إيرادات غير مكتسبة (متداول)",
    "Other Current Liabilities": "التزامات متداولة أخرى",
    "Total Current Liabilities": "إجمالي الالتزامات المتداولة",
    "Interest Bearing Deposits": "ودائع بفوائد",
    "Non-Interest Bearing Deposits": "ودائع بدون فوائد",
    "Total Deposits": "إجمالي الودائع",
    "Accrued Interest Payable": "فوائد مستحقة الدفع",
    "Long-Term Debt": "ديون طويلة الأجل",
    "Long-Term Leases": "عقود إيجار طويلة الأجل",
    "Long-Term Deferred Tax Liabilities": "التزامات ضريبية مؤجلة",
    "Other Long-Term Liabilities": "التزامات طويلة الأجل أخرى",
    "Total Liabilities": "إجمالي الالتزامات",
    "Common Stock": "الأسهم العادية",
    "Retained Earnings": "الأرباح المبقاة",
    "Treasury Stock": "أسهم الخزينة",
    "Comprehensive Income & Other": "الدخل الشامل وتعديلات أخرى",
    "Total Common Equity": "إجمالي حقوق الملكية العادية",
    "Minority Interest": "حقوق الأقلية",
    "Shareholders' Equity": "حقوق المساهمين",
    "Total Liabilities & Equity": "إجمالي الالتزامات وحقوق الملكية",
    "Total Debt": "إجمالي الديون",
    "Net Cash (Debt)": "صافي النقد (الدين)",
    "Net Cash Growth": "نمو صافي النقد",
    "Net Cash Per Share": "صافي النقد للسهم",
    "Total Common Shares Outstanding": "إجمالي الأسهم القائمة",
    "Working Capital": "رأس المال العامل",
    "Book Value Per Share": "القيمة الدفترية للسهم",
    "Tangible Book Value": "القيمة الدفترية الملموسة",
    "Tangible Book Value Per Share": "القيمة الدفترية الملموسة للسهم",

    # Cash Flow
    "Other Amortization": "إطفاءات أخرى",
    "Stock-Based Compensation": "تعويضات مبنية على الأسهم",
    "Deferred Income Taxes": "ضرائب دخل مؤجلة",
    "Loss (Gain) From Sale of Assets": "خسارة (ربح) بيع أصول",
    "Loss (Gain) From Sale of Investments": "خسارة (ربح) بيع استثمارات",
    "Loss (Gain) on Equity Investments": "خسارة (ربح) استثمارات ملكية",
    "Total Asset Writedown": "إجمالي شطب الأصول",
    "Asset Writedown & Restructuring Costs": "شطب الأصول وتكاليف إعادة الهيكلة",
    "Provision for Credit Losses": "مخصص خسائر الائتمان",
    "Change in Trading Asset Securities": "التغير في الأوراق المالية للمتاجرة",
    "Change in Income Taxes": "التغير في ضرائب الدخل",
    "Change in Other Net Operating Assets": "التغير في صافي الأصول التشغيلية الأخرى",
    "Change in Accounts Receivable": "التغير في الذمم المدينة",
    "Change in Inventory": "التغير في المخزون",
    "Change in Accounts Payable": "التغير في الذمم الدائنة",
    "Change in Unearned Revenue": "التغير في الإيرادات غير المكتسبة",
    "Change in Working Capital": "التغير في رأس المال العامل",
    "Other Operating Activities": "أنشطة تشغيلية أخرى",
    "Net Cash from Discontinued Operations": "صافي النقد من العمليات المتوقفة",
    "Operating Cash Flow": "التدفق النقدي التشغيلي",
    "Operating Cash Flow Growth": "نمو التدفق النقدي التشغيلي",
    "Capital Expenditures": "النفقات الرأسمالية",
    "Sale of Property, Plant and Equipment": "بيع ممتلكات ومصانع ومعدات",
    "Cash Acquisitions": "استحواذات نقدية",
    "Investment in Securities": "استثمار في أوراق مالية",
    "Sales of Investments": "بيع استثمارات",
    "Sale (Purchase) of Intangibles": "بيع (شراء) أصول غير ملموسة",
    "Income (Loss) Equity Investments": "دخل (خسارة) استثمارات الملكية",
    "Divestitures": "تصفية استثمارات",
    "Other Investing Activities": "أنشطة استثمارية أخرى",
    "Investing Cash Flow": "التدفق النقدي الاستثماري",
    "Short-Term Debt Issued": "إصدار ديون قصيرة الأجل",
    "Long-Term Debt Issued": "إصدار ديون طويلة الأجل",
    "Total Debt Issued": "إجمالي الديون المصدرة",
    "Short-Term Debt Repaid": "سداد ديون قصيرة الأجل",
    "Long-Term Debt Repaid": "سداد ديون طويلة الأجل",
    "Total Debt Repaid": "إجمالي الديون المسددة",
    "Net Debt Issued (Repaid)": "صافي الديون المصدرة (المسددة)",
    "Issuance of Common Stock": "إصدار أسهم عادية",
    "Repurchase of Common Stock": "إعادة شراء أسهم عادية",
    "Common Dividends Paid": "توزيعات أرباح نقدية",
    "Net Increase (Decrease) in Deposit Accounts": "صافي الزيادة (النقص) في الودائع",
    "Other Financing Activities": "أنشطة تمويلية أخرى",
    "Financing Cash Flow": "التدفق النقدي التمويلي",
    "Foreign Exchange Rate Adjustments": "تعديلات أسعار الصرف",
    "Miscellaneous Cash Flow Adjustments": "تعديلات نقدية متنوعة",
    "Net Cash Flow": "صافي التدفق النقدي",
    "Cash Interest Paid": "الفوائد النقدية المدفوعة",
    "Cash Income Tax Paid": "ضرائب الدخل النقدية المدفوعة",
    "Levered Free Cash Flow": "التدفق النقدي الحر المرفوع",
    "Unlevered Free Cash Flow": "التدفق النقدي الحر غير المرفوع",

    # Ratios
    "Last Close Price": "آخر سعر إغلاق",
    "Market Capitalization": "القيمة السوقية",
    "Market Cap Growth": "نمو القيمة السوقية",
    "Enterprise Value": "قيمة المنشأة",
    "PE Ratio": "مكرر الربحية (P/E)",
    "Forward PE": "مكرر الربحية المستقبلي",
    "PEG Ratio": "مكرر الربحية للنمو (PEG)",
    "PS Ratio": "مكرر المبيعات (P/S)",
    "PB Ratio": "مكرر القيمة الدفترية (P/B)",
    "P/TBV Ratio": "مكرر القيمة الدفترية الملموسة",
    "P/FCF Ratio": "مكرر التدفق النقدي الحر",
    "P/OCF Ratio": "مكرر التدفق النقدي التشغيلي",
    "EV/EBITDA": "قيمة المنشأة / EBITDA",
    "EV/Sales": "قيمة المنشأة / المبيعات",
    "Earnings Yield": "عائد الأرباح",
    "FCF Yield": "عائد التدفق النقدي الحر",
    "Return on Equity (ROE)": "العائد على حقوق الملكية (ROE)",
    "Return on Assets (ROA)": "العائد على الأصول (ROA)",
    "Return on Capital (ROIC)": "العائد على رأس المال المستثمر (ROIC)",
    "Return on Capital Employed (ROCE)": "العائد على رأس المال المستخدم (ROCE)",
    "Debt / Equity Ratio": "نسبة الدين إلى حقوق الملكية",
    "Debt / Assets": "نسبة الدين إلى الأصول",
    "Debt / EBITDA": "الدين / EBITDA",
    "Debt / FCF": "الدين / التدفق النقدي الحر",
    "Interest Coverage": "تغطية الفائدة",
    "Current Ratio": "النسبة المتداولة",
    "Quick Ratio": "النسبة السريعة",
    "Asset Turnover": "دوران الأصول",
    "Inventory Turnover": "دوران المخزون",
    "Receivables Turnover": "دوران الذمم المدينة",
    "Revenue Per Share": "الإيرادات للسهم",
    "Dividend Yield": "عائد التوزيعات",
    "Payout Ratio": "نسبة التوزيع",
    
    # KPIs
    "revenue_ttm": "الإيرادات (TTM)",
    "net_income_ttm": "صافي الدخل (TTM)",
    "eps_ttm": "ربحية السهم (TTM)",
    "roe": "العائد على حقوق الملكية",
    "roa": "العائد على الأصول",
    "roic": "العائد على رأس المال المستثمر",
    "roce": "العائد على رأس المال المستخدم",
    "gross_margin": "هامش إجمالي الربح",
    "operating_margin": "الهامش التشغيلي",
    "pretax_margin": "هامش الربح قبل الضرائب",
    "profit_margin": "هامش صافي الربح",
    "ebitda_margin": "هامش EBITDA",
    "fcf_margin": "هامش التدفق الحر",
    "ocf_ttm": "التدفق التشغيلي (TTM)",
    "fcf_ttm": "التدفق الحر (TTM)",
    "fcf_per_share": "التدفق الحر للسهم",
    "cash_ttm": "النقد (TTM)",
    "net_cash": "صافي النقد",
    "total_debt": "إجمالي الديون",
    "book_value": "القيمة الدفترية",
    "bvps": "القيمة الدفترية للسهم",
    "working_capital": "رأس المال العامل",
    "pe_ratio": "مكرر الربحية",
    "forward_pe": "مكرر الربحية المستقبلي",
    "pb_ratio": "مكرر القيمة الدفترية",
    "ps_ratio": "مكرر المبيعات",
    "dividend_yield": "عائد التوزيعات",
    "payout_ratio": "نسبة التوزيع",
    "earnings_yield": "عائد الأرباح",
    "fcf_yield": "عائد التدفق الحر",
    "piotroski_f_score": "نقاط بيوتروسكي",
    "altman_z_score": "مقياس ألتمان Z",
    "beta_5y": "بيتا (5 سنوات)",
    "shares_outstanding": "الأسهم القائمة",
    "effective_tax_rate": "معدل الضريبة الفعلي",
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
    currency = get_ticker_currency(ticker_row)

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
    # ── FIX: strip stock_header from explorer_cards to prevent duplicate ──
    # handle_financials_package adds its own stock_header, but we already add one below.
    explorer_cards = [
        c for c in explorer_result.get('cards', [])
        if c.get('type') != 'stock_header'
    ]

    # ── FIX: Compute REAL revenue growth from income_statements data ──
    # stock_statistics.revenue_growth is often stale/zero; use actual chart_data.
    latest_revenue_growth_pct = None
    if len(chart_data) >= 2:
        prev_rev = chart_data[-2]['revenue']
        curr_rev = chart_data[-1]['revenue']
        if prev_rev and prev_rev != 0:
            latest_revenue_growth_pct = round(((curr_rev - prev_rev) / abs(prev_rev)) * 100, 2)

    if language == 'ar':
        message = f"📈 **اتجاه الإيرادات والأرباح لـ {name}** ({symbol})"
    else:
        message = f"📈 **Revenue & Profit Trend for {name}** ({symbol})"
        

    # Define Actions
    actions = [
        {'label': '📊 Margin Trends', 'label_ar': '📊 اتجاهات الهوامش', 'action_type': 'query', 'payload': f'Show {symbol} gross and operating margin trends over the years'},
        {'label': '💎 Valuation vs Peers', 'label_ar': '💎 التقييم مقابل الأقران', 'action_type': 'query', 'payload': f'How does {symbol} valuation compare to sector peers?'},
        {'label': '🛡️ Debt & Liquidity', 'label_ar': '🛡️ الديون والسيولة', 'action_type': 'query', 'payload': f'What is {symbol} debt level and liquidity position?'},
    ]

    # Add Egypt-specific suggestions
    is_egx = is_egx_market(ticker_row)
    if is_egx:
        actions.extend([
        ])

    return {
        'success': True, 
        'message': message,
        # ── revenue_growth_context: passed to LLM so it generates CORRECT insight ──
        'revenue_growth_context': {
            'symbol': symbol,
            'latest_revenue_growth_pct': latest_revenue_growth_pct,
            'latest_revenue': chart_data[-1]['revenue'] if chart_data else None,
            'prev_revenue': chart_data[-2]['revenue'] if len(chart_data) >= 2 else None,
            'years_of_data': len(chart_data),
            'trend': (
                'growing' if latest_revenue_growth_pct and latest_revenue_growth_pct > 5
                else 'declining' if latest_revenue_growth_pct and latest_revenue_growth_pct < -5
                else 'flat'
            )
        },
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

    currency = get_ticker_currency(ticker)
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
    
    income_template_rows = income_annual or income_quarterly
    income_display_ordered = _select_income_display_order(income_template_rows)

    annual_data = {
        'years': extract_years(income_annual),
        'income': _process_rows(income_annual, INCOME_DISPLAY, income_display_ordered, language=language),
        'balance': _process_rows(balance_annual, BALANCE_DISPLAY, BALANCE_DISPLAY_ORDERED, language=language),
        'cashflow': _process_rows(cashflow_annual, CASHFLOW_DISPLAY, CASHFLOW_DISPLAY_ORDERED, language=language),
        'ratios': _process_rows(ratios_rows, RATIOS_DISPLAY, RATIOS_DISPLAY_ORDERED, language=language),
        'kpis': _process_rows(ratios_rows, RATIOS_DISPLAY, RATIOS_DISPLAY_ORDERED, language=language),
    }
    
    quarterly_data = {
        'years': extract_years(income_quarterly),
        'income': _process_rows_quarterly(income_quarterly, INCOME_DISPLAY, income_display_ordered, language=language),
        'balance': _process_rows_quarterly(balance_quarterly, BALANCE_DISPLAY, BALANCE_DISPLAY_ORDERED, language=language),
        'cashflow': _process_rows_quarterly(cashflow_quarterly, CASHFLOW_DISPLAY, CASHFLOW_DISPLAY_ORDERED, language=language),
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
    ttm_income_ui, ttm_periods = process_ttm_to_ui(ttm_income_series, INCOME_DISPLAY) # TTM internal labels remain English for calculation, mapped at UI layer if needed? 
    # Actually process_ttm_to_ui uses keys from INCOME_DISPLAY which are English. 
    # We should probably localize the output if language is 'ar'.
    # BUT process_ttm_to_ui is complex. 
    # A cleaner hack: TTM data is usually separate from the main table.
    
    # For now, let's leave TTM labels in English or implement a quick fix if needed.
    # The user asked for "responses", specifically the cards.
    # The Financial Explorer card uses 'income', 'balance', 'cashflow' arrays.
    # 'ttm_data' is separate.
    
    # Correct approach: Update process_ttm_to_ui to accept language or translation map.
    # However, process_ttm_to_ui is defined INSIDE handle_financials_package.
    
    # Redefine process_ttm_to_ui to translate labels
    def process_ttm_to_ui(ttm_series, display_map):
        if not ttm_series:
            return [], []
            
        # Deduplicate periods
        seen = set()
        unique_series = []
        for r in ttm_series:
            if r['period'] not in seen:
                seen.add(r['period'])
                unique_series.append(r)
                
        ttm_periods = [r['period'] for r in unique_series]
        processed = []
        
        # Calculate Deltas
        has_prev = len(unique_series) >= 2
        latest_idx = 0
        prev_idx = 1
        
        for col, label in display_map.items():
            # LOCALIZATION:
            final_label = label
            if language == 'ar':
                final_label = AR_TERMS.get(label, label)

            row_obj = {
                'label': final_label,
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
                        row_obj['change_abs'] = v0 - v1
                        if v1 != 0:
                            row_obj['change_pct'] = ((v0 - v1) / abs(v1)) * 100
                        else:
                             row_obj['change_pct'] = 0 if v0 == 0 else 100
                    except Exception:
                        pass

            if has_val:
                processed.append(row_obj)
        return processed, ttm_periods

    # Process into UI format (re-run with new function)
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

    is_egx = is_egx_market(ticker)
    if is_egx:
        actions.extend([
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

def _process_rows(rows: List[asyncpg.Record], display_map: Dict[str, str], ordered_list: List[tuple] = None, language: str = 'en') -> List[Dict[str, Any]]:
    """Convert DB rows into UI-ready row objects with years as columns.
    
    If ordered_list is provided (e.g., INCOME_DISPLAY_ORDERED), use it for ordering and metadata.
    Otherwise fall back to display_map dict.
    
    Now supports Arabic localization via `language` param.
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
                
            final_label = label
            if language == 'ar':
                final_label = AR_TERMS.get(label, label)

            row_obj = {
                'label': final_label,
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
                
            # Smart filtering: Only show rows that have at least ONE value
            # This ensures banking fields don't show for corporate companies and vice versa
            # Matches StockAnalysis.com behavior - they show different templates per company type
            if has_val:
                processed.append(row_obj)
    else:
        # Fallback to dict-based processing
        for col, label in display_map.items():
            if col == 'period_ending':
                continue
            
            final_label = label
            if language == 'ar':
                final_label = AR_TERMS.get(label, label)

            row_obj = {
                'label': final_label,
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
                
            # Smart filtering: Only show rows that have at least ONE value
            if has_val:
                processed.append(row_obj)
            
    return processed


def _process_rows_quarterly(rows: List[asyncpg.Record], display_map: Dict[str, str], ordered_list: List[tuple] = None, language: str = 'en') -> List[Dict[str, Any]]:
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

            final_label = label
            if language == 'ar':
                final_label = AR_TERMS.get(label, label)
                
            row_obj = {
                'label': final_label,
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
                
            # Smart filtering: Only show rows with data
            if has_val:
                processed.append(row_obj)
    else:
        # Fallback to dict-based processing
        for col, label in display_map.items():
            if col == 'period_ending':
                continue
            
            final_label = label
            if language == 'ar':
                final_label = AR_TERMS.get(label, label)

            row_obj = {
                'label': final_label,
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
                
            # Smart filtering: Only show rows with data
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
    curr = get_ticker_currency(ticker)
    
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
    period_ending = latest_income.get('period_ending')
    
    # 3. Compute Metrics based on Intent
    data_points = {}
    title_en = ""
    title_ar = ""
    insight_en = ""
    insight_ar = ""
    eps_methodology_en = ""
    eps_methodology_ar = ""
    
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
            "Gross Margin" if language == 'en' else "هامش إجمالي الربح": _format_percent(gross_margin),
            "Operating Margin" if language == 'en' else "الهامش التشغيلي": _format_percent(op_margin),
            "Net Profit Margin" if language == 'en' else "هامش صافي الربح": _format_percent(net_margin),
            "Revenue" if language == 'en' else "الإيرادات": _format_number(revenue, assume_millions=True, currency=curr),
            "Net Income" if language == 'en' else "صافي الدخل": _format_number(net_income, assume_millions=True, currency=curr)
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
            "Revenue Growth (YoY)" if language == 'en' else "نمو الإيرادات (سنوي)": _format_percent(rev_growth),
            "Net Income Growth" if language == 'en' else "نمو صافي الدخل": _format_percent(ni_growth),
            "Current Revenue" if language == 'en' else "الإيرادات الحالية": _format_number(revenue, assume_millions=True, currency=curr),
            "Current Net Income" if language == 'en' else "صافي الدخل الحالي": _format_number(net_income, assume_millions=True, currency=curr)
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
            
            de_str = f"{debt_equity:.2f}x" if debt_equity is not None else None
            da_str = _format_percent(debt_assets)
            
            data_points = {
                "Debt / Equity" if language == 'en' else "الدين / حقوق الملكية": de_str,
                "Debt / Assets" if language == 'en' else "الدين / الأصول": da_str,
                "Total Debt" if language == 'en' else "إجمالي الديون": _format_number(total_debt, assume_millions=True, currency=curr),
                "Total Equity" if language == 'en' else "إجمالي حقوق الملكية": _format_number(total_equity, assume_millions=True, currency=curr)
            }
        else:
             data_points = {"Status": "No Balance Sheet Data"}

    elif intent == "FIN_EPS":
        title_en = "Earnings Per Share"
        title_ar = "ربحية السهم"
        
        eps = float(latest_income.get('eps') or 0)
        eps_diluted = float(latest_income.get('eps_diluted') or 0)
        net_income_common = float(latest_income.get('net_income_common') or 0)

        # EPS is based on profit attributable to common shareholders when available.
        eps_income_base = net_income_common if net_income_common > 0 else net_income
        implied_basic_shares_mn = safe_div(eps_income_base, eps) if eps > 0 else None
        implied_diluted_shares_mn = safe_div(eps_income_base, eps_diluted) if eps_diluted > 0 else None
        period_label_en = f"FY {year} annual"
        period_label_ar = f"السنة المالية {year} (سنوي)"
        if period_ending:
            period_label_en += f" (period ending {period_ending})"
            period_label_ar += f" (منتهية في {period_ending})"
        
        data_points = {
            "Basic EPS" if language == 'en' else "ربحية السهم (الأساسية)": f"{eps:.2f} {curr}",
            "Diluted EPS" if language == 'en' else "ربحية السهم (المخففة)": f"{eps_diluted:.2f} {curr}",
            "Net Income" if language == 'en' else "صافي الدخل": _format_number(eps_income_base, assume_millions=True, currency=curr)
        }

        net_income_reported_mn_en = f"{eps_income_base:,.2f} million {curr}"
        net_income_reported_mn_ar = f"{eps_income_base:,.2f} مليون {curr}"
        implied_basic_txt = _format_share_count_from_millions(implied_basic_shares_mn)
        implied_diluted_txt = _format_share_count_from_millions(implied_diluted_shares_mn)
        eps_methodology_en = (
            f"\n**Calculation & Period:**\n"
            f"- **Period**: {period_label_en}.\n"
            f"- **Formula**: EPS = Net income attributable to common shareholders / weighted-average shares.\n"
            f"- **Net income basis used for EPS**: {net_income_reported_mn_en} (statement-reported in millions).\n"
            f"- **Implied weighted-average shares**: Basic ~ {implied_basic_txt or 'N/A'}, Diluted ~ {implied_diluted_txt or 'N/A'}.\n"
        )
        eps_methodology_ar = (
            f"\n**منهجية الحساب والفترة:**\n"
            f"- **الفترة**: {period_label_ar}.\n"
            f"- **المعادلة**: ربحية السهم = صافي الدخل المنسوب للمساهمين العاديين ÷ متوسط عدد الأسهم المرجح.\n"
            f"- **أساس صافي الدخل المستخدم**: {net_income_reported_mn_ar} (القوائم هنا معروضة بوحدة الملايين).\n"
            f"- **متوسط الأسهم الضمني**: الأساسي ~ {implied_basic_txt or 'غير متاح'}، المخفف ~ {implied_diluted_txt or 'غير متاح'}.\n"
        )
        
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

    if intent == "FIN_EPS":
        message_text += eps_methodology_ar if language == 'ar' else eps_methodology_en

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

    # Safety net: if the intent didn't map to a known ratio category, fall back to a
    # general ratio set so we never build "SELECT fiscal_year,  FROM ..." (syntax error).
    if not cols:
        cols = ['pe_ratio', 'pb_ratio', 'roe', 'roa', 'current_ratio', 'debt_equity']
        title_en = title_en or "Key Ratios"
        title_ar = title_ar or "أهم المؤشرات"

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
        
        if language == 'ar':
            label = AR_TERMS.get(label, label)
            
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
