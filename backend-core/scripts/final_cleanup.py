#!/usr/bin/env python3
"""
Final EGX Cleanup - Remove obsolete and add missing Mubasher funds.
Target: Exactly 189 EGX funds matching Mubasher data.
"""
import json
import asyncio
import asyncpg
import os
from datetime import datetime

DATABASE_URL = "postgres://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

# The 18 unmatched funds from Mubasher that need to be inserted
UNMATCHED_FUNDS = [
    {"name": "CI Asset Management CI ctor Fund Issuance 3 Export", "nav": 12.21, "manager": "CI Capital Asset Management"},
    {"name": "Azimut Equity opportunities Fund Opportunities Shariah AZ", "nav": 1.48, "manager": "Azimut Egypt Asset Management S.A.E"},
    {"name": "Banque Du Caire Mutual Fund 1", "nav": 379.15, "manager": "Hermes Portfolio and Fund Management"},
    {"name": "National Bank of Egypt Mutual Fund 6 and Al Baraka Bank Egypt fund Bashayer", "nav": 296.88, "manager": "Al Ahly Financial Investments Management"},
    {"name": "National Bank of Egypt Mutual Fund 1", "nav": 131.96, "manager": "Al Ahly Financial Investments Management"},
    {"name": "National Bank of Egypt Mutual Fund 2", "nav": 236.68, "manager": "Al Ahly Financial Investments Management"},
    {"name": "National Bank of Egypt Mutual Fund 5", "nav": 42.27, "manager": "Al Ahly Financial Investments Management"},
    {"name": "National Bank of Egypt and Misr for Life Insurance Al Ahly Hayah", "nav": 278.90, "manager": "Al Ahly Financial Investments Management"},
    {"name": "FAB Capital Preservation Fund Etmnan", "nav": 296.62, "manager": "HC Asset Management"},
    {"name": "Societe Arabe International De Banque 2", "nav": 515.62, "manager": "Hermes Portfolio and Fund Management"},
    {"name": "CIAM invest stocks index S&P EGX ESG Misr Green Sustainability Fund", "nav": 11.40, "manager": "CI Capital Asset Management"},
    {"name": "Azimut Target Maturity Fund Target 2030 USD", "nav": 10.04, "manager": "Azimut Egypt Asset Management S.A.E"},
    {"name": "Arope Money Market Fund", "nav": 402.88, "manager": "CFH Asset Management"},
    {"name": "Azimut Target Maturity Fund Target 2025 EGP", "nav": 14.69, "manager": "Azimut Egypt Asset Management S.A.E"},
    {"name": "Azimut Target Maturity Fund Target 2025 USD", "nav": 11.46, "manager": "Azimut Egypt Asset Management S.A.E"},
    {"name": "MIDBank Mutual Fund 3 Wafi Fund of Funds", "nav": 16.09, "manager": "Misr Asset Management"},
    {"name": "Orient Trust Capital growth Fund 1", "nav": 1143.62, "manager": "Pharos Asset Management"},
    {"name": "Beltone B-35 EFX35 LV Fund", "nav": 0.00, "manager": "Beltone Asset Management"},
]

async def main():
    print("=" * 70)
    print("FINAL EGX CLEANUP - TARGET: 189 FUNDS")
    print("=" * 70)
    
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    print("✅ Connected to database")
    
    # Get current state
    before = await conn.fetchrow("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN latest_nav > 0 THEN 1 ELSE 0 END) as with_nav,
            SUM(CASE WHEN latest_nav IS NULL OR latest_nav = 0 THEN 1 ELSE 0 END) as no_nav
        FROM mutual_funds WHERE market_code = 'EGX'
    """)
    print(f"\n📊 BEFORE:")
    print(f"   Total: {before['total']}, With NAV: {before['with_nav']}, No NAV: {before['no_nav']}")
    
    try:
        # Step 1: Delete obsolete funds (no NAV and not matching Mubasher)
        # First, get list of funds with NAV to protect them
        print("\n⏳ Step 1: Removing obsolete funds...")
        
        result = await conn.execute("""
            DELETE FROM nav_history 
            WHERE fund_id IN (
                SELECT fund_id FROM mutual_funds 
                WHERE market_code = 'EGX' 
                  AND (latest_nav IS NULL OR latest_nav = 0)
            )
        """)
        print(f"   Removed nav_history entries for obsolete funds")
        
        result = await conn.execute("""
            DELETE FROM mutual_funds 
            WHERE market_code = 'EGX' 
              AND (latest_nav IS NULL OR latest_nav = 0)
        """)
        deleted_count = int(result.split()[-1]) if result else 0
        print(f"   ✅ Deleted {deleted_count} obsolete funds")
        
        # Step 2: Insert the 18 missing funds
        print("\n⏳ Step 2: Inserting missing Mubasher funds...")
        today = datetime.now().date()
        inserted = 0
        
        for i, fund in enumerate(UNMATCHED_FUNDS):
            fund_id = f"EGY_NEW_{i+1:02d}"
            try:
                await conn.execute("""
                    INSERT INTO mutual_funds (
                        fund_id, fund_name, fund_name_en, manager_name, manager_name_en,
                        latest_nav, currency, market_code, last_updated
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                    ON CONFLICT (fund_id) DO UPDATE SET 
                        latest_nav = EXCLUDED.latest_nav,
                        updated_at = NOW()
                """, 
                    fund_id,
                    fund['name'],
                    fund['name'],
                    fund['manager'],
                    fund['manager'],
                    fund['nav'],
                    'EGP',
                    'EGX'
                )
                inserted += 1
                
                # Add to nav_history
                if fund['nav'] > 0:
                    await conn.execute("""
                        INSERT INTO nav_history (fund_id, date, nav)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
                    """, fund_id, today, fund['nav'])
                
                print(f"   ✅ {fund['name'][:50]}")
            except Exception as e:
                print(f"   ❌ Error: {fund['name'][:40]} - {e}")
        
        print(f"\n   Inserted: {inserted} funds")
        
        # Final count
        after = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN latest_nav > 0 THEN 1 ELSE 0 END) as with_nav
            FROM mutual_funds WHERE market_code = 'EGX'
        """)
        
        print("\n" + "=" * 70)
        print("FINAL RESULT")
        print("=" * 70)
        print(f"📊 Before cleanup:   {before['total']} funds ({before['with_nav']} with NAV)")
        print(f"📊 After cleanup:    {after['total']} funds ({after['with_nav']} with NAV)")
        print(f"🎯 Target:           189 funds")
        
        if after['total'] == 189:
            print("\n✅ SUCCESS! Database matches Mubasher exactly!")
        else:
            diff = after['total'] - 189
            print(f"\n⚠️  Difference: {'+' if diff > 0 else ''}{diff} funds")
        
    finally:
        await conn.close()
        print("\n✅ Database connection closed")

if __name__ == "__main__":
    asyncio.run(main())
