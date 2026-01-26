
import os
import asyncio
import asyncpg
import pandas as pd
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mappings from stockanalysis_ingester.py
INCOME_MAPPING = {
    "Interest Income on Loans": "interest_income_loans",
    "Interest Income on Investments": "interest_income_investments",
    "Total Interest Income": "total_interest_income",
    "Interest Paid on Deposits": "interest_expense",
    "Net Interest Income": "net_interest_income",
    "Net Interest Income": "net_interest_income", # Duplicate in source
    "Net Interest Income Growth (YoY)": "net_interest_income_growth",
    "Revenues Before Loan Losses": "revenues_before_loan_losses",
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
    "Salaries and Employee Benefits": "salaries_and_benefits",
    "Amortization of Goodwill & Intangibles": "amortization_of_goodwill",
    "Other Unusual Items": "other_unusual_items",
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
    "Shares Outstanding (Basic)": "shares_outstanding",
    "Shares Outstanding (Diluted)": "shares_diluted",
    "Earnings From Continuing Operations": "earnings_from_continuing_ops",
    "Earnings From Discontinued Operations": "earnings_from_discontinued_ops",
    "Preferred Dividends & Other Adjustments": "preferred_dividends",
    "EBT Excluding Unusual Items": "ebt_excl_unusual",
}

BALANCE_MAPPING = {
    "Cash & Equivalents": "cash_equivalents",
    "Short-Term Investments": "short_term_investments",
    "Accounts Receivable": "accounts_receivable",
    "Inventory": "inventory",
    "Other Current Assets": "other_current_assets",
    "Total Current Assets": "total_current_assets",
    "Restricted Cash": "restricted_cash",
    "Accrued Interest Receivable": "accrued_interest_receivable",
    "Investment Securities": "investment_securities",
    "Trading Asset Securities": "trading_assets",
    "Total Investments": "total_investments",
    "Gross Loans": "gross_loans",
    "Allowance for Loan Losses": "allowance_loan_losses",
    "Net Loans": "net_loans",
    "Other Real Estate Owned & Foreclosed": "other_real_estate_owned",
    "Property, Plant & Equipment": "property_plant_equipment",
    "Goodwill": "goodwill",
    "Intangible Assets": "intangible_assets",
    "Other Non-Current Assets": "other_noncurrent_assets",
    "Total Assets": "total_assets",
    "Long-Term Deferred Tax Assets": "deferred_tax_assets",
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
    "Common Stock": "common_stock",
    "Additional Paid-In Capital": "additional_paid_in_capital",
    "Retained Earnings": "retained_earnings",
    "Treasury Stock": "treasury_stock",
    "Total Stockholders' Equity": "total_equity",
    "Total Equity": "total_equity",
    "Tangible Book Value": "tangible_book_value",
    "Minority Interest": "minority_interest",
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
    "Other Investing Activities": "other_investing_activities",
    "Cash from Investing Activities": "cash_from_investing",
    "Dividends Paid": "dividends_paid",
    "Share Repurchases": "share_repurchases",
    "Debt Issued": "debt_issued",
    "Debt Repaid": "debt_repaid",
    "Other Financing Activities": "other_financing_activities",
    "Cash from Financing Activities": "cash_from_financing",
    "Net Change in Cash": "net_change_cash",
    "Free Cash Flow": "free_cashflow",
    "Cash Income Tax Paid": "cash_income_tax_paid",
    "Net Increase (Decrease) in Deposit Accounts": "net_increase_deposits",
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
}

async def analyze_db(db_url):
    try:
        conn = await asyncpg.connect(db_url)
        tables = ["income_statements", "balance_sheets", "cashflow_statements", "financial_ratios_history"]
        
        report = {}
        
        for table in tables:
            # Count rows
            row_count = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
            
            # Get columns
            cols = await conn.fetch(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}'")
            col_names = [r['column_name'] for r in cols]
            
            report[table] = {
                "rows": row_count,
                "columns": col_names,
                "column_count": len(col_names)
            }
            
        await conn.close()
        return report
    except Exception as e:
        logger.error(f"DB Error: {e}")
        return None

def analyze_csv(csv_path):
    # Determine the section based on row content (basic heuristic)
    # The csv has headers like "INCOME STATEMENT", "BALANCE SHEET", "CASH FLOW STATEMENT"
    
    sections = {}
    current_section = None
    
    with open(csv_path, 'r') as f:
        for line in f:
            line = line.strip()
            if "INCOME STATEMENT" in line:
                current_section = "income"
                sections[current_section] = set()
            elif "BALANCE SHEET" in line:
                current_section = "balance"
                sections[current_section] = set()
            elif "CASH FLOW STATEMENT" in line:
                current_section = "cashflow"
                sections[current_section] = set()
            elif "GROWTH RATES" in line or "KEY BALANCE SHEET METRICS" in line or "PER SHARE DATA" in line or "OTHER ITEMS" in line:
                # These are sub-headers, but we keep the current main section
                pass
            
            # Extract the field name (first column)
            # The format is "Field Name", "Value", ...
            if current_section:
                parts = line.split(',')
                if parts:
                    field = parts[0].strip().replace('"', '')
                    # Filter out headers and dates and empty lines
                    if field and field not in ["INCOME STATEMENT", "BALANCE SHEET", "CASH FLOW STATEMENT", "Generated:", "All figures in EGP Millions unless otherwise stated", "Current", "Non-Current", "Total", "TOTAL", "ASSETS", "LIABILITIES", "EQUITY"]:
                         # Check if it looks like a field (not a date like FY 2020)
                         if not field.startswith("FY ") and field != "COMI (COMI)" and field != "Financial Statements":
                             sections[current_section].add(field)

    return sections

async def main():
    csv_path = "/Users/home/Documents/Info Site/mubasher-deep-extract/COMI_Financial_Statements (2).csv"
    csv_fields = analyze_csv(csv_path)
    
    # Analyze DB
    db_url = os.environ.get("DATABASE_URL")
    db_report = None
    if db_url:
        db_report = await analyze_db(db_url)
    
    # Compare
    print("--- GAP ANALYSIS REPORT ---")
    
    # Income
    print("\n[INCOME STATEMENT Analysis]")
    csv_inc = csv_fields.get("income", set())
    # Manual cleanup of CSV Headers that might be garbage
    csv_inc = {x for x in csv_inc if "════" not in x and len(x) > 2}
    
    mapped_inc = set(INCOME_MAPPING.keys())
    
    missing_inc = csv_inc - mapped_inc
    print(f"Total Fields in CSV: {len(csv_inc)}")
    print(f"Total Mapped Fields in Script: {len(mapped_inc)}")
    print(f"Missing in Script/DB: {len(missing_inc)}")
    if missing_inc:
        print("Missing Fields:")
        for f in sorted(list(missing_inc)):
            print(f" - {f}")
            
    # Balance
    print("\n[BALANCE SHEET Analysis]")
    csv_bal = csv_fields.get("balance", set())
    csv_bal = {x for x in csv_bal if "════" not in x and len(x) > 2}
    mapped_bal = set(BALANCE_MAPPING.keys())
    
    missing_bal = csv_bal - mapped_bal
    print(f"Total Fields in CSV: {len(csv_bal)}")
    print(f"Total Mapped Fields in Script: {len(mapped_bal)}")
    print(f"Missing in Script/DB: {len(missing_bal)}")
    if missing_bal:
        print("Missing Fields:")
        for f in sorted(list(missing_bal)):
            print(f" - {f}")
            
    # Cashflow
    print("\n[CASH FLOW Analysis]")
    csv_cf = csv_fields.get("cashflow", set())
    csv_cf = {x for x in csv_cf if "════" not in x and len(x) > 2}
    mapped_cf = set(CASHFLOW_MAPPING.keys())
    
    missing_cf = csv_cf - mapped_cf
    print(f"Total Fields in CSV: {len(csv_cf)}")
    print(f"Total Mapped Fields in Script: {len(mapped_cf)}")
    print(f"Missing in Script/DB: {len(missing_cf)}")
    if missing_cf:
        print("Missing Fields:")
        for f in sorted(list(missing_cf)):
            print(f" - {f}")

    if db_report:
        print("\n[DATABASE STATE Analysis]")
        for table, stats in db_report.items():
            print(f"\nTable: {table}")
            print(f" - Total Rows: {stats['rows']}")
            print(f" - Total Columns: {stats['column_count']}")
            # print(f" - Columns: {stats['columns']}")

if __name__ == "__main__":
    asyncio.run(main())
