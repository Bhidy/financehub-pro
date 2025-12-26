import asyncio
import os
import re
import json
import asyncpg
from datetime import datetime
import tls_client
import pandas as pd
from bs4 import BeautifulSoup
from io import StringIO
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database Config
DB_DSN = "postgresql://home@localhost/mubasher_db"

# TLS Session
session = tls_client.Session(client_identifier="chrome_120")

# Field Mapping (Arabic -> Database Column)
# This is critical for the "As-Reported" fidelity.
FIELD_MAP = {
    # Income Statement
    "إجمالي الدخل": "revenue",
    "الربح الإجمالي": "gross_profit",
    "ربح العمليات": "operating_income",
    "صافي الربح": "net_income",
    "ربحية السهم": "eps",
    
    # Balance Sheet
    "مجموع الموجودات": "total_assets",
    "مجموع المطلوبات": "total_liabilities",
    "إجمالي حقوق المساهمين": "total_equity",
    
    # Cash Flow
    "صافي النقد من الأنشطة التشغيلية": "cash_flow_operating",
}

async def get_db_connection():
    return await asyncpg.connect(DB_DSN)

def parse_json_blob(data, symbol):
    """
    Transforms the extracted JSON/Dict structure into DB records.
    Data format: {'periods': [{'label': 'Year', 'sections': [...]}]}
    """
    records = []
    
    # Iterate Period Groups (Annual, Quarterly if available)
    for period_group in data.get('periods', []):
        group_label = period_group.get('label', '')
        years = period_group.get('years', [])
        
        # Determine Period Type
        # "الربع الثالث" -> "Q3", "الميزانية السنوية" -> "FY"
        if "السنوية" in group_label or "Annual" in group_label:
            period_type = "FY"
        elif "الربع الاول" in group_label: period_type = "Q1"
        elif "الربع الثاني" in group_label: period_type = "Q2"
        elif "الربع الثالث" in group_label: period_type = "Q3"
        elif "الربع الرابع" in group_label: period_type = "Q4"
        else: period_type = "FY" # Default
        
        # Iterate Sections (Income, Balance, CashFlow)
        for section in period_group.get('sections', []):
            section_label = section.get('label', '') # e.g. "قائمة الدخل"
            
            for row in section.get('records', []):
                metric_label = row.get('label')
                values = row.get('values', {})
                
                # Iterate Years in this row
                for year, value in values.items():
                    if value is None: continue
                    
                    # Find or Create Record for this Symbol+Year+Period
                    # We need a way to aggregate rows into a single record per year.
                    # Since we are iterating rows, we might process the same (Symbol, Year) multiple times.
                    # Efficient way: build a dict of dicts: recs[year] = { ... }
                    pass 

    # Re-structure: Iterate Years first, then find all metrics for that year
    # But the structure is Section -> Row -> Values[Year]
    
    # Let's pivot: Map[Year] -> Dict[Metric -> Value]
    yearly_data = {}
    
    for period_group in data.get('periods', []):
        group_label = period_group.get('label', '')
        
        # Normalize Period Type
        p_type = "FY"
        if "الاول" in group_label: p_type = "Q1"
        elif "الثاني" in group_label: p_type = "Q2"
        elif "الثالث" in group_label: p_type = "Q3"
        elif "الرابع" in group_label: p_type = "Q4"
        
        for section in period_group.get('sections', []):
            for row in section.get('records', []):
                metric = row.get('label', '').strip()
                values = row.get('values', {})
                
                for year_str, val in values.items():
                    if val is None: continue
                    
                    # Key: (Symbol, Year, PeriodType)
                    key = (symbol, int(year_str), p_type)
                    if key not in yearly_data:
                        yearly_data[key] = {"raw_data": {}}
                    
                    # Map to DB Field
                    if metric in FIELD_MAP:
                        db_field = FIELD_MAP[metric]
                        yearly_data[key][db_field] = float(val)
                    
                    # Store Raw
                    yearly_data[key]["raw_data"][metric] = val

    # Convert to List
    for (sym, year, ptype), fields in yearly_data.items():
        rec = {
            "symbol": sym,
            "fiscal_year": year,
            "period_type": ptype,
            "end_date": None,
            **fields
        }
        records.append(rec)
        
    return records

async def save_financials(conn, records):
    for rec in records:
        try:
            # Construct dynamic Insert
            # We explicitly list cols for the MVP
            await conn.execute("""
                INSERT INTO financial_statements 
                (symbol, period_type, fiscal_year, revenue, gross_profit, net_income, 
                 total_assets, total_liabilities, total_equity, cash_flow_operating, 
                 end_date, raw_data)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (symbol, fiscal_year, period_type) 
                DO UPDATE SET 
                    revenue = EXCLUDED.revenue,
                    net_income = EXCLUDED.net_income,
                    raw_data = EXCLUDED.raw_data,
                    created_at = NOW()
            """, 
            rec['symbol'], rec['period_type'], rec['fiscal_year'],
            rec.get('revenue'), rec.get('gross_profit'), rec.get('net_income'),
            rec.get('total_assets'), rec.get('total_liabilities'), rec.get('total_equity'),
            rec.get('cash_flow_operating'),
            datetime(rec['fiscal_year'], 12, 31).date(), # Default to Year End if date missing
            json.dumps(rec['raw_data'])
            )
            logger.info(f"Saved {rec['period_type']} {rec['fiscal_year']} for {rec['symbol']}")
        except Exception as e:
            logger.error(f"Save error: {e}")

async def run_extraction(symbols):
    conn = await get_db_connection()
    
    for symbol in symbols:
        logger.info(f"Extracting Financials for {symbol}...")
        url = f"https://www.mubasher.info/markets/TDWL/stocks/{symbol}/financial-statements"
        
        try:
            resp = session.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://www.google.com/"
            })
            
            if resp.status_code == 200:
                # Regex to find: midata.financialStatement = { ... };
                match = re.search(r"midata\.financialStatement\s*=\s*(.*?);", resp.text, re.DOTALL)
                
                if match:
                    json_str = match.group(1)
                    
                    # Fix JS literals for Python AST
                    json_str_fixed = json_str.replace('null', 'None').replace('true', 'True').replace('false', 'False')
                    
                    try:
                        import ast
                        data = ast.literal_eval(json_str_fixed)
                        
                        recs = parse_json_blob(data, symbol)
                        if recs:
                            await save_financials(conn, recs)
                            logger.info(f"Extracted {len(recs)} periods for {symbol}")
                        else:
                            logger.warning(f"No records extracted from blob for {symbol}")
                            
                    except Exception as e:
                        logger.error(f"JSON/AST parse failed: {e}")
                else:
                    logger.warning(f"No midata.financialStatement found for {symbol}")
            else:
                logger.error(f"HTTP {resp.status_code}")

        except Exception as e:
            logger.error(f"Extraction failed for {symbol}: {e}")
            
    await conn.close()

if __name__ == "__main__":
    # Test with major stocks
    TEST_SYMBOLS = ["2222", "1120", "1150"]
    asyncio.run(run_extraction(TEST_SYMBOLS))
