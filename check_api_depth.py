
import asyncio
import sys
import os
from datetime import datetime

# Add backend-core to path
sys.path.append(os.path.join(os.getcwd(), 'backend-core'))

from data_pipeline.market_loader import StockAnalysisClient

async def check_api_history_depth():
    print("Checking history depth from StockAnalysis API for COMI...")
    client = StockAnalysisClient()
    history = await client.get_stock_history('COMI')
    
    if not history:
        print("No history returned!")
    else:
        print(f"Total points returned: {len(history)}")
        # Sort just in case source isn't sorted
        sorted_hist = sorted(history, key=lambda x: x['date'])
        
        first = sorted_hist[0]
        last = sorted_hist[-1]
        
        print(f"Oldest Record: {first['date']} (Price: {first['close']})")
        print(f"Newest Record: {last['date']} (Price: {last['close']})")
        
        # Check if we have data older than 2025
        old_data = [x for x in history if x['date'].startswith('2024')]
        print(f"Records from 2024: {len(old_data)}")

    await client.close()

if __name__ == "__main__":
    asyncio.run(check_api_history_depth())
