#!/usr/bin/env python3
"""
Quick Data Freshness Check
==========================
Run this locally to instantly see when data was last updated.

Usage:
    python3 scripts/check_data_freshness.py
"""

import asyncio
import asyncpg
import os
from datetime import datetime

# Supabase Production Database URL
DATABASE_URL = os.environ.get('DATABASE_URL') or \
    "postgresql://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"


async def main():
    print("\n" + "=" * 70)
    print("  📊 FINANCEHUB DATA FRESHNESS REPORT")
    print("=" * 70)
    print(f"  Checked at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70 + "\n")
    
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=3, statement_cache_size=0)
    
    try:
        async with pool.acquire() as conn:
            # Market Tickers
            ticker_count = await conn.fetchval("SELECT COUNT(*) FROM market_tickers")
            latest_update = await conn.fetchval("SELECT MAX(last_updated) FROM market_tickers")
            
            # OHLC History
            ohlc_count = await conn.fetchval("SELECT COUNT(*) FROM ohlc_history")
            latest_ohlc = await conn.fetchval("SELECT MAX(time)::date FROM ohlc_history")
            ohlc_symbols = await conn.fetchval("SELECT COUNT(DISTINCT symbol) FROM ohlc_history")
            
            # NAV History
            nav_count = await conn.fetchval("SELECT COUNT(*) FROM nav_history")
            latest_nav = await conn.fetchval("SELECT MAX(date) FROM nav_history")
            
            # Mutual Funds
            fund_count = await conn.fetchval("SELECT COUNT(*) FROM mutual_funds")
            
            # Corporate Actions
            action_count = await conn.fetchval("SELECT COUNT(*) FROM corporate_actions")
            
            # Financial Statements
            stmt_count = await conn.fetchval("SELECT COUNT(*) FROM financial_statements")
            
        # Calculate ages
        now = datetime.now()
        
        print("📈 STOCK DATA:")
        print("-" * 50)
        print(f"  Stocks tracked:        {ticker_count:,}")
        if latest_update:
            age = now - latest_update.replace(tzinfo=None)
            status = "🟢 FRESH" if age.days < 1 else "🔴 STALE"
            print(f"  Last price update:     {latest_update.strftime('%Y-%m-%d %H:%M')} ({status})")
        else:
            print(f"  Last price update:     ❌ NEVER")
        
        print(f"\n📊 OHLC HISTORY:")
        print("-" * 50)
        print(f"  Total OHLC records:    {ohlc_count:,}")
        print(f"  Symbols with history:  {ohlc_symbols}")
        if latest_ohlc:
            age = (now.date() - latest_ohlc).days
            status = "🟢 FRESH" if age <= 3 else "🔴 STALE"
            print(f"  Latest OHLC date:      {latest_ohlc} ({age} days ago) ({status})")
        else:
            print(f"  Latest OHLC date:      ❌ NO DATA")
        
        print(f"\n💼 MUTUAL FUNDS:")
        print("-" * 50)
        print(f"  Funds tracked:         {fund_count:,}")
        print(f"  Total NAV records:     {nav_count:,}")
        if latest_nav:
            age = (now.date() - latest_nav).days
            status = "🟢 FRESH" if age <= 3 else "🔴 STALE"
            print(f"  Latest NAV date:       {latest_nav} ({age} days ago) ({status})")
        else:
            print(f"  Latest NAV date:       ❌ NO DATA")
        
        print(f"\n📑 OTHER DATA:")
        print("-" * 50)
        print(f"  Corporate actions:     {action_count:,}")
        print(f"  Financial statements:  {stmt_count:,}")
        
        # Overall status
        print("\n" + "=" * 70)
        
        issues = []
        if not latest_update or (now - latest_update.replace(tzinfo=None)).days >= 1:
            issues.append("Stock prices are stale")
        if not latest_ohlc or (now.date() - latest_ohlc).days > 3:
            issues.append("OHLC history is stale")
        if not latest_nav or (now.date() - latest_nav).days > 3:
            issues.append("NAV data is stale")
        
        if issues:
            print("  ⚠️  DATA UPDATE NEEDED!")
            print("  Issues:")
            for issue in issues:
                print(f"    - {issue}")
            print("\n  Run this to activate auto-updates:")
            print("    ./activate_data_updates.sh")
        else:
            print("  ✅ ALL DATA IS FRESH!")
        
        print("=" * 70 + "\n")
        
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
