import asyncio
import asyncpg
import sys
import os
import logging
from datetime import datetime
import json

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.extractors.egx_loader import EGXExtractor

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("load_egx.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL') or 'postgresql://home@localhost:5432/mubasher_db'

async def main():
    logger.info("Starting EGX Data Load...")
    extractor = EGXExtractor()
    
    # Connect to DB
    conn = await asyncpg.connect(DATABASE_URL)
    
    # 1. Fetch Tickers
    tickers = extractor.get_all_tickers()
    logger.info(f"Fetched {len(tickers)} tickers from Source")
    
    if not tickers:
        logger.error("No tickers found. Aborting.")
        return

    # 2. Upsert Tickers
    logger.info("Updating Market Tickers...")
    for t in tickers:
        await conn.execute("""
            INSERT INTO market_tickers (symbol, name_en, sector_name, market_code, currency, last_updated)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (symbol) DO UPDATE SET
                name_en = EXCLUDED.name_en,
                sector_name = EXCLUDED.sector_name,
                market_code = EXCLUDED.market_code,
                currency = EXCLUDED.currency,
                last_updated = NOW();
        """, t['symbol'], t['name_en'], t['sector_name'], t['market_code'], t['currency'])
        
    # 3. Deep Dive Loop
    logger.info("Starting Deep Data Extraction...")
    
    for i, t in enumerate(tickers):
        symbol = t['symbol']
        try:
            logger.info(f"[{i+1}/{len(tickers)}] Processing {symbol}...")
            
            # A. Profile
            profile = extractor.get_company_profile(symbol)
            if profile:
                logger.info(f"  - Profile: Found data")
                await conn.execute("""
                    INSERT INTO company_profiles (symbol, description, website, industry, sector, employees, last_updated)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW())
                    ON CONFLICT (symbol) DO UPDATE SET
                        description = EXCLUDED.description,
                        website = EXCLUDED.website,
                        industry = EXCLUDED.industry,
                        sector = EXCLUDED.sector,
                        employees = EXCLUDED.employees,
                        last_updated = NOW();
                """, symbol, profile.get('description'), profile.get('website'), 
                   profile.get('industry'), profile.get('sector'), profile.get('employees'))
            
            # B. Financials (Annual)
            financials = extractor.get_financials(symbol, period='annual')
            if financials:
                logger.info(f"  - Financials: Found {len(financials)} years")
                for f in financials:
                    await conn.execute("""
                        INSERT INTO financial_statements (
                            symbol, period_type, fiscal_year, end_date, 
                            revenue, net_income, gross_profit, operating_income, eps, raw_data, created_at
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                        ON CONFLICT (symbol, fiscal_year, period_type) DO UPDATE SET
                            revenue = EXCLUDED.revenue,
                            net_income = EXCLUDED.net_income,
                            gross_profit = EXCLUDED.gross_profit,
                            operating_income = EXCLUDED.operating_income,
                            eps = EXCLUDED.eps,
                            raw_data = EXCLUDED.raw_data,
                            end_date = EXCLUDED.end_date;
                    """, f['symbol'], f['period_type'], f['fiscal_year'], 
                       datetime.strptime(f['end_date'], '%Y-%m-%d').date() if f['end_date'] else None,
                       f['revenue'], f['net_income'], f['gross_profit'], f['operating_income'], f['eps'],
                       json.dumps(f['raw_data']))

            # C. Dividends
            divs = extractor.get_dividends(symbol)
            if divs:
                logger.info(f"  - Dividends: Found {len(divs)} records")
                for d in divs:
                    if not d['ex_date']: continue
                    await conn.execute("""
                        INSERT INTO dividend_history (symbol, ex_date, payment_date, amount, created_at)
                        VALUES ($1, $2, $3, $4, NOW())
                        ON CONFLICT (symbol, ex_date) DO UPDATE SET
                            amount = EXCLUDED.amount,
                            payment_date = EXCLUDED.payment_date;
                    """, d['symbol'], datetime.strptime(d['ex_date'], '%Y-%m-%d').date(), 
                       datetime.strptime(d['payment_date'], '%Y-%m-%d').date(), d['amount'])

            # D. Statistics (Ratios)
            stats = extractor.get_statistics(symbol)
            if stats:
                logger.info(f"  - Stats: Found {len(stats)} metrics")
                # Map keys carefully. For now, dumb mapping or specific keys.
                # Assuming current FY (0)
                # We need to extend the table or mapping logic here.
                # For brevity, let's skip complex ratio map in this initial script 
                # and focus on what we have in schema: PE, EPS, etc.
                pass

        except Exception as e:
            logger.error(f"Error processing {symbol}: {e}")
            
        # Respect rate limits
        await asyncio.sleep(1)

    await conn.close()
    logger.info("EGX Data Load Complete.")

if __name__ == "__main__":
    asyncio.run(main())
