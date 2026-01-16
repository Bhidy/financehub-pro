import asyncio
import asyncpg
import tls_client
import logging
from datetime import datetime
import re

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

DB_DSN = "postgresql://home@localhost/mubasher_db"

AR_MONTHS = {
    "يناير": 1, "فبراير": 2, "مارس": 3, "أبريل": 4, "مايو": 5, "يونيو": 6,
    "يوليو": 7, "أغسطس": 8, "سبتمبر": 9, "أكتوبر": 10, "نوفمبر": 11, "ديسمبر": 12
}

def parse_ar_date(d_str):
    # Example: "20 مارس 2024" or "20 مارس 2024 10:00"
    try:
        if not d_str: return None
        parts = d_str.split()
        if len(parts) >= 3:
            day = int(parts[0])
            month_ar = parts[1]
            year = int(parts[2])
            month = AR_MONTHS.get(month_ar, 1)
            return datetime(year, month, day).date()
    except Exception as e:
        logger.warning(f"Date parse error '{d_str}': {e}")
    return None

def extract_symbol(url):
    # /markets/TDWL/stocks/1301.B -> 1301
    match = re.search(r'stocks/(\d+)', url)
    return match.group(1) if match else "UNKNOWN"

async def save_insider(conn, row):
    # {"name":"أسلاك","url":"...","trader":"...","type":"شراء","volume":600,"price":0.0,"updatedAt":"..."}
    symbol = extract_symbol(row.get('url', ''))
    trader = row.get('trader')
    action = row.get('type') # "شراء" or "بيع"
    shares = int(row.get('volume', 0))
    price = float(row.get('price', 0))
    date_val = parse_ar_date(row.get('updatedAt'))
    
    # Map type to EN
    trans_type = "BUY" if "شراء" in action else "SELL" if "بيع" in action else "OTHER"
    
    # Insert
    # Check duplicate? (symbol, date, trader, volume)
    # Just insert for now
    await conn.execute("""
        INSERT INTO insider_trading (symbol, insider_name, transaction_type, shares, price_per_share, transaction_date)
        VALUES ($1, $2, $3, $4, $5, $6)
    """, symbol, trader, trans_type, shares, price, date_val)

async def save_corporate_action(conn, row):
    # {"name":"الغاز","url":"...","type":"...","announcedAt":"..."}
    symbol = extract_symbol(row.get('url', ''))
    atype = row.get('type')
    desc = row.get('description') or row.get('title')
    ann_date = parse_ar_date(row.get('announcedAt'))
    ex_date = parse_ar_date(row.get('effectiveFrom'))
    
    await conn.execute("""
        INSERT INTO corporate_actions (symbol, action_type, description, announcement_date, ex_date)
        VALUES ($1, $2, $3, $4, $5)
    """, symbol, atype, desc, ann_date, ex_date)

async def run_extraction():
    conn = await asyncpg.connect(DB_DSN)
    session = tls_client.Session(client_identifier="chrome_120")
    
    # 1. Insider Trades
    logger.info("Extracting Insider Trades...")
    try:
        # Clear fake data?
        await conn.execute("TRUNCATE TABLE insider_trading RESTART IDENTITY CASCADE")
        
        # Paginate? Assuming 1 page for now based on probe
        url = "https://www.mubasher.info/api/1/insider-trades?start=0&size=1000"
        resp = session.get(url).json()
        rows = resp.get('rows', [])
        logger.info(f"Found {len(rows)} insider trades.")
        for r in rows:
            await save_insider(conn, r)
            
    except Exception as e:
        logger.error(f"Insider Error: {e}")

    # 2. Corporate Actions
    logger.info("Extracting Corporate Actions...")
    try:
        await conn.execute("TRUNCATE TABLE corporate_actions RESTART IDENTITY CASCADE")
        
        start = 0
        size = 100
        while True:
            url = f"https://www.mubasher.info/api/1/corporate-actions?start={start}&size={size}"
            resp = session.get(url).json()
            rows = resp.get('rows', [])
            if not rows: break
            
            logger.info(f"Corp Actions: {len(rows)} rows (offset {start}).")
            for r in rows:
                await save_corporate_action(conn, r)
            
            if len(rows) < size: break
            start += size
            
    except Exception as e:
        logger.error(f"Corp Actions Error: {e}")

    await conn.close()
    logger.info("Phase B Complete.")

if __name__ == "__main__":
    asyncio.run(run_extraction())
