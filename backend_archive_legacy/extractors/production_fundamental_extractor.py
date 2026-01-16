"""
PRODUCTION FUNDAMENTAL EXTRACTOR
Target: All 453 Saudi stocks
Extracts: Financial Statements, Balance Sheet, Cash Flow
Method: tls_client + Regex (proven method from mutual funds)
"""

import asyncio
import os
import re
import json
import asyncpg
from datetime import datetime
import tls_client
import logging

logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - [FUNDAMENTALS] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("fundamental_extraction.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

DB_DSN = "postgresql://home@localhost/mubasher_db"

# TLS Session (Cloudflare bypass)
session = tls_client.Session(client_identifier="chrome_120")

# Arabic -> DB Field Mapping
FIELD_MAP = {
    "إجمالي الدخل": "revenue",
    "الإيرادات": "revenue",
    "الربح الإجمالي": "gross_profit",
    "ربح العمليات": "operating_income",
    "صافي الربح": "net_income",
    "ربحية السهم": "eps",
    "مجموع الموجودات": "total_assets",
    "مجموع المطلوبات": "total_liabilities",
    "إجمالي حقوق المساهمين": "total_equity",
    "صافي النقد من الأنشطة التشغيلية": "cash_flow_operating",
    "إجمالي الأرباح": "gross_profit",
}

async def get_all_symbols():
    """Get all stock symbols from database"""
    conn = await asyncpg.connect(DB_DSN)
    rows = await conn.fetch("SELECT symbol FROM market_tickers ORDER BY symbol")
    await conn.close()
    return [r['symbol'] for r in rows]

def parse_financial_data(data, symbol):
    """Parse the embedded JS financial data into DB records"""
    yearly_data = {}
    
    for period_group in data.get('periods', []):
        group_label = period_group.get('label', '')
        
        # Determine period type
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
                    
                    try:
                        key = (symbol, int(year_str), p_type)
                        if key not in yearly_data:
                            yearly_data[key] = {"raw_data": {}}
                        
                        if metric in FIELD_MAP:
                            db_field = FIELD_MAP[metric]
                            yearly_data[key][db_field] = float(val)
                        
                        yearly_data[key]["raw_data"][metric] = val
                    except:
                        pass

    records = []
    for (sym, year, ptype), fields in yearly_data.items():
        rec = {
            "symbol": sym,
            "fiscal_year": year,
            "period_type": ptype,
            **fields
        }
        records.append(rec)
        
    return records

async def save_financials(conn, records):
    """Save financial records to database"""
    saved = 0
    for rec in records:
        try:
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
                    total_assets = EXCLUDED.total_assets,
                    total_liabilities = EXCLUDED.total_liabilities,
                    total_equity = EXCLUDED.total_equity,
                    raw_data = EXCLUDED.raw_data,
                    created_at = NOW()
            """, 
            rec['symbol'], rec['period_type'], rec['fiscal_year'],
            rec.get('revenue'), rec.get('gross_profit'), rec.get('net_income'),
            rec.get('total_assets'), rec.get('total_liabilities'), rec.get('total_equity'),
            rec.get('cash_flow_operating'),
            datetime(rec['fiscal_year'], 12, 31).date(),
            json.dumps(rec.get('raw_data', {}))
            )
            saved += 1
        except Exception as e:
            logger.error(f"DB Error: {e}")
    return saved

async def extract_fundamentals(symbol):
    """Extract financial statements for one stock"""
    url = f"https://www.mubasher.info/markets/TDWL/stocks/{symbol}/financial-statements"
    
    try:
        resp = session.get(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Referer": "https://www.google.com/"
        })
        
        if resp.status_code == 200:
            # Extract embedded JS data
            match = re.search(r"midata\.financialStatement\s*=\s*(.*?);", resp.text, re.DOTALL)
            
            if match:
                json_str = match.group(1)
                json_str_fixed = json_str.replace('null', 'None').replace('true', 'True').replace('false', 'False')
                
                import ast
                data = ast.literal_eval(json_str_fixed)
                return parse_financial_data(data, symbol)
        else:
            logger.warning(f"{symbol}: HTTP {resp.status_code}")
            
    except Exception as e:
        logger.error(f"{symbol}: {e}")
    
    return []

async def main():
    # Get all symbols
    symbols = await get_all_symbols()
    logger.info(f"🎯 Extracting fundamentals for {len(symbols)} stocks")
    
    conn = await asyncpg.connect(DB_DSN)
    
    total_records = 0
    for idx, symbol in enumerate(symbols, 1):
        records = await extract_fundamentals(symbol)
        if records:
            saved = await save_financials(conn, records)
            total_records += saved
            logger.info(f"✅ [{idx}/{len(symbols)}] {symbol}: {saved} periods saved")
        else:
            logger.warning(f"⚠️ [{idx}/{len(symbols)}] {symbol}: No data found")
        
        # Rate limiting
        await asyncio.sleep(0.5)
    
    await conn.close()
    logger.info(f"🎉 Complete! Total financial records: {total_records}")

if __name__ == "__main__":
    asyncio.run(main())
