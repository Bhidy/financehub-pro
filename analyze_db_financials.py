
import os
import psycopg2
from urllib.parse import urlparse

# DATABASE_URL from .env
# postgres://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require
DB_URL = "postgres://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

def get_db_info():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()

        tables_to_check = [
            'public.financial_statements', 
            'public.income_statements', 
            'public.balance_sheets', 
            'public.cashflow_statements'
        ]

        for table in tables_to_check:
            print(f"\n\n=== SCHEMA FOR {table} ===")
            schema, name = table.split('.')
            cur.execute(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = '{schema}' AND table_name = '{name}'
                ORDER BY ordinal_position;
            """)
            columns = cur.fetchall()
            col_names = [c[0] for c in columns]
            print(f"Total Columns: {len(columns)}")
            print(f"Columns: {col_names}")

            print(f"=== COMI DATA COUNT FOR {table} ===")
            # Check if symbol or ticker column exists
            ticker_col = 'symbol' if 'symbol' in col_names else 'ticker'
            if ticker_col in col_names:
                cur.execute(f"SELECT COUNT(*) FROM {table} WHERE {ticker_col} = 'COMI'")
                count = cur.fetchone()[0]
                print(f"Total Rows for COMI: {count}")
                
                # Show sample rows if data exists
                if count > 0:
                    # Try to find date column
                    date_col = 'end_date' if 'end_date' in col_names else 'date'
                    period_col = 'period' if 'period' in col_names else 'fiscal_quarter'
                    year_col = 'year' if 'year' in col_names else 'fiscal_year'
                    
                    # select distinct periods/years
                    cols_to_select = [ticker_col]
                    if date_col in col_names: cols_to_select.append(date_col)
                    if year_col in col_names: cols_to_select.append(year_col)
                    if period_col in col_names: cols_to_select.append(period_col)
                    
                    query = f"SELECT {', '.join(cols_to_select)} FROM {table} WHERE {ticker_col} = 'COMI' ORDER BY {cols_to_select[1] if len(cols_to_select)>1 else ticker_col} DESC LIMIT 5"
                    try:
                        cur.execute(query)
                        print("Sample Rows (Identities):")
                        for r in cur.fetchall():
                            print(r)
                    except Exception as e:
                        print(f"Could not fetch samples: {e}")

            else:
                print(f"No symbol/ticker column found in {table}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    get_db_info()
