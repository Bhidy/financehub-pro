#!/usr/bin/env python3
"""
Get Data Statistics Script
==========================
Outputs current database statistics in Markdown format.
Used by GitHub Actions to generate reports.
"""

import asyncio
import asyncpg
import os
import sys

DATABASE_URL = os.environ.get('DATABASE_URL')


async def main():
    if not DATABASE_URL:
        print("❌ DATABASE_URL not set")
        sys.exit(1)
    
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    try:
        # Get all counts
        tables = [
            ('ohlc_history', 5, '📈 OHLC History'),
            ('nav_history', 2, '💼 NAV History'),
            ('market_tickers', 8, '🏢 Stock Tickers'),
            ('mutual_funds', 10, '🏦 Mutual Funds'),
            ('financial_statements', 10, '📑 Financial Statements'),
            ('corporate_actions', 4, '📋 Corporate Actions'),
            ('earnings_calendar', 5, '📅 Earnings'),
            ('major_shareholders', 3, '👥 Shareholders'),
        ]
        
        print("| Category | Records | Data Points |")
        print("|----------|---------|-------------|")
        
        total_rows = 0
        total_points = 0
        
        for table, mult, label in tables:
            count = await conn.fetchval(f'SELECT COUNT(*) FROM {table}')
            points = count * mult
            total_rows += count
            total_points += points
            print(f"| {label} | {count:,} | {points:,} |")
        
        print(f"| **TOTAL** | **{total_rows:,}** | **{total_points:,}** |")
        print()
        print(f"**Total Data Points: {total_points:,} ({total_points/1000000:.2f}M)**")
        
        # Get latest record date
        latest = await conn.fetchval(
            "SELECT MAX(time) FROM ohlc_history"
        )
        print(f"\n**Latest OHLC Record:** {latest}")
        
        # OHLC coverage
        coverage = await conn.fetchval(
            "SELECT COUNT(DISTINCT symbol) FROM ohlc_history"
        )
        total = await conn.fetchval("SELECT COUNT(*) FROM market_tickers")
        print(f"**OHLC Coverage:** {coverage}/{total} symbols ({coverage/total*100:.1f}%)")
        
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
