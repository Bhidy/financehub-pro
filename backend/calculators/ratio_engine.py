import asyncio
import asyncpg
import logging
from datetime import datetime, timedelta
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DB_DSN = os.getenv("DB_DSN", "postgresql://home@localhost/mubasher_db")

async def get_db_connection():
    return await asyncpg.connect(DB_DSN)

async def calculate_ratios(symbol, conn):
    logger.info(f"Calculating ratios for {symbol}...")
    
    # 1. Fetch Financial Statements
    stmts = await conn.fetch("""
        SELECT * FROM financial_statements 
        WHERE symbol = $1 
        ORDER BY fiscal_year DESC, period_type DESC
    """, symbol)
    
    if not stmts:
        logger.warning(f"No financials found for {symbol}")
        return

    # 2. Iterate and Calculate
    for stmt in stmts:
        try:
            # Extract Core Metrics
            revenue = float(stmt['revenue']) if stmt['revenue'] else 0
            gross_profit = float(stmt['gross_profit']) if stmt['gross_profit'] else 0
            net_income = float(stmt['net_income']) if stmt['net_income'] else 0
            total_assets = float(stmt['total_assets']) if stmt['total_assets'] else 0
            total_equity = float(stmt['total_equity']) if stmt['total_equity'] else 0
            total_liabilities = float(stmt['total_liabilities']) if stmt['total_liabilities'] else 0
            
            # Extract Raw Data for missing fields (Operating Income, Current Assets/Liab)
            # We assume JSON parsed into a dict in Python
            # raw = json.loads(stmt['raw_data']) if stmt['raw_data'] else {}
            # Note: asyncpg returns records, raw_data might be a string or dict depending on driver decoding.
            # Usually asyncpg decodes JSONB automatically.
            
            # --- Profitability ---
            gross_margin = (gross_profit / revenue * 100) if revenue else None
            net_margin = (net_income / revenue * 100) if revenue else None
            roe = (net_income / total_equity * 100) if total_equity else None
            roa = (net_income / total_assets * 100) if total_assets else None
            
            # --- Solvency ---
            debt_to_equity = (total_liabilities / total_equity) if total_equity else None
            debt_to_assets = (total_liabilities / total_assets) if total_assets else None
            
            # --- Valuation (Need Price) ---
            # Find close price on end_date
            end_date = stmt['end_date']
            
            # Fetch price on that date or previous
            price_rec = await conn.fetchrow("""
                SELECT close FROM ohlc_data 
                WHERE symbol = $1 AND date <= $2 
                ORDER BY date DESC LIMIT 1
            """, symbol, end_date)
            
            close_price = float(price_rec['close']) if price_rec else None
            
            pe_ratio = None
            ps_ratio = None
            pb_ratio = None
            
            if close_price:
                # We need Shares Outstanding to calc Per Share metrics, 
                # OR we can use Market Cap vs Net Income using (Price * Shares) / Net Income
                # But we don't have shares historical easily.
                # However, Profile often has "Shares Outstanding".
                # If we assume it's constant or we can get it from 'eps' if available?
                # PE = Price / EPS
                
                eps = float(stmt['eps']) if stmt.get('eps') else None
                
                # If EPS missing, try to calc from Net Income / Shares
                # Let's fallback to just extracting EPS from raw if not in column
                
                if eps:
                    pe_ratio = close_price / eps if eps != 0 else None
                
                # P/S = Market Cap / Revenue = (Price * Shares) / Revenue 
                #     = Price / (Revenue / Shares) = Price / SalesPerShare
                # P/B = Price / BookPerShare
                
                # We need Shares count.
                # Let's try to fetch shares from key_stats or profile if strictly static, 
                # but better to skip if unsure.
                pass
            
            # --- Insert Valid Ratios ---
            await conn.execute("""
                INSERT INTO financial_ratios (
                    symbol, fiscal_year, period_type, date,
                    gross_margin, net_margin, roe, roa,
                    debt_to_equity, debt_to_assets,
                    pe_ratio
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (symbol, fiscal_year, period_type)
                DO UPDATE SET
                    gross_margin = EXCLUDED.gross_margin,
                    net_margin = EXCLUDED.net_margin,
                    roe = EXCLUDED.roe,
                    roa = EXCLUDED.roa,
                    debt_to_equity = EXCLUDED.debt_to_equity,
                    debt_to_assets = EXCLUDED.debt_to_assets,
                    pe_ratio = EXCLUDED.pe_ratio,
                    created_at = NOW()
            """, 
            symbol, stmt['fiscal_year'], stmt['period_type'], end_date,
            gross_margin, net_margin, roe, roa,
            debt_to_equity, debt_to_assets,
            pe_ratio
            )
            
        except Exception as e:
            logger.error(f"Error calculating {symbol} {stmt['fiscal_year']}: {e}")

async def main():
    conn = await get_db_connection()
    try:
        # Get list of symbols with financials
        rows = await conn.fetch("SELECT DISTINCT symbol FROM financial_statements")
        symbols = [r['symbol'] for r in rows]
        
        logger.info(f"Form processing {len(symbols)} symbols")
        
        for sym in symbols:
            await calculate_ratios(sym, conn)
            
        logger.info("Ratio calculation complete.")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
