import requests
import time

BASE_URL = "http://localhost:7860"
TIMEOUT = 30  # seconds
MAX_RESPONSE_TIME_MS = 500

def test_market_data_endpoints_accuracy_and_performance():
    headers = {
        "Accept": "application/json"
    }

    endpoints = {
        "tickers": "/api/v1/market/tickers",
        "news": "/api/v1/market/news",
        "stats": "/api/v1/market/statistics"
    }

    # Helper function to validate response structure and data sanity
    def validate_tickers(data):
        assert isinstance(data, list), "Tickers response should be a list"
        if len(data) > 0:
            ticker = data[0]
            assert "symbol" in ticker and isinstance(ticker["symbol"], str), "Ticker must have a symbol string"
            assert "price" in ticker and isinstance(ticker["price"], (int, float)), "Ticker must have a price number"
            assert "volume" in ticker and isinstance(ticker["volume"], (int, float)), "Ticker must have volume number"

    def validate_news(data):
        assert isinstance(data, list), "News response should be a list"
        if len(data) > 0:
            article = data[0]
            assert "title" in article and isinstance(article["title"], str), "News article must have a title string"
            assert "source" in article and isinstance(article["source"], str), "News article must have a source string"
            assert "published_at" in article and isinstance(article["published_at"], str), "News article must have a published_at string"

    def validate_stats(data):
        assert isinstance(data, dict), "Statistics response should be a dict"
        required_keys = ["market_cap", "volume_24h", "advancers", "decliners"]
        for key in required_keys:
            assert key in data, f"Market statistics must include '{key}'"
            assert isinstance(data[key], (int, float)), f"Market statistics '{key}' must be numeric"

    validators = {
        "tickers": validate_tickers,
        "news": validate_news,
        "stats": validate_stats
    }

    for name, path in endpoints.items():
        url = BASE_URL + path
        start = time.time()
        try:
            response = requests.get(url, headers=headers, timeout=TIMEOUT)
        except requests.RequestException as e:
            assert False, f"Request to {url} failed with exception: {str(e)}"
        duration_ms = (time.time() - start) * 1000

        assert response.status_code == 200, f"{name.capitalize()} endpoint returned {response.status_code}"
        try:
            json_data = response.json()
        except ValueError:
            assert False, f"{name.capitalize()} endpoint did not return valid JSON"

        # Validate response time
        assert duration_ms < MAX_RESPONSE_TIME_MS, f"{name.capitalize()} endpoint response time {duration_ms:.2f}ms exceeded limit of {MAX_RESPONSE_TIME_MS}ms"

        # Validate data accuracy and structure
        validators[name](json_data)

test_market_data_endpoints_accuracy_and_performance()