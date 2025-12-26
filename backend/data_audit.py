"""
COMPREHENSIVE DATA AUDIT
Deep analysis of backend data vs frontend usage
"""

import asyncio
from database import db
from datetime import datetime
import json


async def comprehensive_data_audit():
    """Complete audit of all data in database"""
    
    await db.connect()
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "categories": []
    }
    
    print("\n" + "="*80)
    print("🔍 COMPREHENSIVE DATA AUDIT - BACKEND DATABASE")
    print("="*80)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80 + "\n")
    
    # ========================================================================
    # 1. STOCK TICKERS
    # ========================================================================
    print("📊 CATEGORY 1: STOCK TICKERS")
    print("-" * 80)
    
    ticker_count = await db.fetch_one("SELECT COUNT(*) as cnt FROM market_tickers")
    ticker_sample = await db.fetch_all("SELECT * FROM market_tickers LIMIT 3")
    ticker_stats = await db.fetch_one("""
        SELECT 
            COUNT(*) as total,
            COUNT(DISTINCT sector_name) as unique_sectors,
            MIN(last_price) as min_price,
            MAX(last_price) as max_price,
            AVG(last_price) as avg_price,
            SUM(volume) as total_volume
        FROM market_tickers
    """)
    
    # Check what fields are populated
    ticker_schema = await db.fetch_all("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'market_tickers'
        ORDER BY ordinal_position
    """)
    
    print(f"✅ Total Tickers: {ticker_count['cnt']}")
    print(f"✅ Unique Sectors: {ticker_stats['unique_sectors']}")
    print(f"✅ Price Range: {float(ticker_stats['min_price']):.2f} - {float(ticker_stats['max_price']):.2f} SAR")
    print(f"✅ Average Price: {float(ticker_stats['avg_price']):.2f} SAR")
    print(f"\nDatabase Fields ({len(ticker_schema)}):")
    for col in ticker_schema:
        print(f"  - {col['column_name']}: {col['data_type']}")
    
    print(f"\nSample Records:")
    for t in ticker_sample:
        print(f"  {t['symbol']:6s} - {t['name_en']:30s} - {float(t['last_price']):8.2f} SAR")
    
    report["categories"].append({
        "name": "Stock Tickers",
        "source": "Yahoo Finance API",
        "total_records": ticker_count['cnt'],
        "fields": [col['column_name'] for col in ticker_schema],
        "stats": dict(ticker_stats),
        "api_endpoint": "/tickers",
        "frontend_pages": ["Dashboard", "Stocks List", "Stock Detail", "Screener", "Heatmap"]
    })
    
    # ========================================================================
    # 2. OHLC HISTORICAL DATA
    # ========================================================================
    print("\n📈 CATEGORY 2: OHLC HISTORICAL PRICE DATA")
    print("-" * 80)
    
    ohlc_count = await db.fetch_one("SELECT COUNT(*) as cnt FROM ohlc_data")
    ohlc_stats = await db.fetch_one("""
        SELECT 
            COUNT(DISTINCT symbol) as unique_symbols,
            MIN(date) as earliest_date,
            MAX(date) as latest_date,
            COUNT(*) as total_bars
        FROM ohlc_data
    """)
    
    # Check data completeness per stock
    ohlc_per_stock = await db.fetch_all("""
        SELECT symbol, COUNT(*) as bar_count, 
               MIN(date) as first_date, MAX(date) as last_date
        FROM ohlc_data
        GROUP BY symbol
        ORDER BY bar_count DESC
        LIMIT 5
    """)
    
    days_range = (ohlc_stats['latest_date'] - ohlc_stats['earliest_date']).days
    
    print(f"✅ Total OHLC Bars: {ohlc_count['cnt']:,}")
    print(f"✅ Unique Symbols: {ohlc_stats['unique_symbols']}")
    print(f"✅ Date Range: {ohlc_stats['earliest_date']} to {ohlc_stats['latest_date']}")
    print(f"✅ Days Covered: {days_range} days ({days_range/365:.1f} years)")
    
    print(f"\nTop Stocks by Data Completeness:")
    for stock in ohlc_per_stock:
        print(f"  {stock['symbol']:6s}: {stock['bar_count']:,} bars (from {stock['first_date']} to {stock['last_date']})")
    
    report["categories"].append({
        "name": "OHLC Historical Data",
        "source": "Yahoo Finance Historical API",
        "total_records": ohlc_count['cnt'],
        "unique_symbols": ohlc_stats['unique_symbols'],
        "date_range": f"{ohlc_stats['earliest_date']} to {ohlc_stats['latest_date']}",
        "years": round(days_range/365, 1),
        "api_endpoint": "/ohlc/{symbol}",
        "frontend_pages": ["Stock Detail Charts", "Technical Analysis", "Backtest"]
    })
    
    # ========================================================================
    # 3. CORPORATE ACTIONS
    # ========================================================================
    print("\n🏛️ CATEGORY 3: CORPORATE ACTIONS")
    print("-" * 80)
    
    actions_count = await db.fetch_one("SELECT COUNT(*) as cnt FROM corporate_actions")
    actions_by_type = await db.fetch_all("""
        SELECT action_type, COUNT(*) as cnt
        FROM corporate_actions
        GROUP BY action_type
        ORDER BY cnt DESC
    """)
    actions_stats = await db.fetch_one("""
        SELECT 
            COUNT(DISTINCT symbol) as unique_symbols,
            MIN(ex_date) as earliest_date,
            MAX(ex_date) as latest_date
        FROM corporate_actions
    """)
    
    print(f"✅ Total Corporate Actions: {actions_count['cnt']}")
    print(f"✅ Unique Symbols: {actions_stats['unique_symbols']}")
    print(f"✅ Date Range: {actions_stats['earliest_date']} to {actions_stats['latest_date']}")
    
    print(f"\nBreakdown by Type:")
    for action in actions_by_type:
        print(f"  {action['action_type']:15s}: {action['cnt']:4d} events")
    
    report["categories"].append({
        "name": "Corporate Actions",
        "source": "Yahoo Finance Dividends & Splits API",
        "total_records": actions_count['cnt'],
        "unique_symbols": actions_stats['unique_symbols'],
        "types": {a['action_type']: a['cnt'] for a in actions_by_type},
        "api_endpoint": "/corporate-actions",
        "frontend_pages": ["Corporate Actions Page", "Stock Detail - Events Tab"]
    })
    
    # ========================================================================
    # 4. ECONOMIC INDICATORS
    # ========================================================================
    print("\n🌍 CATEGORY 4: ECONOMIC INDICATORS")
    print("-" * 80)
    
    econ_count = await db.fetch_one("SELECT COUNT(*) as cnt FROM economic_indicators")
    econ_by_type = await db.fetch_all("""
        SELECT indicator_code, source, COUNT(*) as cnt,
               MIN(date) as first_date, MAX(date) as last_date
        FROM economic_indicators
        GROUP BY indicator_code, source
        ORDER BY cnt DESC
    """)
    
    print(f"✅ Total Data Points: {econ_count['cnt']:,}")
    print(f"\nIndicators Available:")
    for ind in econ_by_type:
        print(f"  {ind['indicator_code']:15s}: {ind['cnt']:4d} points ({ind['source']})")
        print(f"      Range: {ind['first_date']} to {ind['last_date']}")
    
    report["categories"].append({
        "name": "Economic Indicators",
        "source": "Exchange Rate API (currencies) + Market Data",
        "total_records": econ_count['cnt'],
        "indicators": [{
            "code": i['indicator_code'],
            "source": i['source'],
            "count": i['cnt']
        } for i in econ_by_type],
        "api_endpoint": "/economic-indicators",
        "frontend_pages": ["Economic Dashboard", "Dashboard Widgets"]
    })
    
    # ========================================================================
    # 5. MUTUAL FUNDS
    # ========================================================================
    print("\n💼 CATEGORY 5: MUTUAL FUNDS")
    print("-" * 80)
    
    funds_count = await db.fetch_one("SELECT COUNT(*) as cnt FROM mutual_funds")
    funds_list = await db.fetch_all("""
        SELECT fund_id, fund_name, manager_name, inception_date
        FROM mutual_funds
        ORDER BY fund_name
        LIMIT 10
    """)
    funds_managers = await db.fetch_all("""
        SELECT manager_name, COUNT(*) as fund_count
        FROM mutual_funds
        GROUP BY manager_name
        ORDER BY fund_count DESC
    """)
    
    nav_count = await db.fetch_one("SELECT COUNT(*) as cnt FROM nav_history")
    nav_stats = await db.fetch_one("""
        SELECT 
            COUNT(DISTINCT fund_id) as unique_funds,
            MIN(date) as earliest_date,
            MAX(date) as latest_date
        FROM nav_history
    """)
    
    print(f"✅ Total Funds: {funds_count['cnt']}")
    print(f"✅ NAV Records: {nav_count['cnt']:,}")
    print(f"✅ NAV Date Range: {nav_stats['earliest_date']} to {nav_stats['latest_date']}")
    
    print(f"\nFund Managers:")
    for mgr in funds_managers:
        print(f"  {mgr['manager_name']:30s}: {mgr['fund_count']} funds")
    
    print(f"\nSample Funds:")
    for fund in funds_list[:5]:
        print(f"  {fund['fund_id']:8s} - {fund['fund_name']}")
    
    report["categories"].append({
        "name": "Mutual Funds",
        "source": "Real Saudi Fund Names + Algorithmic NAV Generation",
        "total_funds": funds_count['cnt'],
        "total_nav_records": nav_count['cnt'],
        "managers": len(funds_managers),
        "api_endpoint": "/funds, /funds/{id}/nav",
        "frontend_pages": ["Mutual Funds List", "Fund Detail Pages"]
    })
    
    # ========================================================================
    # 6. INSIDER TRADING
    # ========================================================================
    print("\n👔 CATEGORY 6: INSIDER TRADING")
    print("-" * 80)
    
    insider_count = await db.fetch_one("SELECT COUNT(*) as cnt FROM insider_trading")
    insider_stats = await db.fetch_one("""
        SELECT 
            COUNT(DISTINCT symbol) as unique_symbols,
            COUNT(DISTINCT insider_name) as unique_insiders,
            MIN(transaction_date) as earliest_date,
            MAX(transaction_date) as latest_date,
            SUM(CASE WHEN transaction_type = 'BUY' THEN 1 ELSE 0 END) as buy_count,
            SUM(CASE WHEN transaction_type = 'SELL' THEN 1 ELSE 0 END) as sell_count
        FROM insider_trading
    """)
    
    top_symbols = await db.fetch_all("""
        SELECT symbol, COUNT(*) as transaction_count
        FROM insider_trading
        GROUP BY symbol
        ORDER BY transaction_count DESC
        LIMIT 5
    """)
    
    print(f"✅ Total Transactions: {insider_count['cnt']}")
    print(f"✅ Unique Symbols: {insider_stats['unique_symbols']}")
    print(f"✅ Unique Insiders: {insider_stats['unique_insiders']}")
    print(f"✅ Date Range: {insider_stats['earliest_date']} to {insider_stats['latest_date']}")
    print(f"✅ Buy Transactions: {insider_stats['buy_count']}")
    print(f"✅ Sell Transactions: {insider_stats['sell_count']}")
    
    print(f"\nMost Active Stocks:")
    for stock in top_symbols:
        print(f"  {stock['symbol']:6s}: {stock['transaction_count']:3d} transactions")
    
    report["categories"].append({
        "name": "Insider Trading",
        "source": "Algorithmically Generated (Realistic Patterns)",
        "total_records": insider_count['cnt'],
        "unique_symbols": insider_stats['unique_symbols'],
        "unique_insiders": insider_stats['unique_insiders'],
        "api_endpoint": "/insider-trading",
        "frontend_pages": ["Insider Trading Page", "Stock Detail - Insider Tab"]
    })
    
    # ========================================================================
    # 7. ANALYST RATINGS
    # ========================================================================
    print("\n📈 CATEGORY 7: ANALYST RATINGS")
    print("-" * 80)
    
    ratings_count = await db.fetch_one("SELECT COUNT(*) as cnt FROM analyst_ratings")
    ratings_stats = await db.fetch_one("""
        SELECT 
            COUNT(DISTINCT symbol) as unique_symbols,
            COUNT(DISTINCT analyst_firm) as unique_firms,
            MIN(rating_date) as earliest_date,
            MAX(rating_date) as latest_date
        FROM analyst_ratings
    """)
    
    ratings_by_type = await db.fetch_all("""
        SELECT rating, COUNT(*) as cnt
        FROM analyst_ratings
        GROUP BY rating
        ORDER BY cnt DESC
    """)
    
    top_firms = await db.fetch_all("""
        SELECT analyst_firm, COUNT(*) as rating_count
        FROM analyst_ratings
        GROUP BY analyst_firm
        ORDER BY rating_count DESC
        LIMIT 5
    """)
    
    print(f"✅ Total Ratings: {ratings_count['cnt']}")
    print(f"✅ Unique Symbols: {ratings_stats['unique_symbols']}")
    print(f"✅ Unique Firms: {ratings_stats['unique_firms']}")
    print(f"✅ Date Range: {ratings_stats['earliest_date']} to {ratings_stats['latest_date']}")
    
    print(f"\nRating Distribution:")
    for rating in ratings_by_type:
        print(f"  {rating['rating']:15s}: {rating['cnt']:3d} ratings")
    
    print(f"\nTop Analyst Firms:")
    for firm in top_firms:
        print(f"  {firm['analyst_firm']:30s}: {firm['rating_count']:3d} ratings")
    
    report["categories"].append({
        "name": "Analyst Ratings",
        "source": "Algorithmically Generated (Major Firms)",
        "total_records": ratings_count['cnt'],
        "unique_symbols": ratings_stats['unique_symbols'],
        "unique_firms": ratings_stats['unique_firms'],
        "api_endpoint": "/analyst-ratings",
        "frontend_pages": ["Analyst Ratings Page", "Stock Detail - Analyst Tab"]
    })
    
    # ========================================================================
    # GRAND SUMMARY
    # ========================================================================
    total_records = (
        ticker_count['cnt'] + ohlc_count['cnt'] + actions_count['cnt'] +
        econ_count['cnt'] + funds_count['cnt'] + nav_count['cnt'] +
        insider_count['cnt'] + ratings_count['cnt']
    )
    
    print("\n" + "="*80)
    print("📊 GRAND SUMMARY - ALL DATA CATEGORIES")
    print("="*80)
    print(f"Total Records in Database: {total_records:,}")
    print(f"\nBreakdown:")
    print(f"  1. Stock Tickers:        {ticker_count['cnt']:>8,}")
    print(f"  2. OHLC Historical:      {ohlc_count['cnt']:>8,}")
    print(f"  3. Corporate Actions:    {actions_count['cnt']:>8,}")
    print(f"  4. Economic Indicators:  {econ_count['cnt']:>8,}")
    print(f"  5. Mutual Funds:         {funds_count['cnt']:>8,}")
    print(f"  6. Fund NAV History:     {nav_count['cnt']:>8,}")
    print(f"  7. Insider Trading:      {insider_count['cnt']:>8,}")
    print(f"  8. Analyst Ratings:      {ratings_count['cnt']:>8,}")
    print("="*80 + "\n")
    
    report["grand_total"] = total_records
    
    # Save report to file
    with open('data_audit_report.json', 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    await db.close()
    
    return report


if __name__ == "__main__":
    asyncio.run(comprehensive_data_audit())
