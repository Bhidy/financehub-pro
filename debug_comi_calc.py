
import asyncio
import os
import sys
# Add backend-core to path
sys.path.append(os.path.join(os.getcwd(), 'backend-core'))

from data_pipeline.market_loader import StockAnalysisClient

async def debug_comi():
    client = StockAnalysisClient()
    stocks = await client.get_egx_stocks()
    
    for s in stocks:
        if s['symbol'] == 'COMI':
            print("RAW STOCK DATA FROM API:")
            print(s)
            
            price = float(s.get('last_price') or 0)
            pct_change = float(s.get('change_percent') or 0)
            change = 0.0
            
            print(f"Price: {price}, PctChange: {pct_change}")
            
            if price != 0 and pct_change != 0:
                prev_price = price / (1 + (pct_change / 100))
                change = price - prev_price
                change = round(change, 4)
                print(f"Calculated Change: {change}")
            else:
                print("Skipped calculation (is zero)")
                
    await client.close()

if __name__ == "__main__":
    asyncio.run(debug_comi())
