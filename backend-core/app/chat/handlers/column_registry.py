"""
Column Registry — Shared metadata for all financial data columns.
Maps DB column names to human-readable labels, categories, and formatting rules.
Used by the explorer handlers to dynamically serve any financial data.
"""

from typing import Dict, List, Optional, Any

# ============================================================================
# FORMAT TYPES
# ============================================================================
FMT_CURRENCY = "currency"        # e.g. 75,907M EGP
FMT_PERCENT = "percent"          # e.g. 12.85%
FMT_RATIO = "ratio"              # e.g. 1.19x
FMT_NUMBER = "number"            # e.g. 2,139
FMT_SCORE = "score"              # e.g. 3/9
FMT_PER_SHARE = "per_share"      # e.g. EGP 1.58

# ============================================================================
# INCOME STATEMENT COLUMNS
# ============================================================================
INCOME_COLUMNS: Dict[str, Dict[str, Any]] = {
    # === Revenue & Top Line ===
    "revenue": {"label": "Revenue", "label_ar": "الإيرادات", "format": FMT_CURRENCY, "category": "topline", "keywords": ["revenue", "sales", "top line", "إيرادات", "مبيعات"]},
    "revenue_growth": {"label": "Revenue Growth (YoY)", "label_ar": "نمو الإيرادات", "format": FMT_PERCENT, "category": "topline", "keywords": ["revenue growth", "sales growth", "نمو الإيرادات"]},
    "cost_of_revenue": {"label": "Cost of Revenue", "label_ar": "تكلفة الإيرادات", "format": FMT_CURRENCY, "category": "costs", "keywords": ["cost of revenue", "cogs", "cost of goods", "تكلفة"]},
    "gross_profit": {"label": "Gross Profit", "label_ar": "إجمالي الربح", "format": FMT_CURRENCY, "category": "topline", "keywords": ["gross profit", "إجمالي الربح"]},
    "gross_margin": {"label": "Gross Margin", "label_ar": "هامش الربح الإجمالي", "format": FMT_PERCENT, "category": "margins", "keywords": ["gross margin", "هامش إجمالي"]},
    # === Operating ===
    "operating_expenses": {"label": "Operating Expenses", "label_ar": "مصروفات التشغيل", "format": FMT_CURRENCY, "category": "costs", "keywords": ["operating expenses", "opex", "مصروفات تشغيل"]},
    "sga_expense": {"label": "SG&A Expense", "label_ar": "مصروفات بيعية وإدارية", "format": FMT_CURRENCY, "category": "costs", "keywords": ["sga", "selling general", "بيعية", "إدارية"]},
    "research_development": {"label": "R&D Expense", "label_ar": "مصروفات البحث والتطوير", "format": FMT_CURRENCY, "category": "costs", "keywords": ["r&d", "research", "development", "بحث وتطوير"]},
    "selling_marketing": {"label": "Selling & Marketing", "label_ar": "مصروفات البيع والتسويق", "format": FMT_CURRENCY, "category": "costs", "keywords": ["selling", "marketing", "تسويق"]},
    "general_admin": {"label": "General & Admin", "label_ar": "مصروفات عمومية وإدارية", "format": FMT_CURRENCY, "category": "costs", "keywords": ["general admin", "g&a", "عمومية"]},
    "other_operating_expenses": {"label": "Other Operating Expenses", "label_ar": "مصروفات تشغيل أخرى", "format": FMT_CURRENCY, "category": "costs", "keywords": ["other operating", "مصروفات أخرى"]},
    "operating_income": {"label": "Operating Income", "label_ar": "الدخل التشغيلي", "format": FMT_CURRENCY, "category": "operating", "keywords": ["operating income", "EBIT", "دخل تشغيلي"]},
    "operating_margin": {"label": "Operating Margin", "label_ar": "هامش التشغيل", "format": FMT_PERCENT, "category": "margins", "keywords": ["operating margin", "هامش تشغيل"]},
    # === EBITDA ===
    "ebitda": {"label": "EBITDA", "label_ar": "الأرباح قبل الفوائد والضرائب والاستهلاك", "format": FMT_CURRENCY, "category": "operating", "keywords": ["ebitda"]},
    "ebitda_margin": {"label": "EBITDA Margin", "label_ar": "هامش EBITDA", "format": FMT_PERCENT, "category": "margins", "keywords": ["ebitda margin"]},
    "ebit": {"label": "EBIT", "label_ar": "الأرباح قبل الفوائد والضرائب", "format": FMT_CURRENCY, "category": "operating", "keywords": ["ebit"]},
    "ebit_margin": {"label": "EBIT Margin", "label_ar": "هامش EBIT", "format": FMT_PERCENT, "category": "margins", "keywords": ["ebit margin"]},
    "da_for_ebitda": {"label": "D&A (for EBITDA)", "label_ar": "الاستهلاك والإطفاء", "format": FMT_CURRENCY, "category": "operating", "keywords": ["depreciation", "amortization", "d&a", "استهلاك"]},
    # === Bottom Line ===
    "pretax_income": {"label": "Pre-Tax Income", "label_ar": "الدخل قبل الضرائب", "format": FMT_CURRENCY, "category": "bottomline", "keywords": ["pretax", "pre-tax", "قبل الضرائب"]},
    "income_tax": {"label": "Income Tax", "label_ar": "ضريبة الدخل", "format": FMT_CURRENCY, "category": "taxes", "keywords": ["tax", "income tax", "ضريبة"]},
    "effective_tax_rate": {"label": "Effective Tax Rate", "label_ar": "معدل الضريبة الفعلي", "format": FMT_PERCENT, "category": "taxes", "keywords": ["tax rate", "effective tax", "معدل ضريبة"]},
    "net_income": {"label": "Net Income", "label_ar": "صافي الدخل", "format": FMT_CURRENCY, "category": "bottomline", "keywords": ["net income", "net profit", "صافي الدخل", "صافي الربح"]},
    "net_income_growth": {"label": "Net Income Growth", "label_ar": "نمو صافي الدخل", "format": FMT_PERCENT, "category": "bottomline", "keywords": ["net income growth", "profit growth", "نمو الأرباح"]},
    "net_margin": {"label": "Net Margin", "label_ar": "هامش صافي الربح", "format": FMT_PERCENT, "category": "margins", "keywords": ["net margin", "profit margin", "هامش صافي"]},
    "net_income_common": {"label": "Net Income (Common)", "label_ar": "صافي الدخل للمساهمين", "format": FMT_CURRENCY, "category": "bottomline", "keywords": ["net income common", "common shareholders"]},
    # === Per Share ===
    "eps": {"label": "EPS (Basic)", "label_ar": "ربحية السهم", "format": FMT_PER_SHARE, "category": "per_share", "keywords": ["eps", "earnings per share", "ربحية السهم"]},
    "eps_diluted": {"label": "EPS (Diluted)", "label_ar": "ربحية السهم المخففة", "format": FMT_PER_SHARE, "category": "per_share", "keywords": ["diluted eps", "eps diluted"]},
    "eps_growth": {"label": "EPS Growth", "label_ar": "نمو ربحية السهم", "format": FMT_PERCENT, "category": "per_share", "keywords": ["eps growth", "نمو ربحية"]},
    "shares_outstanding": {"label": "Shares Outstanding", "label_ar": "الأسهم القائمة", "format": FMT_NUMBER, "category": "shares", "keywords": ["shares outstanding", "أسهم قائمة"]},
    "shares_diluted": {"label": "Shares (Diluted)", "label_ar": "الأسهم المخففة", "format": FMT_NUMBER, "category": "shares", "keywords": ["diluted shares"]},
    # === Banking-Specific ===
    "interest_income_loans": {"label": "Interest Income (Loans)", "label_ar": "دخل فوائد القروض", "format": FMT_CURRENCY, "category": "banking", "keywords": ["interest income loans", "فوائد قروض"]},
    "interest_income_investments": {"label": "Interest Income (Investments)", "label_ar": "دخل فوائد الاستثمارات", "format": FMT_CURRENCY, "category": "banking", "keywords": ["interest income investments"]},
    "total_interest_income": {"label": "Total Interest Income", "label_ar": "إجمالي دخل الفوائد", "format": FMT_CURRENCY, "category": "banking", "keywords": ["total interest income", "إجمالي فوائد"]},
    "interest_expense": {"label": "Interest Expense", "label_ar": "مصروفات الفوائد", "format": FMT_CURRENCY, "category": "banking", "keywords": ["interest expense", "مصروف فوائد"]},
    "net_interest_income": {"label": "Net Interest Income", "label_ar": "صافي دخل الفوائد", "format": FMT_CURRENCY, "category": "banking", "keywords": ["net interest income", "NII", "صافي فوائد"]},
    "fee_commission_income": {"label": "Fee & Commission Income", "label_ar": "دخل الرسوم والعمولات", "format": FMT_CURRENCY, "category": "banking", "keywords": ["fee", "commission", "رسوم", "عمولات"]},
    "loan_loss_provisions": {"label": "Loan Loss Provisions", "label_ar": "مخصصات خسائر القروض", "format": FMT_CURRENCY, "category": "banking", "keywords": ["provisions", "loan loss", "مخصصات"]},
    "provision_credit_losses": {"label": "Provision for Credit Losses", "label_ar": "مخصصات خسائر الائتمان", "format": FMT_CURRENCY, "category": "banking", "keywords": ["credit losses", "خسائر ائتمان"]},
    # === Other ===
    "interest_expense_nonop": {"label": "Interest Expense (Non-Op)", "label_ar": "مصروف فوائد غير تشغيلي", "format": FMT_CURRENCY, "category": "nonop", "keywords": ["interest expense nonop"]},
    "interest_investment_income": {"label": "Investment Income", "label_ar": "دخل الاستثمارات", "format": FMT_CURRENCY, "category": "nonop", "keywords": ["investment income", "دخل استثمارات"]},
    "fx_gain_loss": {"label": "FX Gain/Loss", "label_ar": "أرباح/خسائر عملة", "format": FMT_CURRENCY, "category": "nonop", "keywords": ["fx", "foreign exchange", "currency", "عملة"]},
    "other_nonop_income": {"label": "Other Non-Op Income", "label_ar": "دخل آخر غير تشغيلي", "format": FMT_CURRENCY, "category": "nonop", "keywords": ["other non-operating"]},
    "preferred_dividends": {"label": "Preferred Dividends", "label_ar": "أرباح أسهم ممتازة", "format": FMT_CURRENCY, "category": "bottomline", "keywords": ["preferred dividends", "أرباح ممتازة"]},
    "minority_interest_earnings": {"label": "Minority Interest", "label_ar": "حقوق الأقلية", "format": FMT_CURRENCY, "category": "bottomline", "keywords": ["minority interest", "حقوق أقلية"]},
    "earnings_continuing_ops": {"label": "Earnings (Continuing Ops)", "label_ar": "أرباح العمليات المستمرة", "format": FMT_CURRENCY, "category": "bottomline", "keywords": ["continuing operations"]},
    "earnings_equity_investments": {"label": "Equity Investment Earnings", "label_ar": "أرباح استثمارات حقوق ملكية", "format": FMT_CURRENCY, "category": "nonop", "keywords": ["equity investments"]},
    "free_cashflow": {"label": "Free Cash Flow", "label_ar": "التدفق النقدي الحر", "format": FMT_CURRENCY, "category": "cashflow", "keywords": ["free cash flow", "fcf", "تدفق نقدي حر"]},
    "fcf_per_share": {"label": "FCF Per Share", "label_ar": "التدفق النقدي الحر للسهم", "format": FMT_PER_SHARE, "category": "per_share", "keywords": ["fcf per share"]},
    "fcf_margin": {"label": "FCF Margin", "label_ar": "هامش التدفق النقدي الحر", "format": FMT_PERCENT, "category": "margins", "keywords": ["fcf margin"]},
}

# ============================================================================
# BALANCE SHEET COLUMNS
# ============================================================================
BALANCE_COLUMNS: Dict[str, Dict[str, Any]] = {
    # === Current Assets ===
    "cash_equivalents": {"label": "Cash & Equivalents", "label_ar": "النقد وما يعادله", "format": FMT_CURRENCY, "category": "current_assets", "keywords": ["cash", "cash equivalents", "نقد"]},
    "short_term_investments": {"label": "Short-Term Investments", "label_ar": "استثمارات قصيرة الأجل", "format": FMT_CURRENCY, "category": "current_assets", "keywords": ["short term investments"]},
    "accounts_receivable": {"label": "Accounts Receivable", "label_ar": "ذمم مدينة", "format": FMT_CURRENCY, "category": "current_assets", "keywords": ["receivables", "accounts receivable", "ذمم مدينة"]},
    "inventory": {"label": "Inventory", "label_ar": "المخزون", "format": FMT_CURRENCY, "category": "current_assets", "keywords": ["inventory", "stock", "مخزون"]},
    "prepaid_expenses": {"label": "Prepaid Expenses", "label_ar": "مصروفات مدفوعة مقدماً", "format": FMT_CURRENCY, "category": "current_assets", "keywords": ["prepaid", "مدفوعة مقدما"]},
    "other_current_assets": {"label": "Other Current Assets", "label_ar": "أصول متداولة أخرى", "format": FMT_CURRENCY, "category": "current_assets", "keywords": ["other current assets"]},
    "total_current_assets": {"label": "Total Current Assets", "label_ar": "إجمالي الأصول المتداولة", "format": FMT_CURRENCY, "category": "current_assets", "keywords": ["current assets", "أصول متداولة"]},
    "total_receivables": {"label": "Total Receivables", "label_ar": "إجمالي الذمم المدينة", "format": FMT_CURRENCY, "category": "current_assets", "keywords": ["total receivables"]},
    "cash_and_st_investments": {"label": "Cash & ST Investments", "label_ar": "النقد والاستثمارات قصيرة الأجل", "format": FMT_CURRENCY, "category": "current_assets", "keywords": ["cash and investments"]},
    # === Non-Current Assets ===
    "property_plant_equipment": {"label": "PP&E (Net)", "label_ar": "الأصول الثابتة", "format": FMT_CURRENCY, "category": "noncurrent_assets", "keywords": ["ppe", "property plant equipment", "fixed assets", "أصول ثابتة"]},
    "ppe_land": {"label": "PP&E - Land", "label_ar": "أراضي", "format": FMT_CURRENCY, "category": "ppe_detail", "keywords": ["land", "أراضي"]},
    "ppe_buildings": {"label": "PP&E - Buildings", "label_ar": "مباني", "format": FMT_CURRENCY, "category": "ppe_detail", "keywords": ["buildings", "مباني"]},
    "ppe_machinery": {"label": "PP&E - Machinery", "label_ar": "آلات ومعدات", "format": FMT_CURRENCY, "category": "ppe_detail", "keywords": ["machinery", "equipment", "آلات", "معدات"]},
    "ppe_construction": {"label": "PP&E - Under Construction", "label_ar": "مشاريع تحت التنفيذ", "format": FMT_CURRENCY, "category": "ppe_detail", "keywords": ["construction", "under construction", "تحت التنفيذ"]},
    "ppe_leasehold": {"label": "PP&E - Leasehold", "label_ar": "تحسينات مستأجرة", "format": FMT_CURRENCY, "category": "ppe_detail", "keywords": ["leasehold"]},
    "goodwill": {"label": "Goodwill", "label_ar": "الشهرة", "format": FMT_CURRENCY, "category": "noncurrent_assets", "keywords": ["goodwill", "شهرة"]},
    "intangible_assets": {"label": "Intangible Assets", "label_ar": "أصول غير ملموسة", "format": FMT_CURRENCY, "category": "noncurrent_assets", "keywords": ["intangible", "غير ملموسة"]},
    "long_term_investments": {"label": "Long-Term Investments", "label_ar": "استثمارات طويلة الأجل", "format": FMT_CURRENCY, "category": "noncurrent_assets", "keywords": ["long term investments"]},
    "other_noncurrent_assets": {"label": "Other Non-Current Assets", "label_ar": "أصول غير متداولة أخرى", "format": FMT_CURRENCY, "category": "noncurrent_assets", "keywords": ["other noncurrent"]},
    "total_assets": {"label": "Total Assets", "label_ar": "إجمالي الأصول", "format": FMT_CURRENCY, "category": "total", "keywords": ["total assets", "إجمالي الأصول"]},
    # === Current Liabilities ===
    "accounts_payable": {"label": "Accounts Payable", "label_ar": "ذمم دائنة", "format": FMT_CURRENCY, "category": "current_liabilities", "keywords": ["payable", "accounts payable", "ذمم دائنة"]},
    "short_term_debt": {"label": "Short-Term Debt", "label_ar": "ديون قصيرة الأجل", "format": FMT_CURRENCY, "category": "debt", "keywords": ["short term debt", "ديون قصيرة"]},
    "current_portion_ltd": {"label": "Current Portion of LT Debt", "label_ar": "الجزء المتداول من الديون طويلة الأجل", "format": FMT_CURRENCY, "category": "debt", "keywords": ["current portion", "الجزء المتداول"]},
    "accrued_liabilities": {"label": "Accrued Liabilities", "label_ar": "مصروفات مستحقة", "format": FMT_CURRENCY, "category": "current_liabilities", "keywords": ["accrued", "مستحقة"]},
    "deferred_revenue": {"label": "Deferred Revenue", "label_ar": "إيرادات مؤجلة", "format": FMT_CURRENCY, "category": "current_liabilities", "keywords": ["deferred revenue", "إيرادات مؤجلة"]},
    "current_taxes_payable": {"label": "Current Taxes Payable", "label_ar": "ضرائب مستحقة", "format": FMT_CURRENCY, "category": "current_liabilities", "keywords": ["taxes payable", "ضرائب مستحقة"]},
    "other_current_liabilities": {"label": "Other Current Liabilities", "label_ar": "التزامات متداولة أخرى", "format": FMT_CURRENCY, "category": "current_liabilities", "keywords": ["other current liabilities"]},
    "total_current_liabilities": {"label": "Total Current Liabilities", "label_ar": "إجمالي الالتزامات المتداولة", "format": FMT_CURRENCY, "category": "current_liabilities", "keywords": ["current liabilities", "التزامات متداولة"]},
    "current_portion_leases": {"label": "Current Lease Obligations", "label_ar": "التزامات إيجار متداولة", "format": FMT_CURRENCY, "category": "current_liabilities", "keywords": ["lease obligations", "إيجار"]},
    # === Non-Current Liabilities ===
    "long_term_debt": {"label": "Long-Term Debt", "label_ar": "ديون طويلة الأجل", "format": FMT_CURRENCY, "category": "debt", "keywords": ["long term debt", "ديون طويلة"]},
    "long_term_leases": {"label": "Long-Term Leases", "label_ar": "التزامات إيجار طويلة", "format": FMT_CURRENCY, "category": "noncurrent_liabilities", "keywords": ["long term leases"]},
    "deferred_tax_liabilities": {"label": "Deferred Tax Liabilities", "label_ar": "التزامات ضريبية مؤجلة", "format": FMT_CURRENCY, "category": "noncurrent_liabilities", "keywords": ["deferred tax"]},
    "other_noncurrent_liabilities": {"label": "Other Non-Current Liabilities", "label_ar": "التزامات غير متداولة أخرى", "format": FMT_CURRENCY, "category": "noncurrent_liabilities", "keywords": ["other noncurrent liabilities"]},
    "total_liabilities": {"label": "Total Liabilities", "label_ar": "إجمالي الالتزامات", "format": FMT_CURRENCY, "category": "total", "keywords": ["total liabilities", "إجمالي الالتزامات"]},
    "total_debt": {"label": "Total Debt", "label_ar": "إجمالي الديون", "format": FMT_CURRENCY, "category": "debt", "keywords": ["total debt", "إجمالي ديون"]},
    # === Equity ===
    "common_stock": {"label": "Common Stock", "label_ar": "رأس المال", "format": FMT_CURRENCY, "category": "equity", "keywords": ["common stock", "رأس المال"]},
    "retained_earnings": {"label": "Retained Earnings", "label_ar": "أرباح محتجزة", "format": FMT_CURRENCY, "category": "equity", "keywords": ["retained earnings", "أرباح محتجزة"]},
    "treasury_stock": {"label": "Treasury Stock", "label_ar": "أسهم خزينة", "format": FMT_CURRENCY, "category": "equity", "keywords": ["treasury", "أسهم خزينة"]},
    "accumulated_other_comprehensive_income": {"label": "Accumulated OCI", "label_ar": "الدخل الشامل الآخر المتراكم", "format": FMT_CURRENCY, "category": "equity", "keywords": ["oci", "comprehensive income"]},
    "minority_interest": {"label": "Minority Interest", "label_ar": "حقوق الأقلية", "format": FMT_CURRENCY, "category": "equity", "keywords": ["minority interest", "حقوق أقلية"]},
    "total_equity": {"label": "Total Equity", "label_ar": "إجمالي حقوق الملكية", "format": FMT_CURRENCY, "category": "equity", "keywords": ["total equity", "حقوق ملكية"]},
    "total_common_equity": {"label": "Total Common Equity", "label_ar": "إجمالي حقوق المساهمين", "format": FMT_CURRENCY, "category": "equity", "keywords": ["common equity"]},
    # === Per Share & Derived ===
    "book_value_per_share": {"label": "Book Value/Share", "label_ar": "القيمة الدفترية للسهم", "format": FMT_PER_SHARE, "category": "per_share", "keywords": ["book value per share", "bvps", "قيمة دفترية"]},
    "tangible_book_value": {"label": "Tangible Book Value", "label_ar": "القيمة الدفترية الملموسة", "format": FMT_CURRENCY, "category": "equity", "keywords": ["tangible book", "ملموسة"]},
    "tangible_bv_per_share": {"label": "Tangible BV/Share", "label_ar": "القيمة الدفترية الملموسة للسهم", "format": FMT_PER_SHARE, "category": "per_share", "keywords": ["tangible bv per share"]},
    "net_cash": {"label": "Net Cash", "label_ar": "صافي النقد", "format": FMT_CURRENCY, "category": "debt", "keywords": ["net cash", "net debt", "صافي النقد"]},
    "net_cash_per_share": {"label": "Net Cash/Share", "label_ar": "صافي النقد للسهم", "format": FMT_PER_SHARE, "category": "per_share", "keywords": ["net cash per share"]},
    "working_capital": {"label": "Working Capital", "label_ar": "رأس المال العامل", "format": FMT_CURRENCY, "category": "liquidity", "keywords": ["working capital", "رأس مال عامل"]},
    "cash_growth": {"label": "Cash Growth", "label_ar": "نمو النقد", "format": FMT_PERCENT, "category": "current_assets", "keywords": ["cash growth", "نمو النقد"]},
    "total_liabilities_equity": {"label": "Total Liabilities & Equity", "label_ar": "إجمالي الالتزامات وحقوق الملكية", "format": FMT_CURRENCY, "category": "total", "keywords": ["total liabilities equity"]},
}

# ============================================================================
# CASH FLOW STATEMENT COLUMNS
# ============================================================================
CASHFLOW_COLUMNS: Dict[str, Dict[str, Any]] = {
    # === Operating ===
    "net_income": {"label": "Net Income", "label_ar": "صافي الدخل", "format": FMT_CURRENCY, "category": "operating", "keywords": ["net income"]},
    "depreciation_amortization": {"label": "Depreciation & Amortization", "label_ar": "الاستهلاك والإطفاء", "format": FMT_CURRENCY, "category": "operating", "keywords": ["depreciation", "amortization", "استهلاك"]},
    "stock_based_compensation": {"label": "Stock-Based Compensation", "label_ar": "تعويضات قائمة على الأسهم", "format": FMT_CURRENCY, "category": "operating", "keywords": ["stock compensation"]},
    "change_in_receivables": {"label": "Change in Receivables", "label_ar": "التغير في الذمم المدينة", "format": FMT_CURRENCY, "category": "working_capital", "keywords": ["change receivables"]},
    "change_in_inventory": {"label": "Change in Inventory", "label_ar": "التغير في المخزون", "format": FMT_CURRENCY, "category": "working_capital", "keywords": ["change inventory"]},
    "change_in_payables": {"label": "Change in Payables", "label_ar": "التغير في الذمم الدائنة", "format": FMT_CURRENCY, "category": "working_capital", "keywords": ["change payables"]},
    "change_in_working_capital": {"label": "Change in Working Capital", "label_ar": "التغير في رأس المال العامل", "format": FMT_CURRENCY, "category": "working_capital", "keywords": ["working capital change"]},
    "other_operating_activities": {"label": "Other Operating Activities", "label_ar": "أنشطة تشغيلية أخرى", "format": FMT_CURRENCY, "category": "operating", "keywords": ["other operating"]},
    "cash_from_operating": {"label": "Cash from Operations (OCF)", "label_ar": "التدفقات النقدية من التشغيل", "format": FMT_CURRENCY, "category": "operating", "keywords": ["operating cash flow", "ocf", "cash from operations", "تدفقات تشغيل"]},
    "ocf_growth": {"label": "OCF Growth", "label_ar": "نمو التدفق التشغيلي", "format": FMT_PERCENT, "category": "operating", "keywords": ["ocf growth"]},
    # === Investing ===
    "capex": {"label": "Capital Expenditure", "label_ar": "الإنفاق الرأسمالي", "format": FMT_CURRENCY, "category": "investing", "keywords": ["capex", "capital expenditure", "إنفاق رأسمالي"]},
    "acquisitions": {"label": "Acquisitions", "label_ar": "استحواذات", "format": FMT_CURRENCY, "category": "investing", "keywords": ["acquisitions", "استحواذات"]},
    "investment_purchases": {"label": "Investment Purchases", "label_ar": "شراء استثمارات", "format": FMT_CURRENCY, "category": "investing", "keywords": ["investment purchases"]},
    "investment_sales": {"label": "Investment Sales", "label_ar": "بيع استثمارات", "format": FMT_CURRENCY, "category": "investing", "keywords": ["investment sales"]},
    "sale_of_ppe": {"label": "Sale of PP&E", "label_ar": "بيع أصول ثابتة", "format": FMT_CURRENCY, "category": "investing", "keywords": ["sale of ppe", "sell assets"]},
    "other_investing_activities": {"label": "Other Investing Activities", "label_ar": "أنشطة استثمارية أخرى", "format": FMT_CURRENCY, "category": "investing", "keywords": ["other investing"]},
    "cash_from_investing": {"label": "Cash from Investing", "label_ar": "التدفقات النقدية من الاستثمار", "format": FMT_CURRENCY, "category": "investing", "keywords": ["investing cash flow", "cash from investing", "تدفقات استثمار"]},
    # === Financing ===
    "dividends_paid": {"label": "Dividends Paid", "label_ar": "توزيعات أرباح مدفوعة", "format": FMT_CURRENCY, "category": "financing", "keywords": ["dividends paid", "توزيعات مدفوعة"]},
    "share_repurchases": {"label": "Share Repurchases", "label_ar": "إعادة شراء أسهم", "format": FMT_CURRENCY, "category": "financing", "keywords": ["buyback", "repurchase", "إعادة شراء"]},
    "share_issuances": {"label": "Share Issuances", "label_ar": "إصدار أسهم", "format": FMT_CURRENCY, "category": "financing", "keywords": ["issuance", "new shares", "إصدار أسهم"]},
    "total_debt_issued": {"label": "Debt Issued", "label_ar": "ديون مُصدرة", "format": FMT_CURRENCY, "category": "financing", "keywords": ["debt issued", "borrowing", "اقتراض"]},
    "total_debt_repaid": {"label": "Debt Repaid", "label_ar": "ديون مسددة", "format": FMT_CURRENCY, "category": "financing", "keywords": ["debt repaid", "repayment", "سداد"]},
    "net_debt_issued": {"label": "Net Debt Issued", "label_ar": "صافي الديون المُصدرة", "format": FMT_CURRENCY, "category": "financing", "keywords": ["net debt issued"]},
    "other_financing_activities": {"label": "Other Financing Activities", "label_ar": "أنشطة تمويلية أخرى", "format": FMT_CURRENCY, "category": "financing", "keywords": ["other financing"]},
    "cash_from_financing": {"label": "Cash from Financing", "label_ar": "التدفقات النقدية من التمويل", "format": FMT_CURRENCY, "category": "financing", "keywords": ["financing cash flow", "cash from financing", "تدفقات تمويل"]},
    # === Summary ===
    "fx_effect": {"label": "FX Effect on Cash", "label_ar": "أثر العملة على النقد", "format": FMT_CURRENCY, "category": "summary", "keywords": ["fx effect", "currency effect"]},
    "net_change_cash": {"label": "Net Change in Cash", "label_ar": "صافي التغير في النقد", "format": FMT_CURRENCY, "category": "summary", "keywords": ["net change cash"]},
    "beginning_cash": {"label": "Beginning Cash", "label_ar": "النقد في بداية الفترة", "format": FMT_CURRENCY, "category": "summary", "keywords": ["beginning cash"]},
    "ending_cash": {"label": "Ending Cash", "label_ar": "النقد في نهاية الفترة", "format": FMT_CURRENCY, "category": "summary", "keywords": ["ending cash"]},
    "free_cashflow": {"label": "Free Cash Flow", "label_ar": "التدفق النقدي الحر", "format": FMT_CURRENCY, "category": "summary", "keywords": ["free cash flow", "fcf"]},
    "fcf_growth": {"label": "FCF Growth", "label_ar": "نمو التدفق النقدي الحر", "format": FMT_PERCENT, "category": "summary", "keywords": ["fcf growth"]},
    "fcf_margin": {"label": "FCF Margin", "label_ar": "هامش التدفق النقدي الحر", "format": FMT_PERCENT, "category": "summary", "keywords": ["fcf margin"]},
    "fcf_per_share": {"label": "FCF/Share", "label_ar": "التدفق النقدي الحر للسهم", "format": FMT_PER_SHARE, "category": "summary", "keywords": ["fcf per share"]},
    "levered_fcf": {"label": "Levered FCF", "label_ar": "التدفق النقدي الحر المرفوع", "format": FMT_CURRENCY, "category": "summary", "keywords": ["levered fcf"]},
    "unlevered_fcf": {"label": "Unlevered FCF", "label_ar": "التدفق النقدي الحر غير المرفوع", "format": FMT_CURRENCY, "category": "summary", "keywords": ["unlevered fcf"]},
    "cash_income_tax_paid": {"label": "Cash Taxes Paid", "label_ar": "ضرائب مدفوعة نقداً", "format": FMT_CURRENCY, "category": "operating", "keywords": ["cash tax", "ضرائب مدفوعة"]},
    "cash_interest_paid": {"label": "Cash Interest Paid", "label_ar": "فوائد مدفوعة نقداً", "format": FMT_CURRENCY, "category": "operating", "keywords": ["cash interest", "فوائد مدفوعة"]},
}

# ============================================================================
# ALL REGISTRIES COMBINED (for universal handler)
# ============================================================================
ALL_REGISTRIES = {
    "income_statements": INCOME_COLUMNS,
    "balance_sheets": BALANCE_COLUMNS,
    "cashflow_statements": CASHFLOW_COLUMNS,
}

def find_columns_by_keyword(keyword: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search all registries for columns matching a keyword."""
    keyword_lower = keyword.lower()
    results = []
    for table, registry in ALL_REGISTRIES.items():
        for col_name, meta in registry.items():
            # Check label or keywords
            if keyword_lower in meta["label"].lower() or any(keyword_lower in kw for kw in meta.get("keywords", [])):
                results.append({
                    "table": table,
                    "column": col_name,
                    "label": meta["label"],
                    "label_ar": meta.get("label_ar", ""),
                    "format": meta["format"],
                    "category": meta["category"],
                })
                if len(results) >= limit:
                    return results
    return results


def format_value(value: Any, fmt: str, currency: str = "EGP") -> str:
    """Format a value according to its format type."""
    if value is None:
        return "N/A"
    try:
        val = float(value)
    except (ValueError, TypeError):
        return str(value)
    
    if fmt == FMT_CURRENCY:
        abs_val = abs(val)
        sign = "-" if val < 0 else ""
        if abs_val >= 1e9:
            return f"{sign}{currency} {abs_val/1e9:.2f}B"
        elif abs_val >= 1e6:
            return f"{sign}{currency} {abs_val/1e6:.2f}M"
        elif abs_val >= 1e3:
            return f"{sign}{currency} {abs_val/1e3:.1f}K"
        else:
            return f"{sign}{currency} {abs_val:.2f}"
    elif fmt == FMT_PERCENT:
        # If already as decimal (0.1285), multiply by 100
        if -1 < val < 1 and val != 0:
            return f"{val * 100:.2f}%"
        return f"{val:.2f}%"
    elif fmt == FMT_RATIO:
        return f"{val:.2f}x"
    elif fmt == FMT_PER_SHARE:
        return f"{currency} {val:.2f}"
    elif fmt == FMT_SCORE:
        return f"{int(val)}"
    else:
        if abs(val) >= 1e9:
            return f"{val/1e9:.2f}B"
        elif abs(val) >= 1e6:
            return f"{val/1e6:.2f}M"
        else:
            return f"{val:,.0f}"


def get_category_columns(table: str, category: str) -> List[str]:
    """Get all column names for a given category in a table."""
    registry = ALL_REGISTRIES.get(table, {})
    return [col for col, meta in registry.items() if meta["category"] == category]
