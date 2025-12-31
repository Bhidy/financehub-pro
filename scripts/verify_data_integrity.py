#!/usr/bin/env python3
"""
Data Integrity Verification Script
===================================
Checks that database contains expected data and reports issues.
Used by GitHub Actions to verify data updates are working.
"""

import asyncio
import asyncpg
import os
import ssl
import sys
from datetime import datetime, timedelta

DATABASE_URL = os.environ.get('DATABASE_URL')

# Minimum thresholds for healthy data
THRESHOLDS = {
    'market_tickers': 400,      # At least 400 stocks
    'ohlc_history': 300000,     # At least 300k OHLC rows
    'mutual_funds': 500,        # At least 500 funds
    'nav_history': 500000,      # At least 500k NAV rows
    'corporate_actions': 5000,   # At least 5k corporate actions
}


def get_ssl_context():
    """Create SSL context for Supabase connection"""
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    return ssl_context


async def check_data_freshness(pool) -> dict:
    """Check when data was last updated"""
    async with pool.acquire() as conn:
        # Check market_tickers last_updated
        latest_ticker = await conn.fetchval(
            "SELECT MAX(last_updated) FROM market_tickers"
        )
        
        # Check latest OHLC date
        latest_ohlc = await conn.fetchval(
            "SELECT MAX(time)::date FROM ohlc_history"
        )
        
        # Check latest NAV date
        latest_nav = await conn.fetchval(
            "SELECT MAX(date) FROM nav_history"
        )
        
        return {
            'ticker_update': latest_ticker,
            'latest_ohlc': latest_ohlc,
            'latest_nav': latest_nav
        }


async def check_row_counts(pool) -> dict:
    """Check row counts against thresholds"""
    results = {}
    
    async with pool.acquire() as conn:
        for table, threshold in THRESHOLDS.items():
            try:
                count = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
                results[table] = {
                    'count': count,
                    'threshold': threshold,
                    'healthy': count >= threshold
                }
            except Exception as e:
                results[table] = {
                    'count': 0,
                    'threshold': threshold,
                    'healthy': False,
                    'error': str(e)
                }
    
    return results


async def main():
    if not DATABASE_URL:
        print("❌ DATABASE_URL not set!")
        sys.exit(1)
    
    print("🏥 DATA INTEGRITY CHECK")
    print("=" * 60)
    
    pool = await asyncpg.create_pool(
        DATABASE_URL,
        ssl=get_ssl_context(),
        min_size=1,
        max_size=5,
        statement_cache_size=0
    )
    
    try:
        # Check freshness
        print("\n📅 DATA FRESHNESS:")
        print("-" * 40)
        freshness = await check_data_freshness(pool)
        
        now = datetime.now()
        all_fresh = True
        
        if freshness['ticker_update']:
            age = now - freshness['ticker_update'].replace(tzinfo=None)
            status = "✅" if age.days < 1 else "⚠️"
            if age.days > 1:
                all_fresh = False
            print(f"{status} Ticker data: {freshness['ticker_update']} (Age: {age.days}d {age.seconds//3600}h)")
        else:
            print("❌ Ticker data: NEVER UPDATED")
            all_fresh = False
        
        if freshness['latest_ohlc']:
            age = (now.date() - freshness['latest_ohlc']).days
            status = "✅" if age <= 3 else "⚠️"  # Allow for weekends
            if age > 3:
                all_fresh = False
            print(f"{status} Latest OHLC: {freshness['latest_ohlc']} (Age: {age} days)")
        else:
            print("❌ OHLC data: NO DATA")
            all_fresh = False
        
        if freshness['latest_nav']:
            age = (now.date() - freshness['latest_nav']).days
            status = "✅" if age <= 3 else "⚠️"
            if age > 3:
                all_fresh = False
            print(f"{status} Latest NAV: {freshness['latest_nav']} (Age: {age} days)")
        else:
            print("❌ NAV data: NO DATA")
            all_fresh = False
        
        # Check row counts
        print("\n📊 ROW COUNTS:")
        print("-" * 40)
        counts = await check_row_counts(pool)
        
        all_counts_ok = True
        for table, data in counts.items():
            status = "✅" if data['healthy'] else "❌"
            if not data['healthy']:
                all_counts_ok = False
            print(f"{status} {table}: {data['count']:,} (min: {data['threshold']:,})")
        
        # Final verdict
        print("\n" + "=" * 60)
        if all_fresh and all_counts_ok:
            print("✅ ALL CHECKS PASSED - Database is healthy!")
            sys.exit(0)
        else:
            if not all_fresh:
                print("⚠️ DATA FRESHNESS ISSUE - Some data is stale!")
            if not all_counts_ok:
                print("⚠️ ROW COUNT ISSUE - Some tables below threshold!")
            # Don't fail for freshness during weekends
            if now.weekday() in [4, 5]:  # Friday, Saturday
                print("ℹ️ Note: It's the weekend, staleness may be expected.")
                sys.exit(0)
            sys.exit(1)
        
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
