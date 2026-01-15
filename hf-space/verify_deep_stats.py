
import asyncio
from app.db.session import db

async def main():
    await db.connect()
    print("Checking Deep Stats Saturation (EGX)...")
    
    # Check counts of non-null for critical fields
    stats = await db.fetch_one("""
        SELECT 
            COUNT(*) as total,
            COUNT(enterprise_value) as ev_count,
            COUNT(roe) as roe_count,
            COUNT(gross_margin) as margin_count,
            COUNT(beta_5y) as beta_count,
            COUNT(revenue_ttm) as rev_count,
            COUNT(net_income_ttm) as ni_count
        FROM stock_statistics s
        JOIN market_tickers m ON s.symbol = m.symbol
        WHERE m.market_code = 'EGX'
    """)
    
    # Profile counts
    prof = await db.fetch_one("""
        SELECT 
            COUNT(officers) as officers_count,
            COUNT(website) as web_count,
            COUNT(phone) as phone_count
        FROM company_profiles p
        JOIN market_tickers m ON p.symbol = m.symbol
        WHERE m.market_code = 'EGX'
    """)
    
    total = stats['total']
    if total == 0: total = 1 # Avoid div zero
    
    print(f"Total Stocks: {stats['total']}")
    print(f"--- Valuation ---")
    print(f"Enterprise Value: {stats['ev_count']} ({(stats['ev_count']/total)*100:.1f}%)")
    print(f"--- Profitability ---")
    print(f"ROE: {stats['roe_count']} ({(stats['roe_count']/total)*100:.1f}%)")
    print(f"Gross Margin: {stats['margin_count']} ({(stats['margin_count']/total)*100:.1f}%)")
    print(f"--- Financials (TTM) ---")
    print(f"Revenue: {stats['rev_count']} ({(stats['rev_count']/total)*100:.1f}%)")
    print(f"Net Income: {stats['ni_count']} ({(stats['ni_count']/total)*100:.1f}%)")
    
    # Phase 5 Check
    p5 = await db.fetch_one("""
        SELECT 
            COUNT(altman_z_score) as z_count,
            COUNT(piotroski_f_score) as f_count,
            COUNT(ev_ebit) as ev_ebit_count
        FROM stock_statistics s
        JOIN market_tickers m ON s.symbol = m.symbol
        WHERE m.market_code = 'EGX'
    """)
    print(f"--- Phase 5 (Advanced) ---")
    print(f"Altman Z-Score: {p5['z_count']} ({(p5['z_count']/total)*100:.1f}%)")
    print(f"Piotroski F-Score: {p5['f_count']} ({(p5['f_count']/total)*100:.1f}%)")
    print(f"EV / EBIT: {p5['ev_ebit_count']} ({(p5['ev_ebit_count']/total)*100:.1f}%)")

    # Phase 6 Check
    p6 = await db.fetch_one("""
        SELECT 
            COUNT(p_ocf) as pocf,
            COUNT(roce) as roce,
            COUNT(asset_turnover) as ast,
            COUNT(earnings_yield) as ey
        FROM stock_statistics s
        JOIN market_tickers m ON s.symbol = m.symbol
        WHERE m.market_code = 'EGX'
    """)
    print(f"--- Phase 6 (Hidden Gems) ---")
    print(f"P/OCF: {p6['pocf']} ({(p6['pocf']/total)*100:.1f}%)")
    print(f"ROCE: {p6['roce']} ({(p6['roce']/total)*100:.1f}%)")
    print(f"Asset Turnover: {p6['ast']} ({(p6['ast']/total)*100:.1f}%)")
    print(f"Earnings Yield: {p6['ey']} ({(p6['ey']/total)*100:.1f}%)")

    print(f"--- Technicals ---")
    print(f"Beta (5Y): {stats['beta_count']} ({(stats['beta_count']/total)*100:.1f}%)")
    print(f"--- Profile ---")
    print(f"Officers: {prof['officers_count']} ({(prof['officers_count']/total)*100:.1f}%)")
    print(f"Website: {prof['web_count']} ({(prof['web_count']/total)*100:.1f}%)")

    # Sample
    print("\nSample (COMI):")
    row = await db.fetch_one("""
        SELECT enterprise_value, roe, gross_margin, revenue_ttm, beta_5y
        FROM stock_statistics WHERE symbol='COMI'
    """)
    print(row)
    
    row_prof = await db.fetch_one("""
        SELECT website, phone, officers
        FROM company_profiles WHERE symbol='COMI'
    """)
    print(f"Website: {row_prof['website']}, Officers: {row_prof['officers'][:50]}...")

    await db.close()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
