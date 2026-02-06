
import asyncio
import os
import sys

# Add the current directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

from app.chat.handlers.price_handler import handle_stock_price

# Mock connection object
class MockRow:
    def __init__(self, data):
        self._data = data
    def __getitem__(self, key):
        return self._data[key]
    def get(self, key, default=None):
        return self._data.get(key, default)
    def __iter__(self):
        return iter(self._data)
    def keys(self):
        return self._data.keys()

class MockConnection:
    async def fetchrow(self, query, *args):
        print(f"Mock DB Fetch: {query[:50]}... Args: {args}")
        # Return mock data for FWRY
        return MockRow({
            'symbol': 'FWRY', 'name_en': 'Fawry', 'name_ar': 'فوري', 'market_code': 'EGX', 'currency': 'EGP',
            'last_price': 10.50, 'change': 0.50, 'change_percent': 5.0, 'volume': 1000000,
            'open_price': 10.00, 'high': 10.60, 'low': 9.90, 'prev_close': 10.00,
            'pe_ratio': 20.0, 'pb_ratio': 3.0, 'dividend_yield': 1.5, 'market_cap': 5000000000,
            'high_52w': 12.00, 'low_52w': 8.00, 'sector_name': 'Technology',
            'last_updated': datetime.now(), 'logo_url': None,
            'roe': 0.15, 'debt_equity': 0.5, 'profit_margin': 0.20
        })

from datetime import datetime

async def test_handler():
    print("Testing handle_stock_price...")
    conn = MockConnection()
    try:
        result = await handle_stock_price(conn, "FWRY", "en")
        print("Success!")
        print("Keys returned:", result.keys())
        if 'bull_case' in result:
            print("Bull Case Present")
        if 'data_card' in result:
            print("Data Card Present")
        else:
            print("Data Card MISSING")
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_handler())
