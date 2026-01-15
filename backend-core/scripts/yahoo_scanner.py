import asyncio
import asyncpg
import pandas as pd
from yahooquery import Ticker
import os
import time
import requests

# DB Config
DB_URL = os.getenv("DATABASE_URL", "postgresql://home@localhost:5432/mubasher_db")

# Batch Size for YahooQuery (50 ISINs per call is safe)
BATCH_SIZE = 50

# Valid Modules List (Standard + Deep)
MODULES = [
    'price', 'summaryDetail', 'defaultKeyStatistics', 'financialData',
    'summaryProfile', 'recommendationTrend', 'pageViews'
]

async def get_db_connection():
    return await asyncpg.connect(DB_URL)

def fetch_yahoo_batch(isins):
    """
    Fetch data for a list of ISINs using yahooquery.
    Returns a flattened dictionary keyed by ISIN.
    """
    try:
        t = Ticker(isins, formatted=False, asynchronous=True)
        # We need to use valid modules.
        # Note: price, summaryDetail, etc are standard.
        data = t.get_modules(MODULES)
        return data
    except Exception as e:
        print(f"⚠️ Yahoo API Error: {e}")
        return {}

async def upsert_realtime(conn, isin, price, detail):
    # Map API keys to DB columns
    # price module: regularMarketPrice, regularMarketChange, ...
    
    q = """
    INSERT INTO yahoo_realtime (
        isin, last_price, change, change_pct, volume, 
        day_high, day_low, bid, ask, market_cap, market_state,
        avg_vol_10d, avg_vol_3m, last_trade_time, 
        year_high, year_low, price_hint,
        updated_at
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, to_timestamp($14), $15, $16, $17, NOW()
    )
    ON CONFLICT (isin) DO UPDATE SET
        last_price = EXCLUDED.last_price,
        change = EXCLUDED.change,
        change_pct = EXCLUDED.change_pct,
        volume = EXCLUDED.volume,
        day_high = EXCLUDED.day_high,
        day_low = EXCLUDED.day_low,
        bid = EXCLUDED.bid,
        ask = EXCLUDED.ask,
        market_cap = EXCLUDED.market_cap,
        market_state = EXCLUDED.market_state,
        avg_vol_10d = EXCLUDED.avg_vol_10d,
        avg_vol_3m = EXCLUDED.avg_vol_3m,
        last_trade_time = EXCLUDED.last_trade_time,
        year_high = EXCLUDED.year_high,
        year_low = EXCLUDED.year_low,
        price_hint = EXCLUDED.price_hint,
        updated_at = NOW()
    """
    
    # Validation/Sanitization (simple cast)
    # Note: yahooquery keys might be missing. Using .get() in caller.
    
    await conn.execute(q, 
    isin, 
    price.get('regularMarketPrice'),
    price.get('regularMarketChange'),
    price.get('regularMarketChangePercent'),
    price.get('regularMarketVolume'),
    price.get('regularMarketDayHigh'),
    price.get('regularMarketDayLow'),
    detail.get('bid'),
    detail.get('ask'),
    price.get('marketCap'),
    price.get('marketState'),
    price.get('averageDailyVolume10Day'),
    price.get('averageDailyVolume3Month'),
    price.get('regularMarketTime'),
    detail.get('fiftyTwoWeekHigh'),
    detail.get('fiftyTwoWeekLow'),
    price.get('priceHint')
    )

async def upsert_fundamentals(conn, isin, d):
    """
    Upsert data into yahoo_fundamentals table.
    """
    stats = d.get('defaultKeyStatistics', {})
    fin = d.get('financialData', {})
    
    await conn.execute("""
        INSERT INTO yahoo_fundamentals (
            isin, pe_ratio, forward_pe, peg_ratio, price_to_book,
            dividend_yield, payout_ratio, profit_margin, operating_margin,
            return_on_equity, return_on_assets,
            total_cash, total_debt, current_ratio, quick_ratio,
            beta, trailing_eps, forward_eps,
            shares_outstanding, float_shares,
            insider_ownership, institution_ownership,
            updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW())
        ON CONFLICT (isin) DO UPDATE SET
            pe_ratio = EXCLUDED.pe_ratio,
            forward_pe = EXCLUDED.forward_pe,
            peg_ratio = EXCLUDED.peg_ratio,
            price_to_book = EXCLUDED.price_to_book,
            dividend_yield = EXCLUDED.dividend_yield,
            payout_ratio = EXCLUDED.payout_ratio,
            profit_margin = EXCLUDED.profit_margin,
            operating_margin = EXCLUDED.operating_margin,
            return_on_equity = EXCLUDED.return_on_equity,
            return_on_assets = EXCLUDED.return_on_assets,
            total_cash = EXCLUDED.total_cash,
            total_debt = EXCLUDED.total_debt,
            current_ratio = EXCLUDED.current_ratio,
            quick_ratio = EXCLUDED.quick_ratio,
            beta = EXCLUDED.beta,
            trailing_eps = EXCLUDED.trailing_eps,
            forward_eps = EXCLUDED.forward_eps,
            shares_outstanding = EXCLUDED.shares_outstanding,
            float_shares = EXCLUDED.float_shares,
            insider_ownership = EXCLUDED.insider_ownership,
            institution_ownership = EXCLUDED.institution_ownership,
            updated_at = NOW()
    """,
    isin,
    stats.get('forwardPE') or stats.get('trailingPE'), # Fallback logic
    stats.get('forwardPE'),
    stats.get('pegRatio'),
    stats.get('priceToBook'),
    stats.get('dividendYield'), # FinData often has this
    stats.get('payoutRatio'),
    stats.get('profitMargins'),
    stats.get('operatingMargins'),
    fin.get('returnOnEquity'),
    fin.get('returnOnAssets'),
    fin.get('totalCash'),
    fin.get('totalDebt'),
    fin.get('currentRatio'),
    fin.get('quickRatio'),
    stats.get('beta'),
    stats.get('trailingEps'),
    stats.get('forwardEps'),
    stats.get('sharesOutstanding'),
    stats.get('floatShares'),
    stats.get('heldPercentInsiders'),
    stats.get('heldPercentInstitutions')
    )

async def main():
    print("🚜 Starting Yahoo Harvester...")
    conn = await get_db_connection()
    
    # 1. Get Universe
    rows = await conn.fetch("SELECT isin FROM yahoo_universe")
    isins = [r['isin'] for r in rows]
    print(f"🌾 Found {len(isins)} ISINs to harvest.")
    
    if not isins:
        print("⚠️ Universe is empty. nothing to do.")
        await conn.close()
        return

    # 2. Batch Processing
    for i in range(0, len(isins), BATCH_SIZE):
        batch = isins[i:i+BATCH_SIZE]
        print(f"⚡ Fetching batch {i} - {i+len(batch)}...")
        
        # Sync Call (YahooQuery is synchronous typically, unless using AsyncTicker)
        # Using standard Ticker here for reliability as per probing
        raw_data = fetch_yahoo_batch(batch)
        
        for isin, data in raw_data.items():
            if isinstance(data, dict): # Check validity
                try:
                    await upsert_realtime(conn, isin, data)
                    await upsert_fundamentals(conn, isin, data)
                except Exception as e:
                    print(f"❌ DB Error for {isin}: {e}")
                    
        print("💤 Sleeping 2s...")
        time.sleep(2)

    print("✅ Harvest Complete.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
