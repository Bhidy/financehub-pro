import asyncio
import asyncpg
import os

DB_DSN = os.getenv("DB_DSN", "postgresql://home@localhost/mubasher_db")

async def check_stats():
    conn = await asyncpg.connect(DB_DSN)
    
    print("\n--- DATABASE INVENTORY REPORT ---\n")
    
    # 1. Stocks
    stock_count = await conn.fetchval("SELECT COUNT(*) FROM market_tickers")
    print(f"STOCKS (Tickers): {stock_count}")
    
    # 2. OHLC History
    ohlc_count = await conn.fetchval("SELECT COUNT(*) FROM ohlc_data")
    if ohlc_count > 0:
        ohlc_range = await conn.fetchrow("SELECT MIN(date), MAX(date) FROM ohlc_data")
        print(f"STOCK PRICE HISTORY (Rows): {ohlc_count}")
        print(f"  Range: {ohlc_range['min']} to {ohlc_range['max']}")
    else:
        print("STOCK PRICE HISTORY: 0")

    # 3. Financial Statements
    stmt_count = await conn.fetchval("SELECT COUNT(*) FROM financial_statements")
    print(f"FINANCIAL STATEMENTS (Rows): {stmt_count}")
    if stmt_count > 0:
        stmt_types = await conn.fetch("SELECT period_type, COUNT(*) as c FROM financial_statements GROUP BY period_type")
        for t in stmt_types:
            print(f"  - {t['period_type']}: {t['c']}")

    # 4. Financial Ratios
    try:
        ratio_count = await conn.fetchval("SELECT COUNT(*) FROM financial_ratios")
        print(f"CALCULATED RATIOS (Rows): {ratio_count}")
    except:
        print("CALCULATED RATIOS: Table not found or empty.")

    print("\n--- MUTUAL FUNDS ---\n")
    
    # 5. Mutual Funds
    fund_count = await conn.fetchval("SELECT COUNT(*) FROM mutual_funds")
    print(f"MUTUAL FUNDS: {fund_count}")
    
    # 6. Funds with Metrics
    metrics_count = await conn.fetchval("SELECT COUNT(*) FROM mutual_funds WHERE sharpe_ratio IS NOT NULL")
    print(f"  - With Risk Metrics (Sharpe/Vol): {metrics_count}")
    
    # 7. NAV History
    nav_count = await conn.fetchval("SELECT COUNT(*) FROM nav_history")
    if nav_count > 0:
        nav_range = await conn.fetchrow("SELECT MIN(date), MAX(date) FROM nav_history")
        print(f"FUND NAV HISTORY (Rows): {nav_count}")
        print(f"  Range: {nav_range['min']} to {nav_range['max']}")

    # 8. Intraday Data (The Missing Link?)
    intra_count = await conn.fetchval("SELECT COUNT(*) FROM intraday_data")
    print(f"INTRADAY DATA (Rows): {intra_count}")

    # 9. TOTAL DATA POINTS (The "Marketing" Number)
    # Funds: 2 points per row (NAV, Date)
    # OHLC: 5 points per row (Open, High, Low, Close, Volume)
    # Intraday: 5 points per row
    # Financials: ~10 points per row
    total_points = (nav_count * 2) + (ohlc_count * 5) + (intra_count * 5) + (stmt_count * 10)
    print(f"\nAGGREGATE DATA POINTS (Cells): {total_points:,}")


    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_stats())
