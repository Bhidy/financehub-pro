# FinanceHub Pro - Rasa Chatbot

DB-grounded bilingual (Arabic/English) chatbot using Rasa Open Source.

## Quick Start

### 1. Train the Model

```bash
cd rasa-chatbot
rasa train
```

### 2. Run Locally

```bash
# Terminal 1: Action Server
cd rasa-chatbot/actions
pip install -r requirements.txt
python -m rasa_sdk --actions actions --port 5055

# Terminal 2: Rasa Server
cd rasa-chatbot
rasa run --enable-api --cors "*" --debug
```

### 3. Test

```bash
# Interactive shell
rasa shell

# API test
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"sender": "test", "message": "price of COMI"}'
```

## Docker Deployment

```bash
cd rasa-chatbot
docker-compose up --build
```

## Project Structure

```
rasa-chatbot/
├── config.yml          # NLU pipeline configuration
├── domain.yml          # Intents, entities, slots, actions
├── credentials.yml     # Channel credentials
├── endpoints.yml       # Action server endpoint
├── data/
│   ├── nlu.yml         # Training examples (500+)
│   ├── stories.yml     # Conversation flows
│   └── rules.yml       # Deterministic rules
├── actions/
│   ├── actions.py      # Custom actions (API calls)
│   ├── Dockerfile      # Action server container
│   └── requirements.txt
├── models/             # Trained models (generated)
└── tests/              # Test conversations
```

## Supported Intents

### Stock Intents (16)
- `stock_price` - Current price
- `stock_chart` - Price chart
- `stock_snapshot` - Quick overview
- `stock_stat` - PE, market cap, etc.
- `financials` - Financial statements
- `dividends` - Dividend history
- `compare_stocks` - Compare two stocks
- `top_gainers` - Market gainers
- `top_losers` - Market losers
- `sector_stocks` - Stocks by sector
- `dividend_leaders` - High yield stocks
- `screener_pe` - PE ratio filter
- `ownership` - Shareholder info
- `fair_value` - Analyst targets
- `technical_indicators` - RSI/MACD/SMA
- `financial_health` - Debt/Liquidity

### Fund Intents (6)
- `fund_nav` - Current NAV
- `fund_profile` - Fund details
- `fund_performance` - Returns (YTD/1Y/3Y)
- `fund_compare` - Compare funds
- `fund_search` - Find funds (Shariah, equity, etc.)
- `fund_movers` - Top/bottom performers

### System Intents
- `help` - Show capabilities
- `greet` - Greeting
- `goodbye` - Farewell
- `switch_market` - Change market (Egypt/Saudi)

## API Integration

The action server calls your FastAPI backend:

```python
API_BASE = "https://bhidy-financehub-api.hf.space/api/v1"

# Stock data
GET /tickers
GET /ohlc/{symbol}
GET /financials/{symbol}

# Fund data
GET /funds
GET /funds/{id}
GET /funds/stats/summary
```

## Adding New Training Data

1. Edit `data/nlu.yml` - Add examples
2. Edit `data/rules.yml` - Add rules if needed
3. Retrain: `rasa train`
4. Test: `rasa test`

## Monitoring

Check `chat_analytics` table for:
- Intent distribution
- Fallback rate
- Response times
- Entity extraction accuracy

```sql
SELECT detected_intent, COUNT(*), AVG(confidence)
FROM chat_analytics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY detected_intent
ORDER BY COUNT(*) DESC;
```
