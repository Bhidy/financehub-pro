
import asyncio
import sys
import os
from datetime import datetime

# Adjust path to import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.chat.handlers import price_handler, chart_handler, financials_handler, dividends_handler

# Mock asyncpg connection and record
class MockRecord(dict):
    def __init__(self, data):
        super().__init__(data)
        self.__dict__.update(data)
    
    def get(self, key, default=None):
        return super().get(key, default)

class MockConnection:
    async def fetchrow(self, query, *args):
        # Mock responses based on query content or args
        if "market_tickers" in query:
            return MockRecord({
                'name_en': 'Commercial International Bank',
                'name_ar': 'البنك التجاري الدولي', 
                'market_code': 'EGX',
                'currency': 'EGP',
                'last_price': 85.50,
                'change': 1.5,
                'change_percent': 1.75,
                'volume': 1000000,
                'open_price': 84.0,
                'high': 86.0,
                'low': 84.0,
                'prev_close': 84.0,
                'pe_ratio': 10.5,
                'pb_ratio': 1.2,
                'dividend_yield': 3.5,
                'market_cap': 1000000000,
                'high_52w': 90.0,
                'low_52w': 70.0,
                'sector_name': 'Banks',
                'last_updated': datetime.now()
            })
        if "financial_ratios_history" in query:
             return MockRecord({'fiscal_year': 2023, 'gross_margin': 0.5, 'operating_margin': 0.3, 'net_margin': 0.2})
        return None

    async def fetch(self, query, *args):
        # Mock responses for lists
        if "ohlc_data" in query:
             return [MockRecord({'date': datetime.now(), 'open': 10, 'high': 11, 'low': 9, 'close': 10.5, 'volume': 1000})]
        if "income_statements" in query:
             return [MockRecord({'fiscal_year': 2023, 'revenue': 1000, 'net_income': 100})]
        if "dividend_history" in query:
             return [MockRecord({'ex_date': datetime.now().date(), 'dividend_amount': 1.5})]
        return []

async def test_handlers():
    conn = MockConnection()
    symbol = "COMI"
    
    print("--- Testing Price Handler ---")
    try:
        res = await price_handler.handle_stock_price(conn, symbol)
        actions = res.get('actions', [])
        labels = [a['label'] for a in actions]
        print(f"Actions: {labels}")
        
        if "🔗 Full Profile" in labels:
            print("❌ FAILURE: 'Full Profile' found in price actions!")
        elif "👥 Shareholders" in labels and "💰 Financials" in labels:
            print("✅ SUCCESS: Price actions look correct (Egypt suggestions present).")
        else:
            print(f"⚠️ WARNING: Unexpected actions in price handler: {labels}")
            
    except Exception as e:
        print(f"❌ ERROR in Price Handler: {e}")

    print("\n--- Testing Chart Handler ---")
    try:
        res = await chart_handler.handle_stock_chart(conn, symbol)
        actions = res.get('actions', [])
        labels = [a['label'] for a in actions]
        print(f"Actions: {labels}")
        
        if "👥 Shareholders" in labels:
            print("✅ SUCCESS: Chart actions include Egypt suggestions.")
        else:
            print(f"❌ FAILURE: Chart actions missing Egypt suggestions: {labels}")

    except Exception as e:
        print(f"❌ ERROR in Chart Handler: {e}")
        import traceback
        traceback.print_exc()

    print("\n--- Testing Financials Handler ---")
    try:
        res = await financials_handler.handle_revenue_trend(conn, symbol)
        actions = res.get('actions', [])
        labels = [a['label'] for a in actions]
        print(f"Actions: {labels}")
        
        if "👥 Shareholders" in labels:
             print("✅ SUCCESS: Revenue Trend actions include Egypt suggestions.")
        else:
             print(f"❌ FAILURE: Revenue Trend actions missing Egypt suggestions: {labels}")
             
    except Exception as e:
        print(f"❌ ERROR in Financials Handler: {e}")
        import traceback
        traceback.print_exc()

    print("\n--- Testing Dividends Handler ---")
    try:
        res = await dividends_handler.handle_dividends(conn, symbol)
        actions = res.get('actions', [])
        labels = [a['label'] for a in actions]
        print(f"Actions: {labels}")
        
        # We expect Profile link to be replaced or specific Egypt ones present
        if "👥 Shareholders" in labels:
            print("✅ SUCCESS: Dividend actions include Egypt suggestions.")
        else:
            print(f"❌ FAILURE: Dividend actions missing Egypt suggestions: {labels}")
            
    except Exception as e:
        print(f"❌ ERROR in Dividends Handler: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_handlers())
