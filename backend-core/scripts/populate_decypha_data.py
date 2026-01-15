
import os
import json
import psycopg2
import difflib
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

def connect_db():
    return psycopg2.connect(DB_URL)

def load_symbols():
    with open('decypha_funds_list.json', 'r') as f:
        data = json.load(f)
    # Return list of dicts for fuzzy matching
    return data

def get_columns(cur, table_name):
    cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}'")
    return [row[0] for row in cur.fetchall()]

def parse_html_and_insert():
    print("🔌 Connecting to database...")
    conn = connect_db()
    cur = conn.cursor()

    # Check columns
    columns = get_columns(cur, 'mutual_funds')
    print(f"📋 Columns in mutual_funds: {columns}")
    
    # Determine correct name column
    name_col = 'name_en' if 'name_en' in columns else 'name'
    print(f"✅ Using name column: {name_col}")

    print("🗑️  Cleaning up old data (Truncating mutual_funds)...")
    cur.execute("TRUNCATE TABLE mutual_funds CASCADE;")
    conn.commit() # Commit the truncate immediately
    
    funds_data = load_symbols() # List of {name, symbol, url}
    # Create a map for exact lookup
    symbol_map_exact = {f['name'].strip().lower(): f['symbol'] for f in funds_data}
    fund_names = list(symbol_map_exact.keys())
    
    print("📂 Parsing FundDetails.xls (HTML)...")
    with open('FundDetails.xls', 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    # Find the table
    table = soup.find('table')
    if not table:
        print("❌ No table found in HTML!")
        return

    rows = table.find_all('tr')
    headers = [th.get_text(strip=True) for th in rows[0].find_all('th')]
    print(f"📊 Found headers: {headers}")

    inserted_count = 0
    skipped_count = 0

    # Start from index 1 if headers exist
    start_index = 1 if headers else 0
    
    for tr in rows[start_index:]:
        cols = tr.find_all('td')
        if not cols:
            continue
            
        # Parse columns (safely)
        vals = [td.get_text(strip=True) for td in cols]
        fund_name_raw = vals[0]
        fund_name_clean = fund_name_raw.strip().lower()

        # 1. Exact Match
        symbol = symbol_map_exact.get(fund_name_clean)
        
        # 2. Fuzzy Match if not found
        if not symbol:
            matches = difflib.get_close_matches(fund_name_clean, fund_names, n=1, cutoff=0.6)
            if matches:
                best_match = matches[0]
                symbol = symbol_map_exact[best_match]
                print(f"⚠️  Fuzzy matched: '{fund_name_raw}' -> '{best_match}' ({symbol})")
            else:
                 print(f"❌ Could not match symbol for: {fund_name_raw}")
                 skipped_count += 1
                 continue

        # Currency
        currency = 'USD' if 'USD' in fund_name_raw or 'Dollar' in fund_name_raw else 'EGP'
        
        # Parse numeric helper
        def parse_decimal(s):
            if not s or s == '-' or s.lower() == 'null':
                return None
            try:
                # Remove commas, %
                clean = s.replace(',', '').replace('%', '').strip()
                return float(clean)
            except:
                return None

        # Headers mapping indices (0-based from vals)
        # 0: Name
        # 1: 3M
        # 2: 1Y
        # 3: YTD
        # 4: Domicile (skip, usually Egypt)
        # 5: Type
        # 6: Manager
        # 7: Issuer
        # 8: AUM (M USD/EGP?) - header says AUM (M USD) but for EGP funds it might be M EGP. assuming Millions.
        # 9: Admin Fee
        # 10: Mgmt Fee
        # 11: Custodian
        # 12: Perf Fee
        # 13: Redempt Fee
        # 14: Sub Fee
        # 15: Subseq Sub
        # 16: Min Sub
        
        return_3m = parse_decimal(vals[1]) if len(vals) > 1 else None
        return_1y = parse_decimal(vals[2]) if len(vals) > 2 else None
        return_ytd = parse_decimal(vals[3]) if len(vals) > 3 else None
        
        issuer = vals[7] if len(vals) > 7 else None
        
        aum_raw = parse_decimal(vals[8]) if len(vals) > 8 else None
        aum = aum_raw * 1_000_000 if aum_raw is not None else None
        
        fee_management = parse_decimal(vals[10]) if len(vals) > 10 else None
        fee_redemption = parse_decimal(vals[13]) if len(vals) > 13 else None
        fee_subscription = parse_decimal(vals[14]) if len(vals) > 14 else None
        min_subscription = parse_decimal(vals[16]) if len(vals) > 16 else None

        fund_manager = vals[6] if len(vals) > 6 else None
        fund_type = vals[5] if len(vals) > 5 else None

        # Prepare Insert
        insert_cols = [
            'fund_id', 'symbol', 'fund_name', 'fund_name_en', 
            'manager_name', 'fund_type', 'currency', 'market_code',
            'return_3m', 'return_1y', 'return_ytd', 
            'aum', 'issuer', 
            'fee_management', 'fee_redemption', 'fee_subscription', 'min_subscription'
        ]
        placeholders = ['%s'] * len(insert_cols)
        values = [
            symbol, symbol, fund_name_raw, fund_name_raw, 
            fund_manager, fund_type, currency, 'EGX',
            return_3m, return_1y, return_ytd,
            aum, issuer,
            fee_management, fee_redemption, fee_subscription, min_subscription
        ]
        
        query = f"INSERT INTO mutual_funds ({', '.join(insert_cols)}) VALUES ({', '.join(placeholders)})"

        try:
            cur.execute(query, tuple(values))
            conn.commit() # Commit this row
            inserted_count += 1
        except Exception as e:
            # Check for duplicate key (likely just redundant data in scraping)
            conn.rollback() # Rollback this failed insert only
            if "duplicate key" in str(e):
                print(f"⚠️  Skipping duplicate: {fund_name_raw}")
            else:
                print(f"❌ Error inserting {fund_name_raw}: {e}")
            continue

    cur.close()
    conn.close()
    print(f"✅ Migration Complete. Inserted: {inserted_count}, Skipped: {skipped_count}")

if __name__ == "__main__":
    parse_html_and_insert()
