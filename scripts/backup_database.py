#!/usr/bin/env python3
"""
Database Backup Script
======================
Exports all database tables to JSON files for backup.
Used by weekly backup workflow.
"""

import asyncio
import asyncpg
import os
import json
import argparse
from datetime import datetime
from pathlib import Path

DATABASE_URL = os.environ.get('DATABASE_URL')


async def backup_table(conn, table_name: str, output_dir: Path):
    """Export a single table to JSON"""
    print(f"  Backing up {table_name}...")
    
    try:
        # Get all rows
        rows = await conn.fetch(f'SELECT * FROM {table_name}')
        
        # Convert to JSON-serializable format
        data = []
        for row in rows:
            record = dict(row)
            # Convert datetime fields to ISO format
            for key, value in record.items():
                if isinstance(value, datetime):
                    record[key] = value.isoformat()
            data.append(record)
        
        # Write to file
        output_file = output_dir / f"{table_name}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, default=str)
        
        print(f"    ✅ {table_name}: {len(data):,} records")
        return len(data)
        
    except Exception as e:
        print(f"    ❌ {table_name}: Error - {e}")
        return 0


async def main():
    parser = argparse.ArgumentParser(description='Backup database to JSON')
    parser.add_argument('--format', choices=['json', 'csv'], default='json')
    parser.add_argument('--output', type=str, default='backups/')
    parser.add_argument('--tables', nargs='*', help='Specific tables to backup')
    args = parser.parse_args()
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL not set")
        exit(1)
    
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("    DATABASE BACKUP - Starting")
    print(f"    Output: {output_dir}")
    print("=" * 60)
    print()
    
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    try:
        # Get list of tables to backup
        if args.tables:
            tables = args.tables
        else:
            # Priority order - most important tables first
            tables = [
                'ohlc_history',
                'nav_history',
                'market_tickers',
                'mutual_funds',
                'financial_statements',
                'corporate_actions',
                'earnings_calendar',
                'major_shareholders',
                'economic_indicators',
                'insider_transactions',
                'financial_ratios',
                'analyst_ratings',
                'fair_values',
                'market_news',
                'market_breadth',
                'index_constituents',
            ]
        
        total_records = 0
        for table in tables:
            records = await backup_table(conn, table, output_dir)
            total_records += records
        
        # Create metadata file
        metadata = {
            'backup_date': datetime.utcnow().isoformat(),
            'tables': tables,
            'total_records': total_records,
            'database': 'financehub_pro'
        }
        
        with open(output_dir / 'backup_metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print()
        print("=" * 60)
        print(f"✅ BACKUP COMPLETE")
        print(f"   Total Records: {total_records:,}")
        print(f"   Output Directory: {output_dir}")
        print("=" * 60)
        
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
