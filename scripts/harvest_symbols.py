import asyncio
import asyncpg
import os
from yahooquery import Ticker
import pandas as pd

DB_URL = os.getenv("DATABASE_URL", "postgresql://home@localhost:5432/mubasher_db")

async def main():
    print(f"🕵️‍♂️ Starting Symbol Mapper...")
    conn = await asyncpg.connect(DB_URL)
    
    rows = await conn.fetch("SELECT isin FROM yahoo_universe WHERE symbol IS NULL")
    print(f"📚 {len(rows)} stocks need symbol mapping.")
    
    for r in rows:
        isin_ticker = r['isin'] # e.g. EGS69082C013.CA
        
        try:
            # Query Yahoo for metadata
            t = Ticker(isin_ticker, asynchronous=False)
            data = t.price
            
            if isinstance(data, dict) and isin_ticker in data:
                info = data[isin_ticker]
                real_symbol = info.get('symbol')
                
                if real_symbol and real_symbol != isin_ticker:
                    print(f"✅ Mapped {isin_ticker} -> {real_symbol}")
                    await conn.execute("UPDATE yahoo_universe SET symbol = $1 WHERE isin = $2", real_symbol, isin_ticker)
                elif real_symbol == isin_ticker:
                    # Sometimes the ISIN is the only symbol. Try quoteType
                    qtype = t.quote_type
                    if isin_ticker in qtype:
                        sym = qtype[isin_ticker].get('symbol')
                        if sym and sym != isin_ticker:
                            print(f"✅ Mapped (QuoteType) {isin_ticker} -> {sym}")
                            await conn.execute("UPDATE yahoo_universe SET symbol = $1 WHERE isin = $2", sym, isin_ticker)
                        else:
                             print(f"⚠️ No better symbol for {isin_ticker}")
                             # Set it to ISIN so we don't retry forever, or leave null? 
                             # Set to ISIN for now to allow historian to try
                             await conn.execute("UPDATE yahoo_universe SET symbol = $1 WHERE isin = $2", isin_ticker, isin_ticker)
            else:
                print(f"❌ No data for {isin_ticker}")
                
        except Exception as e:
            print(f"❌ Error {isin_ticker}: {e}")
            
    print("🎉 Symbol Mapping Complete.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
