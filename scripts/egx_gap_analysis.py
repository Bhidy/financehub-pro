
import asyncio
import os
import sys
import asyncpg
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Add backend-core to path
sys.path.append('/Users/home/Documents/Info Site/mubasher-deep-extract/backend-core')

load_dotenv('/Users/home/Documents/Info Site/mubasher-deep-extract/.env')

DATABASE_URL = os.getenv('DATABASE_URL')

async def run_gap_analysis():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found")
        return

    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    # Get all EGX tickers
    tickers = await conn.fetch("""
        SELECT symbol, name_en, last_updated 
        FROM market_tickers 
        WHERE market_code = 'EGX'
        ORDER BY symbol ASC
    """)
    
    print(f"Auditing {len(tickers)} EGX stocks...")
    
    results = []
    
    for t in tickers:
        symbol = t['symbol']
        # Check OHLC data
        ohlc_stats = await conn.fetchrow("""
            SELECT COUNT(*) as count, MAX(date) as last_date
            FROM ohlc_data
            WHERE symbol = $1
        """, symbol)
        
        has_data = ohlc_stats['count'] > 0
        last_date = ohlc_stats['last_date']
        
        # Check Shareholders
        sh_count = await conn.fetchval("""
            SELECT COUNT(*) FROM major_shareholders WHERE symbol = $1
        """, symbol)
        
        status = "✅ OK" if has_data and last_date and (datetime.now().date() - last_date).days <= 3 else "⚠️ STALE"
        if not has_data: status = "❌ MISSING"
        
        results.append({
            "ticker": symbol,
            "name": t['name_en'],
            "ohlc_count": ohlc_stats['count'],
            "last_ohlc": last_date,
            "shareholders": sh_count,
            "status": status
        })

    await conn.close()
    
    # Generate Markdown Report
    report_path = "/Users/home/.gemini/antigravity/brain/363c3467-54da-4c6b-926d-f3288d025b28/egx_gap_analysis_report.md"
    with open(report_path, "w") as f:
        f.write("# EGX Data Gap Analysis Report\n\n")
        f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("| Ticker | Name | OHLC Rows | Last Date | Shareholders | Status |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- | :--- |\n")
        
        for r in results:
            f.write(f"| {r['ticker']} | {r['name']} | {r['ohlc_count']} | {r['last_ohlc']} | {r['shareholders']} | {r['status']} |\n")
            
    print(f"Report generated at {report_path}")

if __name__ == "__main__":
    asyncio.run(run_gap_analysis())
