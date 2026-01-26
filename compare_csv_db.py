
import csv
import re

# DB Schema (hardcoded from previous findings to save time/tools)
db_income_cols = {
    'revenue', 'cost_of_revenue', 'gross_profit', 'gross_margin', 'operating_expenses', 
    'rd_expense', 'sga_expense', 'depreciation', 'operating_income', 'operating_margin', 
    'interest_expense_nonop', 'pretax_income', 'income_tax', 'effective_tax_rate', 
    'net_income', 'net_income_growth', 'net_margin', 'eps', 'eps_diluted', 
    'shares_outstanding', 'shares_diluted', 'ebitda', 'ebitda_margin', 'ebit', 
    'ebit_margin', 'interest_income_loans', 'interest_income_investments', 
    'total_interest_income', 'interest_expense', 'net_interest_income', 
    'net_interest_income_growth', 'trading_income', 'fee_income', 'gain_loss_assets', 
    'gain_loss_investments', 'other_noninterest_income', 'total_noninterest_income', 
    'provision_credit_losses', 'revenues_before_loan_losses', 'salaries_and_benefits', 
    'amortization_of_goodwill', 'other_unusual_items', 'earnings_from_discontinued_ops', 
    'earnings_from_continuing_ops', 'preferred_dividends', 'ebt_excl_unusual'
}

db_balance_cols = {
    'cash_equivalents', 'short_term_investments', 'accounts_receivable', 'inventory', 
    'other_current_assets', 'total_current_assets', 'investment_securities', 
    'trading_assets', 'total_investments', 'gross_loans', 'allowance_loan_losses', 
    'net_loans', 'property_plant_equipment', 'ppe_net', 'goodwill', 'intangible_assets', 
    'other_noncurrent_assets', 'total_noncurrent_assets', 'total_assets', 'accounts_payable', 
    'short_term_debt', 'current_portion_ltd', 'accrued_liabilities', 'deferred_revenue', 
    'other_current_liabilities', 'total_current_liabilities', 'deposits', 'long_term_debt', 
    'deferred_tax_liabilities', 'other_noncurrent_liabilities', 'total_noncurrent_liabilities', 
    'total_liabilities', 'common_stock', 'additional_paid_in_capital', 'retained_earnings', 
    'treasury_stock', 'accumulated_other_comprehensive_income', 'minority_interest', 
    'total_equity', 'restricted_cash', 'accrued_interest_receivable', 
    'interest_bearing_deposits', 'non_interest_bearing_deposits', 'other_real_estate_owned', 
    'tangible_book_value', 'deferred_tax_assets', 'long_term_deferred_tax_liabilities', 
    'comprehensive_income_other', 'current_income_tax_payable', 'accrued_interest_payable', 
    'accrued_expenses', 'other_receivables', 'other_intangible_assets', 
    'other_long_term_assets', 'total_common_equity'
}

db_cashflow_cols = {
    'net_income', 'depreciation_amortization', 'stock_based_compensation', 'deferred_taxes', 
    'gain_loss_assets', 'gain_loss_investments', 'provision_credit_losses', 
    'change_in_trading_assets', 'change_in_receivables', 'change_in_inventory', 
    'change_in_payables', 'change_in_other_working_capital', 'other_operating_activities', 
    'cash_from_operating', 'capex', 'acquisitions', 'investment_purchases', 'investment_sales', 
    'other_investing_activities', 'cash_from_investing', 'dividends_paid', 'share_repurchases', 
    'share_issuances', 'debt_issued', 'debt_repaid', 'other_financing_activities', 
    'cash_from_financing', 'fx_effect', 'net_change_cash', 'beginning_cash', 'ending_cash', 
    'free_cashflow', 'cash_income_tax_paid', 'net_increase_deposits', 'issuance_common_stock', 
    'long_term_debt_issued', 'long_term_debt_repaid', 'change_in_income_tax', 
    'change_in_working_capital', 'income_loss_equity_investments', 'total_asset_writedown', 
    'divestitures', 'cash_acquisitions', 'investment_in_securities', 'sale_of_ppe', 
    'other_amortization'
}

def normalize(text):
    # Convert "Interest Income on Loans" -> "interest_income_loans"
    text = text.strip()
    text = re.sub(r'\(.*?\)', '', text) # Remove ()
    text = text.lower()
    text = text.replace(' & ', '_').replace(' ', '_').replace('-', '_').replace('__', '_')
    text = text.replace(',', '')
    text = text.replace('/', '_')
    # specific fixups
    if text == "interest_income_on_loans": return "interest_income_loans"
    if text == "interest_income_on_investments": return "interest_income_investments"
    if text == "interest_paid_on_deposits": return "interest_expense" # Usually equivalent
    if text == "salaries_and_employee_benefits": return "salaries_and_benefits"
    if text == "investment_securities": return "investment_securities"
    return text

def analyze_csv(file_path):
    csv_fields = {'income': [], 'balance': [], 'cashflow': []}
    current_section = None
    
    with open(file_path, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if not row or not row[0].strip(): continue
            item = row[0].strip()
            
            if "INCOME STATEMENT" in item: current_section = 'income'
            elif "BALANCE SHEET" in item: current_section = 'balance'
            elif "CASH FLOW STATEMENT" in item: current_section = 'cashflow'
            elif "GROWTH RATES" in item: continue # Skip growth headers for now
            elif "PER SHARE DATA" in item: continue
            elif "OTHER ITEMS" in item: pass # Keep analyzing
            elif "════" in item: continue
            elif item and current_section:
                csv_fields[current_section].append(item)

    # Compare
    print("=== GAP ANALYSIS REPORT ===\n")
    
    # 1. Income Statement
    print("--- INCOME STATEMENT ---")
    matched_inc = []
    missing_inc = []
    for item in csv_fields['income']:
        norm = normalize(item)
        found = False
        # Exact or close match
        if norm in db_income_cols: found = True
        # manual mapping checks
        elif norm == "revenue_growth" and "revenue_growth" in db_income_cols: found = True # Wait, csv label might be "Revenue Growth (YoY)"
        elif norm == "selling_general_administrative" and "sga_expense" in db_income_cols: found = True
        elif norm == "income_from_trading_activities" and "trading_income" in db_income_cols: found = True
        
        if found: matched_inc.append(item)
        else: missing_inc.append((item, norm))
        
    print(f"Matched: {len(matched_inc)} fields")
    print(f"Propable Gaps ({len(missing_inc)}):")
    for orig, norm in missing_inc:
        print(f"  [CSV] {orig}  -> (norm: {norm})")
        
    # 2. Balance Sheet
    print("\n--- BALANCE SHEET ---")
    matched_bs = []
    missing_bs = []
    for item in csv_fields['balance']:
        norm = normalize(item)
        found = False
        if norm in db_balance_cols: found = True
        # mappings
        elif norm == "cash_equivalents" and "cash_equivalents" in db_balance_cols: found = True
        elif norm == "property_plant_equipment" and "property_plant_equipment" in db_balance_cols: found = True
        elif norm == "short_term_borrowings" and ("short_term_debt" in db_balance_cols): found = True
        
        if found: matched_bs.append(item)
        else: missing_bs.append((item, norm))
        
    print(f"Matched: {len(matched_bs)} fields")
    print(f"Propable Gaps ({len(missing_bs)}):")
    for orig, norm in missing_bs:
        print(f"  [CSV] {orig}  -> (norm: {norm})")

    # 3. Cash Flow
    print("\n--- CASH FLOW ---")
    matched_cf = []
    missing_cf = []
    for item in csv_fields['cashflow']:
        norm = normalize(item)
        found = False
        if norm in db_cashflow_cols: found = True
        # mappings
        elif norm == "net_increase_in_deposit_accounts" and "net_increase_deposits" in db_cashflow_cols: found = True
        elif norm == "sale_of_property_plant_and_equipment" and "sale_of_ppe" in db_cashflow_cols: found = True

        if found: matched_cf.append(item)
        else: missing_cf.append((item, norm))

    print(f"Matched: {len(matched_cf)} fields")
    print(f"Propable Gaps ({len(missing_cf)}):")
    for orig, norm in missing_cf:
        print(f"  [CSV] {orig}  -> (norm: {norm})")

if __name__ == "__main__":
    analyze_csv("/Users/home/Documents/Info Site/mubasher-deep-extract/COMI_Financial_Statements (2).csv")
