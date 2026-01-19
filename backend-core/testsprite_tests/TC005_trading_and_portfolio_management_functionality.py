import requests
import time

BASE_URL = "http://localhost:7860"
TIMEOUT = 30

def test_trading_and_portfolio_management_functionality():
    # Step 1: Register and login a test user
    from uuid import uuid4
    suffix = uuid4().hex[:6]
    register_payload = {
        "email": f"testuser_{suffix}@example.com",
        "password": "SafePassw0rd!",
        "full_name": "Test TC005"
    }

    reg_resp = requests.post(f"{BASE_URL}/api/v1/auth/register", json=registration_payload if 'registration_payload' in locals() else register_payload, timeout=TIMEOUT)
    
    login_payload = {
        "email": register_payload["email"],
        "password": register_payload["password"]
    }
    login_resp = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Step 3: Query the portfolio before trade
    portfolio_resp = requests.get(f"{BASE_URL}/api/v1/portfolio/full", headers=headers, timeout=TIMEOUT)
    assert portfolio_resp.status_code == 200, f"Get portfolio failed: {portfolio_resp.text}"
    portfolio_before = portfolio_resp.json()
    cash_before = portfolio_before.get("cash_balance", 0)

    # Step 4: Query available market tickers
    tickers_resp = requests.get(f"{BASE_URL}/api/v1/tickers", headers=headers, timeout=TIMEOUT)
    assert tickers_resp.status_code == 200, f"Get tickers failed: {tickers_resp.text}"
    tickers = tickers_resp.json()
    ticker = tickers[0].get("symbol")

    # Step 5: Place a simulated buy trade (using the holdings endpoint for direct manipulation or trade endpoint if exists)
    # The current portfolio.py implements /portfolio/holdings via POST. 
    # Let's use that instead of /trade which might be separate.
    trade_payload = {
        "symbol": ticker,
        "quantity": 10,
        "purchase_price": 50.0, # Dummy price
        "purchase_date": "2024-01-01"
    }
    trade_resp = requests.post(f"{BASE_URL}/api/v1/portfolio/holdings", headers=headers, json=trade_payload, timeout=TIMEOUT)
    assert trade_resp.status_code == 200, f"Add holding failed: {trade_resp.text}"

    # Step 6: Immediately query portfolio after trade
    portfolio_after = requests.get(f"{BASE_URL}/api/v1/portfolio/full", headers=headers, timeout=TIMEOUT).json()
    cash_after = portfolio_after.get("cash_balance", 0)
    assert cash_after < cash_before, "Cash should decrease after BUY"
    
    # Check holdings
    holdings = portfolio_after.get("holdings", [])
    assert any(h['symbol'] == ticker for h in holdings), f"Symbol {ticker} should be in holdings"

test_trading_and_portfolio_management_functionality()
