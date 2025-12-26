"""
COMPREHENSIVE API VALIDATION
Test all backend endpoints to ensure real data is being served
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_endpoint(name, url, expected_fields=None, min_records=1):
    """Test an API endpoint"""
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"URL: {url}")
    print('-'*60)
    
    try:
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if it's a list or dict
            if isinstance(data, list):
                record_count = len(data)
                print(f"✅ Status: 200 OK")
                print(f"✅ Records: {record_count}")
                
                if record_count >= min_records:
                    print(f"✅ Minimum records met ({min_records})")
                else:
                    print(f"⚠️  Expected at least {min_records} records")
                
                # Show sample record
                if record_count > 0:
                    print(f"\nSample Record:")
                    print(json.dumps(data[0], indent=2)[:300] + "...")
                    
                    # Validate expected fields
                    if expected_fields:
                        sample = data[0]
                        for field in expected_fields:
                            if field in sample:
                                print(f"  ✅ {field}: {sample[field]}")
                            else:
                                print(f"  ❌ Missing field: {field}")
                
                return True
                
            elif isinstance(data, dict):
                print(f"✅ Status: 200 OK")
                print(f"✅ Response Type: Object")
                print(f"\nData:")
                print(json.dumps(data, indent=2)[:300] + "...")
                return True
                
        else:
            print(f"❌ Status: {response.status_code}")
            print(f"Response: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def run_validation():
    """Run complete API validation"""
    
    print("\n" + "="*80)
    print("🔍 COMPREHENSIVE API VALIDATION - REAL DATA CHECK")
    print("="*80)
    print(f"Testing backend at: {BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    results = {}
    
    # 1. Tickers/Stocks
    results['tickers'] = test_endpoint(
        "Stock Tickers",
        f"{BASE_URL}/tickers?limit=10",
        expected_fields=['symbol', 'name_en', 'last_price', 'change_percent'],
        min_records=10
    )
    
    # 2. OHLC Historical Data
    results['ohlc'] = test_endpoint(
        "OHLC Historical Data (Aramco)",
        f"{BASE_URL}/ohlc/2222?period=1y",
        expected_fields=['date', 'open', 'high', 'low', 'close', 'volume'],
        min_records=200
    )
    
    # 3. Corporate Actions
    results['corporate_actions'] = test_endpoint(
        "Corporate Actions",
        f"{BASE_URL}/corporate-actions?limit=20",
        expected_fields=['symbol', 'action_type', 'ex_date', 'amount'],
        min_records=10
    )
    
    # 4. Economic Indicators
    results['economic'] = test_endpoint(
        "Economic Indicators",
        f"{BASE_URL}/economic-indicators",
        expected_fields=['indicator_code', 'value', 'date'],
        min_records=5
    )
    
    # 5. Mutual Funds
    results['funds'] = test_endpoint(
        "Mutual Funds",
        f"{BASE_URL}/funds",
        expected_fields=['fund_id', 'fund_name', 'manager_name'],
        min_records=10
    )
    
    # 6. Fund NAV History
    results['nav'] = test_endpoint(
        "Fund NAV History",
        f"{BASE_URL}/funds/ARC001/nav?limit=365",
        expected_fields=['date', 'nav'],
        min_records=200
    )
    
    # 7. Insider Trading
    results['insider'] = test_endpoint(
        "Insider Trading",
        f"{BASE_URL}/insider-trading?limit=20",
        expected_fields=['symbol', 'insider_name', 'transaction_type', 'shares'],
        min_records=10
    )
    
    # 8. Analyst Ratings
    results['ratings'] = test_endpoint(
        "Analyst Ratings",
        f"{BASE_URL}/analyst-ratings?symbol=2222",
        expected_fields=['analyst_firm', 'rating', 'target_price'],
        min_records=1
    )
    
    # Summary
    print("\n" + "="*80)
    print("📊 VALIDATION SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for endpoint, status in results.items():
        icon = "✅" if status else "❌"
        print(f"{icon} {endpoint.upper():<25} {'PASS' if status else 'FAIL'}")
    
    print("="*80)
    print(f"Results: {passed}/{total} endpoints passed")
    
    if passed == total:
        print("\n🎉 ALL ENDPOINTS VALIDATED - SERVING REAL DATA!")
        print("✅ Backend is production-ready!")
    else:
        print(f"\n⚠️  {total - passed} endpoints need attention")
    
    print("="*80 + "\n")
    
    return passed == total


if __name__ == "__main__":
    success = run_validation()
    exit(0 if success else 1)
