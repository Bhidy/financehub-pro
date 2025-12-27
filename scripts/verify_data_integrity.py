#!/usr/bin/env python3
"""
Data Integrity Verification Script
===================================
Verifies database integrity and ensures data counts are expected.
Fails if data appears to be missing or corrupted.
"""

import asyncio
import asyncpg
import os
import sys
from datetime import datetime, timedelta

DATABASE_URL = os.environ.get('DATABASE_URL')

# Minimum expected counts - will fail if below these thresholds
MIN_EXPECTED = {
    'market_tickers': 400,      # At least 400 stocks
    'mutual_funds': 500,        # At least 500 funds
    'ohlc_history': 300000,     # At least 300K OHLC records
    'nav_history': 600000,      # At least 600K NAV records
    'financial_statements': 5000,
    'corporate_actions': 5000,
}


async def main():
    if not DATABASE_URL:
        print("❌ DATABASE_URL not set")
        sys.exit(1)
    
    print("=" * 60)
    print("    DATA INTEGRITY VERIFICATION")
    print("=" * 60)
    print()
    
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    errors = []
    warnings = []
    
    try:
        # Check 1: Minimum row counts
        print("📋 Checking minimum data thresholds...")
        for table, min_count in MIN_EXPECTED.items():
            count = await conn.fetchval(f'SELECT COUNT(*) FROM {table}')
            if count < min_count:
                errors.append(f"{table}: {count:,} rows (expected >= {min_count:,})")
                print(f"  ❌ {table}: {count:,} < {min_count:,}")
            else:
                print(f"  ✅ {table}: {count:,} rows")
        
        print()
        
        # Check 2: OHLC coverage
        print("📊 Checking OHLC coverage...")
        ohlc_symbols = await conn.fetchval(
            "SELECT COUNT(DISTINCT symbol) FROM ohlc_history"
        )
        total_symbols = await conn.fetchval(
            "SELECT COUNT(*) FROM market_tickers"
        )
        coverage = (ohlc_symbols / total_symbols) * 100 if total_symbols > 0 else 0
        
        if coverage < 95:
            warnings.append(f"OHLC coverage: {coverage:.1f}% (expected >= 95%)")
            print(f"  ⚠️ Coverage: {coverage:.1f}% ({ohlc_symbols}/{total_symbols})")
        else:
            print(f"  ✅ Coverage: {coverage:.1f}% ({ohlc_symbols}/{total_symbols})")
        
        print()
        
        # Check 3: Data freshness
        print("🕐 Checking data freshness...")
        latest_ohlc = await conn.fetchval(
            "SELECT MAX(time) FROM ohlc_history"
        )
        
        if latest_ohlc:
            days_old = (datetime.now(latest_ohlc.tzinfo) - latest_ohlc).days if latest_ohlc.tzinfo else (datetime.now() - latest_ohlc).days
            if days_old > 7:
                warnings.append(f"OHLC data is {days_old} days old")
                print(f"  ⚠️ Latest OHLC: {latest_ohlc} ({days_old} days old)")
            else:
                print(f"  ✅ Latest OHLC: {latest_ohlc}")
        
        print()
        
        # Check 4: Database connectivity
        print("🔌 Testing database operations...")
        test_result = await conn.fetchval("SELECT 1")
        if test_result == 1:
            print("  ✅ Database responsive")
        
        print()
        print("=" * 60)
        
        # Summary
        if errors:
            print("❌ VERIFICATION FAILED")
            print()
            for error in errors:
                print(f"  ERROR: {error}")
            sys.exit(1)
        elif warnings:
            print("⚠️ VERIFICATION PASSED WITH WARNINGS")
            print()
            for warning in warnings:
                print(f"  WARNING: {warning}")
        else:
            print("✅ ALL CHECKS PASSED")
        
        print("=" * 60)
        
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
