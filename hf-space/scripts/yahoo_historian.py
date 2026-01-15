import aiohttp
import asyncio
import asyncpg
import pandas as pd
import os
import datetime
import json

# DB Config
DB_URL = os.getenv("DATABASE_URL", "postgresql://home@localhost:5432/mubasher_db")
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

async def get_db_connection():
    return await asyncpg.connect(DB_URL)

async def fetch_history_raw(session, symbol):
    """Fetch history using raw Yahoo API for maximum depth."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=2y&interval=1d"
    try:
        async with session.get(url, headers=HEADERS) as resp:
            if resp.status == 200:
                data = await resp.json()
                if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                    return data['chart']['result'][0]
    except Exception as e:
        print(f"❌ {symbol}: Fetch Error {e}")
    return None

async def upsert_history(conn, isin, result):
    """Parse raw JSON and upsert."""
    timestamps = result.get('timestamp', [])
    quote = result.get('indicators', {}).get('quote', [{}])[0]
    
    opens = quote.get('open', [])
    highs = quote.get('high', [])
    lows = quote.get('low', [])
    closes = quote.get('close', [])
    volumes = quote.get('volume', [])
    
    records = []
    for i, ts in enumerate(timestamps):
        try:
            if opens[i] is None: continue # Skip empty days
            
            dt = datetime.datetime.fromtimestamp(ts).date()
            records.append((
                isin,
                dt,
                float(opens[i] or 0),
                float(highs[i] or 0),
                float(lows[i] or 0),
                float(closes[i] or 0),
                int(volumes[i] or 0)
            ))
        except:
            continue

    if not records:
        return

    try:
        await conn.executemany("""
            INSERT INTO yahoo_history (isin, date, open, high, low, close, volume)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (isin, date) DO UPDATE SET
                open = EXCLUDED.open,
                high = EXCLUDED.high,
                low = EXCLUDED.low,
                close = EXCLUDED.close,
                volume = EXCLUDED.volume
        """, records)
        print(f"✅ {isin}: Wrote {len(records)} candles.")
    except Exception as e:
        print(f"❌ DB Error {isin}: {e}")

async def main():
    print("📜 Starting Smart Yahoo Historian (Raw API + Symbols)...")
    conn = await get_db_connection()
    
    # Get ISIN AND Symbol
    # IMPORTANT: Use Symbol for fetch, ISIN for storage
    rows = await conn.fetch("SELECT isin, symbol FROM yahoo_universe WHERE symbol IS NOT NULL")
    print(f"📚 Found {len(rows)} stocks to backfill.")
    
    async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=False)) as session:
        for i, r in enumerate(rows):
            isin = r['isin']
            symbol = r['symbol']
            
            # Skip if symbol is just ISIN (fallback)
            if symbol == isin: 
                # Use cached symbol mapping if possible, or skip
                # Actually, try sending ISIN, maybe it works for some
                pass

            print(f"⏳ [{i+1}/{len(rows)}] Fetching {symbol} ({isin})...")
            
            data = await fetch_history_raw(session, symbol)
            if data:
                await upsert_history(conn, isin, data)
            else:
                # Fallback: Try ISIN if Symbol failed
                data_isin = await fetch_history_raw(session, isin)
                if data_isin:
                    await upsert_history(conn, isin, data_isin)
                else:
                    print(f"⚠️ No history for {symbol}")
            
            await asyncio.sleep(0.5) # Rate limit

    print("🎉 History Backfill Complete.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
