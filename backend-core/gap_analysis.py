
import asyncio
import csv
import os
import sys
from typing import Dict, Any, List
import asyncpg
from decimal import Decimal

# Add parent directory to path to allow imports
sys.path.append(os.getcwd())

try:
    from data_pipeline.stockanalysis_ingester import StockAnalysisScraper
except ImportError:
    # Fallback if running from a different directory
    sys.path.append(os.path.join(os.getcwd(), 'backend-core'))
    from data_pipeline.stockanalysis_ingester import StockAnalysisScraper

async def run_analysis():
    print("--- Starting Deep Gap Analysis for COMI ---")
    
    # 1. Load Mappings
    scraper_cls = StockAnalysisScraper
    mappings = {
        "Income Statement": scraper_cls.INCOME_MAPPING,
        "Balance Sheet": scraper_cls.BALANCE_MAPPING,
        "Cash Flow Statement": scraper_cls.CASHFLOW_MAPPING,
        "Ratios": scraper_cls.RATIOS_MAPPING
    }
    
    combined_mapping = {}
    for m in mappings.values():
        combined_mapping.update(m)
        
    # 2. Analyze CSV File
    csv_path = "../COMI_Financial_Statements (2).csv"
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return

    csv_keys = set()
    csv_data_2024 = {}
    
    print(f"\nScanning CSV file: {csv_path}")
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header_years = []
        current_section = "Unknown"
        
        for row in reader:
            if not row: continue
            
            # Identify headers
            if "FY 2020" in row:
                header_years = row
                continue
                
            label = row[0].strip()
            if not label: continue
            
            # Simple section detection
            if "INCOME STATEMENT" in label: current_section = "Income Statement"
            if "BALANCE SHEET" in label: current_section = "Balance Sheet"
            if "CASH FLOW STATEMENT" in label: current_section = "Cash Flow Statement"
            
            # Skip obvious headers/separators
            if "════" in label or label.upper() == label:
                # But keep section headers if they are useful? No, usually line items are Mixed Case or indented
                pass

            # Store the key
            csv_keys.add(label)
            
            # Helper to get 2024 value
            # Find index of FY 2024 in header
            try:
                idx_2024 = header_years.index("FY 2024")
                if idx_2024 < len(row):
                    val = row[idx_2024]
                    csv_data_2024[label] = val
            except ValueError:
                pass

    # 3. Check for Missing Fields (Gap Analysis 1: Plan vs CSV)
    print("\n--- Field Coverage Analysis (CSV vs Scraper Mapping) ---")
    missing_fields = []
    mapped_fields = []
    
    # Invert mappings for lookup (DB Col -> CSV Label is not unique, so use CSV Label -> DB Col)
    # The MAPPING dicts are CSV Label -> DB Column
    
    all_mapped_labels = set()
    for category, mapping in mappings.items():
        all_mapped_labels.update(mapping.keys())
        
    for label in csv_keys:
        # Clean label (remove leading spaces)
        clean_label = label.strip()
        if clean_label in all_mapped_labels:
            mapped_fields.append(clean_label)
        else:
            # Filter out titles/headers
            if len(clean_label) > 3 and not clean_label.startswith("FY ") and "Source" not in clean_label:
                missing_fields.append(clean_label)

    print(f"Total Line Items in CSV: {len(csv_keys)}")
    print(f"Mapped Items (Collected): {len(mapped_fields)}")
    print(f"Unmapped Items (Potential Gaps): {len(missing_fields)}")
    
    # 4. Check Database Content
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set, cannot verify DB content.")
        return

    print(f"\nConnecting to DB: {db_url.split('@')[-1]}") # Hide credentials
    
    try:
        conn = await asyncpg.connect(db_url, statement_cache_size=0)
        
        # Get counts
        counts = {}
        tables = ["income_statements", "balance_sheets", "cashflow_statements", "financial_ratios_history"]
        
        print("\n--- Database Statistics (Global) ---")
        total_items = 0
        for t in tables:
            c = await conn.fetchval(f"SELECT COUNT(*) FROM {t}")
            counts[t] = c
            total_items += c
            print(f"Table '{t}': {c} rows")
            
        print(f"Total Rows in Financial Tables: {total_items}")
        
        # Get EGX counts
        print("\n--- Database Statistics (EGX Only) ---")
        egx_query = """
        SELECT COUNT(t.*) 
        FROM {table} t
        JOIN market_tickers m ON t.symbol = m.symbol
        WHERE m.market_code = 'EGX'
        """
        for t in tables:
            try:
                c = await conn.fetchval(egx_query.format(table=t))
                print(f"Table '{t}' (EGX): {c} rows")
            except Exception as e:
                print(f"Error counting EGX for {t}: {e}")

        # Get Table Schema Information
        print("\n--- Table Schema Information ---")
        for t in tables:
            try:
                cols_info = await conn.fetch("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                """, t)
                print(f"Table '{t}': {len(cols_info)} columns")
                # print([c['column_name'] for c in cols_info]) # Uncomment for full list
            except Exception as e:
                print(f"Error getting schema for {t}: {e}")

        # 5. COMI Specific Data Check
        print("\n--- COMI Data Verification (FY 2024) ---")
        
        # Income
        income_row = await conn.fetchrow(
            "SELECT * FROM income_statements WHERE symbol = 'COMI' AND fiscal_year = 2024"
        )
        # Balance
        balance_row = await conn.fetchrow(
            "SELECT * FROM balance_sheets WHERE symbol = 'COMI' AND fiscal_year = 2024"
        )
        # Cashflow
        cashflow_row = await conn.fetchrow(
            "SELECT * FROM cashflow_statements WHERE symbol = 'COMI' AND fiscal_year = 2024"
        )
        
        # Compare a few key fields
        comparison = []
        
        def compare_field(section, csv_label, db_col, row):
            csv_val = csv_data_2024.get(csv_label, "N/A")
            db_val = row[db_col] if row and db_col in row else "MISSING"
            
            # Normalize for matching
            match = False
            try:
                if csv_val != "N/A" and db_val != "MISSING" and db_val is not None:
                    # Clean CSV
                    c_clean = float(csv_val.replace(',', '').replace('(', '-').replace(')', ''))
                    # DB is usually numeric or decimal
                    d_clean = float(db_val)
                    
                    if abs(c_clean - d_clean) < 1.0: # Tolerance
                        match = True
            except:
                pass
                
            status = "MATCH" if match else "MISMATCH"
            if db_val == "MISSING" or db_val is None: status = "MISSING IN DB"
            if csv_val == "N/A": status = "MISSING IN CSV"
            
            return {
                "Section": section,
                "Field": csv_label,
                "DB_Column": db_col,
                "CSV_Value": csv_val,
                "DB_Value": db_val,
                "Status": status
            }

        # Select sample fields to check deeply
        sample_checks = [
            ("Income", "Revenue", "revenue", income_row),
            ("Income", "Net Income", "net_income", income_row),
            ("Income", "Net Interest Income", "net_interest_income", income_row),
            ("Balance", "Total Assets", "total_assets", balance_row),
            ("Balance", "Total Liabilities", "total_liabilities", balance_row),
            ("Balance", "Cash & Equivalents", "cash_equivalents", balance_row),
            ("CashFlow", "Operating Cash Flow", "cash_from_operating", cashflow_row),
            ("CashFlow", "Free Cash Flow", "free_cashflow", cashflow_row),
        ]
        
        print(f"{'Field':<30} | {'CSV Value':<15} | {'DB Value':<15} | {'Status'}")
        print("-" * 75)
        
        for section, label, col, row_data in sample_checks:
            res = compare_field(section, label, col, row_data)
            print(f"{label[:30]:<30} | {str(res['CSV_Value'])[:15]:<15} | {str(res['DB_Value'])[:15]:<15} | {res['Status']}")

        # 6. Detailed Gap Report Generation
        print("\n--- Unmapped Important Fields (Gaps) ---")
        # Heuristic: Show unmapped fields that look like real data
        for f in missing_fields[:10]: # Show top 10
            print(f"Missing Mapping for: {f}")
            
        print(f"\n... and {len(missing_fields) - 10} more." if len(missing_fields) > 10 else "")

        await conn.close()
        
    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    asyncio.run(run_analysis())
