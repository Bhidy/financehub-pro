"""
EXTENDED FINANCIAL RATIOS EXTRACTOR
Target: All 453 Saudi stocks
Data: P/E, P/B, ROE, ROA, Debt/Equity, Margins, Growth Rates
Method: tls_client + Regex (SSR data)
"""

import asyncio
import asyncpg
import logging
import re
import tls_client

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [RATIOS] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("ratios_extraction.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

DB_DSN = "postgresql://home@localhost/mubasher_db"
session = tls_client.Session(client_identifier="chrome_120")

# Arabic -> DB Field Mapping
RATIO_MAP = {
    "مكرر الربحية": "pe_ratio",
    "مضاعف القيمة الدفترية": "pb_ratio",
    "مكرر المبيعات": "ps_ratio",
    "العائد على حقوق المساهمين": "roe",
    "العائد على الموجودات": "roa",
    "العائد على الاستثمار": "roic",
    "هامش الربح الإجمالي": "gross_margin",
    "هامش الربح التشغيلي": "operating_margin",
    "هامش صافي الربح": "net_margin",
    "نسبة التداول": "current_ratio",
    "نسبة السيولة السريعة": "quick_ratio",
    "الدين إلى حقوق المساهمين": "debt_to_equity",
    "الدين إلى الموجودات": "debt_to_assets",
    "نسبة تغطية الفوائد": "interest_coverage",
    "القيمة الدفترية للسهم": "book_value_per_share",
    "ربحية السهم": "eps",
    "توزيعات السهم": "dividend_per_share",
    "نمو الإيرادات": "revenue_growth_yoy",
    "نمو الأرباح": "earnings_growth_yoy",
}

async def get_all_symbols():
    conn = await asyncpg.connect(DB_DSN)
    rows = await conn.fetch("SELECT symbol FROM market_tickers ORDER BY symbol")
    await conn.close()
    return [r['symbol'] for r in rows]

def extract_ratios(html, symbol):
    """Extract financial ratios from HTML"""
    records = []
    
    try:
        # Look for midata.ratios or similar patterns
        match = re.search(r"midata\.(?:ratios|financialRatios)\s*=\s*(\{.*?\});", html, re.DOTALL)
        
        if match:
            import ast
            json_str = match.group(1)
            json_str = json_str.replace('null', 'None').replace('true', 'True').replace('false', 'False')
            data = ast.literal_eval(json_str)
            
            # Parse years
            for year_data in data.get('years', data.get('periods', [])):
                year = year_data.get('year', year_data.get('fiscal_year'))
                if not year:
                    continue
                
                record = {
                    'symbol': symbol,
                    'fiscal_year': int(year),
                    'period_type': 'FY'
                }
                
                # Map metrics
                for metric in year_data.get('metrics', year_data.get('ratios', [])):
                    label = metric.get('label', '')
                    value = metric.get('value')
                    
                    if label in RATIO_MAP and value is not None:
                        record[RATIO_MAP[label]] = float(value)
                
                records.append(record)
        else:
            # Fallback: Parse table data
            # Look for ratio tables in HTML
            table_pattern = r'<tr[^>]*>.*?<td[^>]*>([^<]+)</td>.*?<td[^>]*>([^<]+)</td>'
            matches = re.findall(table_pattern, html, re.DOTALL)
            
            if matches:
                record = {'symbol': symbol, 'fiscal_year': 2024, 'period_type': 'FY'}
                for label, value in matches:
                    label = label.strip()
                    if label in RATIO_MAP:
                        try:
                            record[RATIO_MAP[label]] = float(re.sub(r'[^\d.-]', '', value))
                        except:
                            pass
                if len(record) > 3:
                    records.append(record)
                    
    except Exception as e:
        logger.debug(f"Parse error for {symbol}: {e}")
    
    return records

async def save_records(conn, records):
    saved = 0
    for rec in records:
        try:
            # Build dynamic insert
            cols = ['symbol', 'fiscal_year', 'period_type']
            vals = [rec['symbol'], rec['fiscal_year'], rec.get('period_type', 'FY')]
            placeholders = ['$1', '$2', '$3']
            idx = 4
            
            for key, val in rec.items():
                if key not in ['symbol', 'fiscal_year', 'period_type'] and val is not None:
                    cols.append(key)
                    vals.append(val)
                    placeholders.append(f'${idx}')
                    idx += 1
            
            if len(cols) > 3:
                await conn.execute(f"""
                    INSERT INTO financial_ratios_extended ({', '.join(cols)})
                    VALUES ({', '.join(placeholders)})
                    ON CONFLICT (symbol, fiscal_year, period_type) 
                    DO UPDATE SET {', '.join(f'{c} = EXCLUDED.{c}' for c in cols[3:])}
                """, *vals)
                saved += 1
        except Exception as e:
            logger.debug(f"DB Error: {e}")
    return saved

async def main():
    symbols = await get_all_symbols()
    logger.info(f"🎯 Extracting ratios for {len(symbols)} stocks")
    
    conn = await asyncpg.connect(DB_DSN)
    total_saved = 0
    
    for idx, symbol in enumerate(symbols, 1):
        url = f"https://www.mubasher.info/markets/TDWL/stocks/{symbol}/ratios"
        
        try:
            resp = session.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Referer": "https://www.google.com/"
            })
            
            if resp.status_code == 200:
                records = extract_ratios(resp.text, symbol)
                if records:
                    saved = await save_records(conn, records)
                    total_saved += saved
                    logger.info(f"✅ [{idx}/{len(symbols)}] {symbol}: Saved {saved} ratio records")
                else:
                    logger.info(f"⚠️ [{idx}/{len(symbols)}] {symbol}: No ratios found")
            else:
                logger.warning(f"⚠️ [{idx}/{len(symbols)}] {symbol}: HTTP {resp.status_code}")
                
        except Exception as e:
            logger.error(f"❌ {symbol}: {e}")
        
        await asyncio.sleep(0.3)
    
    await conn.close()
    logger.info(f"🎉 Complete! Total ratio records: {total_saved}")

if __name__ == "__main__":
    asyncio.run(main())
