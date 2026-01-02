import asyncio
import asyncpg
import os
import ssl
from datetime import datetime
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL')

def get_ssl_context():
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    return ssl_context

async def main():
    print("📊 GENERATING PROFESSIONAL DATA STATUS REPORT...")
    
    # Connect with PgBouncer-compatible settings
    try:
        pool = await asyncpg.create_pool(DATABASE_URL, ssl=get_ssl_context(), min_size=1, max_size=1, statement_cache_size=0)
    except:
        try:
            pool = await asyncpg.create_pool(DATABASE_URL, ssl='require', min_size=1, max_size=1, statement_cache_size=0)
        except:
             print("❌ CRITICAL: Could not connect to database to verify status.")
             return

    async with pool.acquire() as conn:
        data = []
        
        # 1. MUTUAL FUNDS
        latest_nav = await conn.fetchval("SELECT MAX(date) FROM nav_history")
        fund_count = await conn.fetchval("SELECT COUNT(*) FROM mutual_funds")
        data.append(["Mutual Funds (NAV)", fund_count, latest_nav, "✅ Updated" if latest_nav and str(latest_nav) >= datetime.now().strftime('%Y-%m-%d') else "⚠️ Stale", "Database Engine"])

        # 2. STOCK PRICES
        latest_price = await conn.fetchval("SELECT MAX(last_updated) FROM market_tickers")
        ticker_count = await conn.fetchval("SELECT COUNT(*) FROM market_tickers")
        data.append(["Stock Prices (Live)", ticker_count, latest_price, "✅ Updated" if latest_price and latest_price.date() == datetime.now().date() else "⚠️ Stale", "Yahoo Finance API"])

        # 3. OHLC HISTORY
        latest_ohlc = await conn.fetchval("SELECT MAX(time) FROM ohlc_history")
        ohlc_count = await conn.fetchval("SELECT COUNT(*) FROM ohlc_history")
        data.append(["OHLC History (Daily)", ohlc_count, latest_ohlc, "✅ Updated" if latest_ohlc and latest_ohlc.date() == datetime.now().date() else "⚠️ Stale", "Yahoo Finance API"])

        # 4. CORPORATE ACTIONS
        latest_ex_date = await conn.fetchval("SELECT MAX(ex_date) FROM corporate_actions")
        action_count = await conn.fetchval("SELECT COUNT(*) FROM corporate_actions")
        data.append(["Corporate Actions", action_count, latest_ex_date, "✅ Active", "Yahoo Finance API"])

        # 5. MARKET NEWS
        latest_news = await conn.fetchval("SELECT MAX(published_at) FROM market_news")
        news_count = await conn.fetchval("SELECT COUNT(*) FROM market_news")
        data.append(["Market News", news_count, latest_news, "✅ Updated" if latest_news and latest_news.date() == datetime.now().date() else "⚠️ Stale", "Context Engine"])

    await pool.close()

    # Create DataFrame
    df = pd.DataFrame(data, columns=["Data Category", "Records", "Latest Timestamp", "Status", "Source"])
    
    # Print formatted table manually
    print("\n" + "="*95)
    print("🚀 FINANCEHUB PRO - SYSTEM COMPLETION REPORT")
    print("="*95)
    print(f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 95)
    
    # Header
    header = f"{'Data Category':<25} | {'Records':<10} | {'Latest Timestamp':<25} | {'Status':<12} | {'Source':<20}"
    print(header)
    print("-" * 95)
    
    # Rows
    for _, row in df.iterrows():
        ts = str(row['Latest Timestamp']) if row['Latest Timestamp'] else "N/A"
        print(f"{row['Data Category']:<25} | {row['Records']:<10} | {ts:<25} | {row['Status']:<12} | {row['Source']:<20}")
        
    print("-" * 95)
    print("="*95 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
