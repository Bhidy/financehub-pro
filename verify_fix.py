import asyncio
import logging
from scripts.egx_enterprise_extractor import StockAnalysisEnterpriseClient

logging.basicConfig(level=logging.INFO)

async def test():
    client = StockAnalysisEnterpriseClient()
    symbol = 'COMI'
    print(f"Fetching financials for {symbol} (Post-Patch)...")
    
    # Test Income Statement Annual
    data = client.get_financials(symbol, 'income-statement', 'annual')
    
    if data and 'data' in data and len(data['data']) > 0:
        print(f"✅ SUCCESS! Fetched {len(data['data'])} rows.")
        print(f"First Row: {data['data'][0]}")
    else:
        print(f"❌ FAILED. Data: {data}")

if __name__ == "__main__":
    asyncio.run(test())
