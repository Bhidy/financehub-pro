
import asyncio
import sys
import os

# Mock DB connection since we only test the client
class MockDB:
    async def fetchval(self, *args): return None
    async def execute(self, *args): return None

sys.path.append(os.getcwd())
try:
    from hf_space.data_pipeline.market_loader import StockAnalysisClient
except ImportError:
    # Try local import style if running in subdir
    sys.path.append('hf-space')
    from data_pipeline.market_loader import StockAnalysisClient

async def test_screener():
    print("Testing StockAnalysis Screener Fetch...")
    client = StockAnalysisClient()
    stocks = await client.get_egx_stocks()
    print(f"Symbols found: {len(stocks)}")
    if len(stocks) > 0:
        print(f"First symbol: {stocks[0]}")
    await client.close()

if __name__ == "__main__":
    asyncio.run(test_screener())
