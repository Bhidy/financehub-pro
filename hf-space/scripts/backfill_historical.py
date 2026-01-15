#!/usr/bin/env python3
"""
Enterprise Historical Data Backfill Script
==========================================
Collects 6+ years of historical data from yfinance/yahooquery
Uses NO-OVERWRITE policy: Only adds new data, never deletes existing

Usage:
    python backfill_historical.py          # Backfill all stocks
    python backfill_historical.py 2222     # Backfill single stock
"""

import asyncio
import sys
import os
from datetime import datetime
from typing import List, Optional

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import yfinance as yf
from yahooquery import Ticker as YQTicker

# Database connection
import asyncpg

DATABASE_URL = os.environ.get("DATABASE_URL", "")

class HistoricalBackfill:
    def __init__(self):
        self.pool = None
        self.stats = {
            "ohlc_records": 0,
            "valuation_records": 0,
            "financial_records": 0,
            "dividend_records": 0,
            "split_records": 0,
            "earnings_records": 0,
            "errors": []
        }
    
    async def connect(self):
        """Establish database connection"""
        self.pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=20)
        print(f"✅ Connected to database")
    
    async def close(self):
        """Close database connection"""
        if self.pool:
            await self.pool.close()
    
    async def get_all_symbols(self) -> List[str]:
        """Get all stock symbols from market_tickers"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("SELECT symbol FROM market_tickers ORDER BY symbol")
            return [row['symbol'] for row in rows]
    
    async def backfill_price_history(self, symbol: str):
        """
        Backfill OHLCV price history (6+ years)
        NO OVERWRITE: Uses ON CONFLICT DO NOTHING
        """
        try:
            yahoo_symbol = f"{symbol}.SR"
            ticker = yf.Ticker(yahoo_symbol)
            hist = ticker.history(period="max")
            
            if hist is None or len(hist) == 0:
                print(f"  ⚠️ {symbol}: No price history")
                return 0
            
            count = 0
            async with self.pool.acquire() as conn:
                for date, row in hist.iterrows():
                    try:
                        await conn.execute("""
                            INSERT INTO ohlc_data (symbol, date, open, high, low, close, volume)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                            ON CONFLICT (symbol, date) DO NOTHING
                        """, symbol, 
                            date.date() if hasattr(date, 'date') else date,
                            float(row['Open']) if row['Open'] else None,
                            float(row['High']) if row['High'] else None,
                            float(row['Low']) if row['Low'] else None,
                            float(row['Close']) if row['Close'] else None,
                            int(row['Volume']) if row['Volume'] else 0
                        )
                        count += 1
                    except Exception as e:
                        pass  # Skip individual record errors
            
            self.stats["ohlc_records"] += count
            print(f"  📊 {symbol}: {count} OHLC records")
            return count
            
        except Exception as e:
            self.stats["errors"].append(f"{symbol} OHLC: {str(e)[:50]}")
            return 0
    
    async def backfill_dividends(self, symbol: str):
        """Backfill dividend history - NO OVERWRITE"""
        try:
            yahoo_symbol = f"{symbol}.SR"
            ticker = yf.Ticker(yahoo_symbol)
            divs = ticker.dividends
            
            if divs is None or len(divs) == 0:
                return 0
            
            count = 0
            async with self.pool.acquire() as conn:
                for date, amount in divs.items():
                    try:
                        await conn.execute("""
                            INSERT INTO dividend_history (symbol, ex_date, dividend_amount)
                            VALUES ($1, $2, $3)
                            ON CONFLICT (symbol, ex_date) DO NOTHING
                        """, symbol, date.date() if hasattr(date, 'date') else date, float(amount))
                        count += 1
                    except:
                        pass
            
            self.stats["dividend_records"] += count
            if count > 0:
                print(f"  💰 {symbol}: {count} dividend records")
            return count
            
        except Exception as e:
            return 0
    
    async def backfill_splits(self, symbol: str):
        """Backfill stock split history - NO OVERWRITE"""
        try:
            yahoo_symbol = f"{symbol}.SR"
            ticker = yf.Ticker(yahoo_symbol)
            splits = ticker.splits
            
            if splits is None or len(splits) == 0:
                return 0
            
            count = 0
            async with self.pool.acquire() as conn:
                for date, ratio in splits.items():
                    try:
                        await conn.execute("""
                            INSERT INTO split_history (symbol, split_date, split_ratio)
                            VALUES ($1, $2, $3)
                            ON CONFLICT (symbol, split_date) DO NOTHING
                        """, symbol, date.date() if hasattr(date, 'date') else date, float(ratio))
                        count += 1
                    except:
                        pass
            
            self.stats["split_records"] += count
            return count
            
        except Exception as e:
            return 0
    
    async def backfill_valuation_history(self, symbol: str):
        """Backfill valuation metrics history using yahooquery - NO OVERWRITE"""
        try:
            yahoo_symbol = f"{symbol}.SR"
            yq = YQTicker(yahoo_symbol)
            val = yq.valuation_measures
            
            if not hasattr(val, 'iterrows') or len(val) == 0:
                return 0
            
            count = 0
            async with self.pool.acquire() as conn:
                for _, row in val.iterrows():
                    try:
                        as_of_date = row.get('asOfDate')
                        if as_of_date is None:
                            continue
                        
                        await conn.execute("""
                            INSERT INTO valuation_history 
                            (symbol, as_of_date, pe_ratio, pb_ratio, ps_ratio, 
                             ev_ebitda, market_cap, enterprise_value, forward_pe)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                            ON CONFLICT (symbol, as_of_date) DO NOTHING
                        """, symbol, 
                            as_of_date.date() if hasattr(as_of_date, 'date') else as_of_date,
                            float(row.get('PeRatio')) if row.get('PeRatio') else None,
                            float(row.get('PbRatio')) if row.get('PbRatio') else None,
                            float(row.get('PsRatio')) if row.get('PsRatio') else None,
                            float(row.get('EnterprisesValueEBITDARatio')) if row.get('EnterprisesValueEBITDARatio') else None,
                            int(row.get('MarketCap')) if row.get('MarketCap') else None,
                            int(row.get('EnterpriseValue')) if row.get('EnterpriseValue') else None,
                            float(row.get('ForwardPeRatio')) if row.get('ForwardPeRatio') else None
                        )
                        count += 1
                    except:
                        pass
            
            self.stats["valuation_records"] += count
            if count > 0:
                print(f"  📈 {symbol}: {count} valuation records")
            return count
            
        except Exception as e:
            return 0
    
    async def backfill_financials(self, symbol: str):
        """Backfill financial statement history using yahooquery - NO OVERWRITE"""
        try:
            import json
            yahoo_symbol = f"{symbol}.SR"
            yq = YQTicker(yahoo_symbol)
            
            # Get all financial data
            all_fin = yq.all_financial_data()
            
            if not hasattr(all_fin, 'iterrows') or len(all_fin) == 0:
                return 0
            
            count = 0
            async with self.pool.acquire() as conn:
                for _, row in all_fin.iterrows():
                    try:
                        as_of_date = row.get('asOfDate')
                        if as_of_date is None:
                            continue
                        
                        period_type = row.get('periodType', 'annual')
                        
                        await conn.execute("""
                            INSERT INTO financial_history 
                            (symbol, period_type, as_of_date, total_revenue, net_income, 
                             gross_profit, operating_income, ebitda, total_assets, 
                             total_liabilities, total_equity, free_cash_flow, eps, raw_data)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                            ON CONFLICT (symbol, period_type, as_of_date) DO NOTHING
                        """, symbol, period_type,
                            as_of_date.date() if hasattr(as_of_date, 'date') else as_of_date,
                            int(row.get('TotalRevenue')) if row.get('TotalRevenue') else None,
                            int(row.get('NetIncome')) if row.get('NetIncome') else None,
                            int(row.get('GrossProfit')) if row.get('GrossProfit') else None,
                            int(row.get('OperatingIncome')) if row.get('OperatingIncome') else None,
                            int(row.get('EBITDA')) if row.get('EBITDA') else None,
                            int(row.get('TotalAssets')) if row.get('TotalAssets') else None,
                            int(row.get('TotalLiabilitiesNetMinorityInterest')) if row.get('TotalLiabilitiesNetMinorityInterest') else None,
                            int(row.get('StockholdersEquity')) if row.get('StockholdersEquity') else None,
                            int(row.get('FreeCashFlow')) if row.get('FreeCashFlow') else None,
                            float(row.get('BasicEPS')) if row.get('BasicEPS') else None,
                            json.dumps(row.to_dict(), default=str)
                        )
                        count += 1
                    except:
                        pass
            
            self.stats["financial_records"] += count
            if count > 0:
                print(f"  📋 {symbol}: {count} financial records")
            return count
            
        except Exception as e:
            return 0
    
    async def backfill_earnings(self, symbol: str):
        """Backfill earnings history - NO OVERWRITE"""
        try:
            yahoo_symbol = f"{symbol}.SR"
            ticker = yf.Ticker(yahoo_symbol)
            earnings = ticker.earnings_dates
            
            if earnings is None or len(earnings) == 0:
                return 0
            
            count = 0
            async with self.pool.acquire() as conn:
                for date, row in earnings.iterrows():
                    try:
                        await conn.execute("""
                            INSERT INTO earnings_history 
                            (symbol, earnings_date, eps_estimate, eps_actual, surprise_percent)
                            VALUES ($1, $2, $3, $4, $5)
                            ON CONFLICT (symbol, earnings_date) DO NOTHING
                        """, symbol, date,
                            float(row.get('EPS Estimate')) if row.get('EPS Estimate') else None,
                            float(row.get('Reported EPS')) if row.get('Reported EPS') else None,
                            float(row.get('Surprise(%)')) if row.get('Surprise(%)') else None
                        )
                        count += 1
                    except:
                        pass
            
            self.stats["earnings_records"] += count
            return count
            
        except Exception as e:
            return 0
    
    async def backfill_symbol(self, symbol: str):
        """Run all backfill operations for a single symbol"""
        print(f"\n📥 Backfilling {symbol}...")
        
        await self.backfill_price_history(symbol)
        await self.backfill_dividends(symbol)
        await self.backfill_splits(symbol)
        await self.backfill_valuation_history(symbol)
        await self.backfill_financials(symbol)
        await self.backfill_earnings(symbol)
        
        # Rate limiting
        await asyncio.sleep(1)
    
    async def run(self, symbol: Optional[str] = None):
        """Run the full backfill process"""
        print("=" * 60)
        print("ENTERPRISE HISTORICAL DATA BACKFILL")
        print("=" * 60)
        print(f"Started: {datetime.now().isoformat()}")
        print("Policy: NO OVERWRITE (existing data preserved)")
        print()
        
        await self.connect()
        
        if symbol:
            symbols = [symbol]
        else:
            symbols = await self.get_all_symbols()
        
        print(f"Processing {len(symbols)} symbols...")
        
        for i, sym in enumerate(symbols, 1):
            print(f"\n[{i}/{len(symbols)}]", end="")
            await self.backfill_symbol(sym)
        
        await self.close()
        
        # Print summary
        print("\n" + "=" * 60)
        print("BACKFILL COMPLETE")
        print("=" * 60)
        print(f"OHLC Records: {self.stats['ohlc_records']:,}")
        print(f"Valuation Records: {self.stats['valuation_records']:,}")
        print(f"Financial Records: {self.stats['financial_records']:,}")
        print(f"Dividend Records: {self.stats['dividend_records']:,}")
        print(f"Split Records: {self.stats['split_records']:,}")
        print(f"Earnings Records: {self.stats['earnings_records']:,}")
        total = sum([
            self.stats['ohlc_records'],
            self.stats['valuation_records'],
            self.stats['financial_records'],
            self.stats['dividend_records'],
            self.stats['split_records'],
            self.stats['earnings_records']
        ])
        print(f"\nTOTAL RECORDS: {total:,}")
        
        if self.stats['errors']:
            print(f"\nErrors: {len(self.stats['errors'])}")
            for err in self.stats['errors'][:5]:
                print(f"  - {err}")


if __name__ == "__main__":
    symbol = sys.argv[1] if len(sys.argv) > 1 else None
    
    backfill = HistoricalBackfill()
    asyncio.run(backfill.run(symbol))
