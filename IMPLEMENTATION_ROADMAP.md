# 🗺️ FINANCEHUB PRO - IMPLEMENTATION ROADMAP
## Detailed Technical Execution Plan

**Version:** 1.0  
**Created:** December 26, 2024  
**Status:** Ready for Execution

---

# 📅 WEEK-BY-WEEK EXECUTION PLAN

## WEEK 1: Security Foundation 🔴

### Day 1-2: Authentication System

```bash
# Install dependencies
cd backend
pip install "python-jose[cryptography]" "passlib[bcrypt]" slowapi

# Create new directories
mkdir -p auth core middleware schemas
```

**Files to Create:**

| File | Purpose | Lines |
|------|---------|-------|
| `auth/__init__.py` | Package init | 5 |
| `auth/jwt_handler.py` | Token management | 80 |
| `auth/password.py` | Password hashing | 30 |
| `auth/dependencies.py` | Auth dependencies | 50 |
| `core/config.py` | Settings management | 60 |
| `core/exceptions.py` | Custom exceptions | 80 |

### Day 3-4: Rate Limiting & Input Validation

**Files to Create:**

| File | Purpose | Lines |
|------|---------|-------|
| `middleware/rate_limiter.py` | Request throttling | 40 |
| `middleware/logging.py` | Request logging | 60 |
| `schemas/ticker.py` | Ticker validation | 50 |
| `schemas/trade.py` | Trade validation | 40 |
| `schemas/response.py` | Response wrappers | 60 |

### Day 5: Security Headers & CORS

```python
# Add to main.py
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(HTTPSRedirectMiddleware)
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["financehub.sa", "*.financehub.sa"]
)
```

### Week 1 Deliverables Checklist:
- [ ] JWT token generation/validation
- [ ] Password hashing with bcrypt
- [ ] Rate limiting (100/min default)
- [ ] Input validation for all endpoints
- [ ] Secrets moved to environment variables
- [ ] Security headers configured
- [ ] CORS properly restricted

---

## WEEK 2: Authentication & RBAC 🔴

### Day 1-2: User Management

**Database Migrations:**

```sql
-- migrations/001_create_users.sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    api_key VARCHAR(64) UNIQUE,
    rate_limit_tier VARCHAR(20) DEFAULT 'standard'
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
```

### Day 3-4: API Key System

```python
# auth/api_keys.py
import secrets
import hashlib

class APIKeyManager:
    @staticmethod
    def generate_key() -> tuple[str, str]:
        """Returns (raw_key, hashed_key)"""
        raw_key = f"fhp_{''.join(secrets.choice('abcdefghijklmnopqrstuvwxyz0123456789') for _ in range(40))}"
        hashed = hashlib.sha256(raw_key.encode()).hexdigest()
        return raw_key, hashed
    
    @staticmethod
    def verify_key(raw_key: str, stored_hash: str) -> bool:
        return hashlib.sha256(raw_key.encode()).hexdigest() == stored_hash
```

### Day 5: Role-Based Access Control

```python
# auth/rbac.py
from enum import Enum
from functools import wraps

class Permission(Enum):
    READ_TICKERS = "read:tickers"
    READ_FINANCIALS = "read:financials"
    READ_PREMIUM = "read:premium"
    EXECUTE_TRADES = "execute:trades"
    RUN_BACKTEST = "run:backtest"
    ACCESS_AI = "access:ai"
    MANAGE_USERS = "manage:users"
    SYSTEM_ADMIN = "system:admin"

ROLE_PERMISSIONS = {
    "guest": [Permission.READ_TICKERS],
    "user": [Permission.READ_TICKERS, Permission.READ_FINANCIALS, Permission.EXECUTE_TRADES],
    "premium": [Permission.READ_TICKERS, Permission.READ_FINANCIALS, Permission.READ_PREMIUM, 
                Permission.EXECUTE_TRADES, Permission.RUN_BACKTEST, Permission.ACCESS_AI],
    "admin": list(Permission)  # All permissions
}

def require_permission(permission: Permission):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), **kwargs):
            if permission not in ROLE_PERMISSIONS.get(current_user.role, []):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator
```

### Week 2 Deliverables Checklist:
- [ ] User registration endpoint
- [ ] User login endpoint
- [ ] Token refresh endpoint
- [ ] Password reset flow
- [ ] API key generation
- [ ] 5 role levels implemented
- [ ] Permission checks on all endpoints

---

## WEEK 3: API Restructuring 🟠

### New File Structure:

```
backend/
├── api/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app
│   ├── deps.py                     # Dependencies
│   └── v1/
│       ├── __init__.py
│       ├── router.py               # Router aggregator
│       └── endpoints/
│           ├── __init__.py
│           ├── auth.py             # 6 endpoints
│           ├── tickers.py          # 5 endpoints
│           ├── charts.py           # 4 endpoints
│           ├── financials.py       # 4 endpoints
│           ├── funds.py            # 4 endpoints
│           ├── research.py         # 5 endpoints
│           ├── trading.py          # 4 endpoints
│           ├── ai.py               # 3 endpoints
│           └── admin.py            # 5 endpoints
├── services/
│   ├── __init__.py
│   ├── base.py                     # Base service class
│   ├── ticker_service.py
│   ├── chart_service.py
│   ├── fund_service.py
│   ├── trading_service.py
│   └── ai_service.py
├── repositories/
│   ├── __init__.py
│   ├── base.py                     # Base repository
│   ├── ticker_repo.py
│   ├── chart_repo.py
│   ├── fund_repo.py
│   └── user_repo.py
└── models/
    ├── __init__.py
    ├── user.py
    ├── ticker.py
    ├── chart.py
    └── fund.py
```

### Migration Script:

```python
# scripts/migrate_api_structure.py
"""
Migrate from monolithic api.py to modular structure
"""

# Step 1: Create endpoint files from existing functions
# Step 2: Create services layer
# Step 3: Create repository layer
# Step 4: Update imports
# Step 5: Test all endpoints
```

---

## WEEK 4: Enhanced Database Layer 🟠

### Connection Pool Optimization:

```python
# core/database.py
import asyncpg
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from tenacity import retry, stop_after_attempt, wait_exponential

class DatabasePool:
    def __init__(self):
        self.read_pool: Optional[asyncpg.Pool] = None
        self.write_pool: Optional[asyncpg.Pool] = None
        self._is_connected = False
    
    async def connect(self):
        if self._is_connected:
            return
        
        # Write pool - smaller, for mutations
        self.write_pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=5,
            max_size=20,
            command_timeout=30,
            max_inactive_connection_lifetime=300,
            max_queries=50000
        )
        
        # Read pool - larger, for queries
        read_dsn = settings.READ_REPLICA_URL or settings.DATABASE_URL
        self.read_pool = await asyncpg.create_pool(
            dsn=read_dsn,
            min_size=10,
            max_size=50,
            command_timeout=30,
            max_inactive_connection_lifetime=300
        )
        
        self._is_connected = True
    
    @asynccontextmanager
    async def acquire_read(self):
        async with self.read_pool.acquire() as conn:
            yield conn
    
    @asynccontextmanager
    async def acquire_write(self):
        async with self.write_pool.acquire() as conn:
            yield conn
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def fetch_all(self, query: str, *args) -> List[Dict[str, Any]]:
        async with self.acquire_read() as conn:
            records = await conn.fetch(query, *args)
            return [dict(r) for r in records]
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def fetch_one(self, query: str, *args) -> Optional[Dict[str, Any]]:
        async with self.acquire_read() as conn:
            record = await conn.fetchrow(query, *args)
            return dict(record) if record else None
    
    async def execute(self, query: str, *args):
        async with self.acquire_write() as conn:
            return await conn.execute(query, *args)
    
    async def execute_many(self, query: str, args_list: List[tuple]):
        async with self.acquire_write() as conn:
            return await conn.executemany(query, args_list)
    
    async def close(self):
        if self.read_pool:
            await self.read_pool.close()
        if self.write_pool and self.write_pool != self.read_pool:
            await self.write_pool.close()
        self._is_connected = False

db = DatabasePool()
```

---

## WEEK 5: Redis Caching 🟡

### Redis Setup:

```bash
# Install Redis (macOS)
brew install redis
brew services start redis

# Install Python client
pip install redis aioredis
```

### Cache Implementation:

```python
# core/cache.py
import aioredis
import json
from typing import Any, Callable, Optional
from functools import wraps
import hashlib

class CacheManager:
    CACHE_STRATEGIES = {
        "tickers": {"ttl": 30, "stale_ttl": 300},
        "ohlc": {"ttl": 60, "stale_ttl": 3600},
        "financials": {"ttl": 3600, "stale_ttl": 86400},
        "funds": {"ttl": 300, "stale_ttl": 3600},
        "news": {"ttl": 120, "stale_ttl": 600},
        "ai_insights": {"ttl": 300, "stale_ttl": 1800},
    }
    
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
    
    async def connect(self):
        self.redis = await aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
    
    async def get(self, key: str) -> Optional[Any]:
        value = await self.redis.get(key)
        return json.loads(value) if value else None
    
    async def set(self, key: str, value: Any, ttl: int):
        await self.redis.setex(key, ttl, json.dumps(value, default=str))
    
    async def delete(self, key: str):
        await self.redis.delete(key)
    
    async def get_or_fetch(
        self, 
        key: str, 
        fetch_fn: Callable, 
        category: str
    ) -> Any:
        # Check cache first
        cached = await self.get(key)
        if cached is not None:
            return cached
        
        # Fetch from source
        data = await fetch_fn()
        
        # Cache result
        ttl = self.CACHE_STRATEGIES.get(category, {}).get("ttl", 60)
        await self.set(key, data, ttl)
        
        return data
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate all keys matching pattern"""
        cursor = 0
        while True:
            cursor, keys = await self.redis.scan(cursor, match=pattern)
            if keys:
                await self.redis.delete(*keys)
            if cursor == 0:
                break

cache = CacheManager()

# Decorator for easy caching
def cached(category: str, key_params: list = None):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key from function name and params
            key_parts = [func.__name__]
            if key_params:
                for param in key_params:
                    key_parts.append(str(kwargs.get(param, "")))
            cache_key = ":".join(key_parts)
            
            return await cache.get_or_fetch(
                cache_key,
                lambda: func(*args, **kwargs),
                category
            )
        return wrapper
    return decorator
```

### Usage Example:

```python
# services/ticker_service.py
class TickerService:
    @cached(category="tickers", key_params=[])
    async def get_all(self) -> List[Dict]:
        return await ticker_repo.get_all()
    
    @cached(category="tickers", key_params=["symbol"])
    async def get_by_symbol(self, symbol: str) -> Optional[Dict]:
        return await ticker_repo.get_by_symbol(symbol)
```

---

## WEEK 6: Query Optimization 🟡

### New Indexes:

```sql
-- performance/indexes.sql

-- Core indexes for most frequent queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ohlc_symbol_date 
    ON ohlc_data(symbol, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intraday_symbol_time 
    ON intraday_data(symbol, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nav_fund_date 
    ON nav_history(fund_id, date DESC);

-- Covering indexes (include all columns needed in query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickers_screener 
    ON market_tickers(sector_name, volume DESC)
    INCLUDE (symbol, name_en, last_price, change_percent);

-- Partial indexes for active data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_stocks
    ON market_tickers(symbol)
    WHERE last_updated > NOW() - INTERVAL '1 day';

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_earnings_upcoming
    ON earnings_calendar(announcement_date, symbol)
    WHERE announcement_date >= CURRENT_DATE;
```

### Materialized Views:

```sql
-- Materialized view for market summary
CREATE MATERIALIZED VIEW mv_market_summary AS
SELECT 
    COUNT(*) as total_stocks,
    COUNT(*) FILTER (WHERE change > 0) as gainers,
    COUNT(*) FILTER (WHERE change < 0) as losers,
    COUNT(*) FILTER (WHERE change = 0) as unchanged,
    SUM(volume) as total_volume,
    SUM(volume * last_price) as total_turnover,
    AVG(change_percent) as avg_change_percent,
    MAX(last_updated) as data_as_of
FROM market_tickers
WHERE last_updated > NOW() - INTERVAL '1 day';

CREATE UNIQUE INDEX ON mv_market_summary ((1));

-- Materialized view for top movers
CREATE MATERIALIZED VIEW mv_top_movers AS
WITH ranked AS (
    SELECT 
        symbol,
        name_en,
        last_price,
        change,
        change_percent,
        volume,
        sector_name,
        ROW_NUMBER() OVER (ORDER BY change_percent DESC) as gainer_rank,
        ROW_NUMBER() OVER (ORDER BY change_percent ASC) as loser_rank,
        ROW_NUMBER() OVER (ORDER BY volume DESC) as volume_rank
    FROM market_tickers
    WHERE last_updated > NOW() - INTERVAL '1 day'
)
SELECT * FROM ranked
WHERE gainer_rank <= 10 OR loser_rank <= 10 OR volume_rank <= 10;

CREATE UNIQUE INDEX ON mv_top_movers (symbol);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_market_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_movers;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every 5 minutes (using pg_cron)
SELECT cron.schedule('refresh_views', '*/5 * * * *', 'SELECT refresh_materialized_views()');
```

---

## WEEK 7-8: AI Engine Enhancement 🟢

### FinBERT Integration:

```python
# ai/sentiment_engine.py
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch

class FinBERTSentimentAnalyzer:
    def __init__(self):
        self.model_name = "ProsusAI/finbert"
        self.tokenizer = None
        self.model = None
        self._loaded = False
    
    async def load(self):
        if self._loaded:
            return
        
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
        self.model.eval()
        self._loaded = True
    
    def analyze(self, text: str) -> dict:
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")
        
        inputs = self.tokenizer(
            text, 
            return_tensors="pt", 
            truncation=True, 
            max_length=512,
            padding=True
        )
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)
        
        labels = ["positive", "negative", "neutral"]
        scores = probs[0].tolist()
        
        return {
            label: round(score, 4) 
            for label, score in zip(labels, scores)
        }
    
    def analyze_batch(self, texts: List[str]) -> List[dict]:
        results = []
        for text in texts:
            results.append(self.analyze(text))
        return results
    
    def get_market_sentiment(self, headlines: List[str]) -> dict:
        if not headlines:
            return {"sentiment": "NEUTRAL", "confidence": 0}
        
        results = self.analyze_batch(headlines)
        
        avg_positive = sum(r["positive"] for r in results) / len(results)
        avg_negative = sum(r["negative"] for r in results) / len(results)
        avg_neutral = sum(r["neutral"] for r in results) / len(results)
        
        if avg_positive > 0.5:
            sentiment = "BULLISH" if avg_positive > 0.7 else "MILDLY_BULLISH"
        elif avg_negative > 0.5:
            sentiment = "BEARISH" if avg_negative > 0.7 else "MILDLY_BEARISH"
        else:
            sentiment = "NEUTRAL"
        
        confidence = max(avg_positive, avg_negative, avg_neutral)
        
        return {
            "sentiment": sentiment,
            "confidence": round(confidence, 4),
            "breakdown": {
                "positive": round(avg_positive, 4),
                "negative": round(avg_negative, 4),
                "neutral": round(avg_neutral, 4)
            },
            "sample_size": len(headlines)
        }

sentiment_analyzer = FinBERTSentimentAnalyzer()
```

### GPT-4 Integration:

```python
# ai/llm_engine.py
from openai import AsyncOpenAI
import json

class LLMEngine:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        self.system_prompt = """You are FinanceHub AI, an expert financial analyst 
assistant specializing in the Saudi Stock Exchange (Tadawul). 

Your capabilities:
- Analyze stock performance and valuation
- Interpret financial statements
- Explain market trends
- Provide investment insights (not advice)

Guidelines:
- Be concise and data-driven
- Always cite sources when referencing data
- Use proper financial terminology
- Format numbers clearly (comma separated)
- Never provide specific buy/sell recommendations
- Always include appropriate disclaimers"""
    
    async def chat(
        self, 
        user_message: str, 
        context: dict = None,
        history: list = None
    ) -> str:
        messages = [{"role": "system", "content": self.system_prompt}]
        
        if context:
            messages.append({
                "role": "system",
                "content": f"Current data context:\n{json.dumps(context, indent=2)}"
            })
        
        if history:
            messages.extend(history)
        
        messages.append({"role": "user", "content": user_message})
        
        response = await self.client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=messages,
            temperature=0.3,
            max_tokens=1000
        )
        
        return response.choices[0].message.content
    
    async def generate_stock_report(self, symbol: str) -> str:
        # Fetch all available data
        ticker = await ticker_service.get_by_symbol(symbol)
        financials = await financial_service.get_latest(symbol)
        ratios = await ratio_service.get(symbol)
        analyst_ratings = await rating_service.get_for_symbol(symbol)
        recent_news = await news_service.get_for_symbol(symbol, limit=5)
        
        context = {
            "ticker": ticker,
            "financials": financials,
            "ratios": ratios,
            "analyst_consensus": analyst_ratings,
            "recent_headlines": [n["title"] for n in recent_news]
        }
        
        prompt = f"""Generate a comprehensive investment analysis report for {symbol}.

Include:
1. Company Overview
2. Recent Performance Summary
3. Valuation Analysis
4. Key Financial Metrics
5. Analyst Consensus
6. Risk Factors
7. Technical Outlook

Format as structured markdown."""
        
        return await self.chat(prompt, context)

llm = LLMEngine()
```

---

## WEEK 9-10: Testing Infrastructure 🔵

### Test Setup:

```bash
# Install testing dependencies
pip install pytest pytest-asyncio pytest-cov httpx faker factory-boy

# Create test structure
mkdir -p tests/{unit,integration,e2e,performance}
```

### conftest.py:

```python
# tests/conftest.py
import pytest
import asyncio
from httpx import AsyncClient
from faker import Faker

from backend.api.main import app
from backend.core.database import db
from backend.core.cache import cache

fake = Faker()

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_db():
    await db.connect()
    yield db
    await db.close()

@pytest.fixture(scope="session")
async def test_cache():
    await cache.connect()
    yield cache

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def auth_headers(client):
    # Create test user and get token
    response = await client.post("/api/v1/auth/register", json={
        "email": fake.email(),
        "password": "TestPassword123!"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def mock_ticker():
    return {
        "symbol": "1120",
        "name_en": "Al Rajhi Bank",
        "last_price": 95.50,
        "change": 0.75,
        "change_percent": 0.79,
        "volume": 5000000
    }
```

### Sample Tests:

```python
# tests/integration/test_tickers.py
import pytest

@pytest.mark.asyncio
async def test_get_tickers_success(client, auth_headers):
    response = await client.get("/api/v1/tickers", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert isinstance(data["data"], list)
    assert len(data["data"]) > 0

@pytest.mark.asyncio
async def test_get_tickers_unauthorized(client):
    response = await client.get("/api/v1/tickers")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_ticker_by_symbol(client, auth_headers):
    response = await client.get("/api/v1/tickers/1120", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["symbol"] == "1120"

@pytest.mark.asyncio
async def test_get_ticker_not_found(client, auth_headers):
    response = await client.get("/api/v1/tickers/9999", headers=auth_headers)
    assert response.status_code == 404

# tests/unit/test_validators.py
from pydantic import ValidationError
from backend.schemas.ticker import TickerQuery

def test_valid_ticker():
    query = TickerQuery(symbol="1120")
    assert query.symbol == "1120"

def test_invalid_ticker_format():
    with pytest.raises(ValidationError):
        TickerQuery(symbol="AAPL")

def test_invalid_ticker_length():
    with pytest.raises(ValidationError):
        TickerQuery(symbol="11")

# tests/performance/locustfile.py
from locust import HttpUser, task, between

class APIUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login and get token
        response = self.client.post("/api/v1/auth/login", json={
            "email": "loadtest@example.com",
            "password": "LoadTest123!"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(10)
    def get_tickers(self):
        self.client.get("/api/v1/tickers", headers=self.headers)
    
    @task(5)
    def get_ohlc(self):
        self.client.get("/api/v1/ohlc/1120?period=1y", headers=self.headers)
    
    @task(2)
    def get_ai_briefing(self):
        self.client.get("/api/v1/ai/briefing", headers=self.headers)
```

---

## WEEK 11-12: Production Deployment ⚪

### Docker Configuration:

```dockerfile
# docker/Dockerfile.backend
FROM python:3.11-slim as builder

WORKDIR /app
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

FROM python:3.11-slim

WORKDIR /app

# Copy wheels and install
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/*

# Copy application
COPY backend/ ./backend/

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

EXPOSE 8000

CMD ["gunicorn", "backend.api.main:app", "-k", "uvicorn.workers.UvicornWorker", "-w", "4", "-b", "0.0.0.0:8000"]
```

### Docker Compose:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - READ_REPLICA_URL=${READ_REPLICA_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.financehub.sa
    depends_on:
      - api

  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=financehub
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - api
      - frontend

volumes:
  postgres_data:
  redis_data:
```

### CI/CD Pipeline:

```yaml
# .github/workflows/main.yml
name: FinanceHub CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov pytest-asyncio httpx
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379
        run: pytest --cov=backend --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run linters
        run: |
          pip install ruff mypy
          ruff check backend/
          mypy backend/ --ignore-missing-imports

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run security scan
        run: |
          pip install bandit safety
          bandit -r backend/ -ll
          safety check

  deploy:
    needs: [test, lint, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # Add deployment commands here
```

---

# 📊 IMPLEMENTATION TRACKING

## Progress Dashboard

| Phase | Week | Status | Completion |
|-------|------|--------|------------|
| Security Foundation | 1 | ⏳ Pending | 0% |
| Auth & RBAC | 2 | ⏳ Pending | 0% |
| API Restructuring | 3 | ⏳ Pending | 0% |
| Database Enhancement | 4 | ⏳ Pending | 0% |
| Redis Caching | 5 | ⏳ Pending | 0% |
| Query Optimization | 6 | ⏳ Pending | 0% |
| AI Sentiment Engine | 7 | ⏳ Pending | 0% |
| LLM Integration | 8 | ⏳ Pending | 0% |
| Testing Setup | 9 | ⏳ Pending | 0% |
| Test Coverage | 10 | ⏳ Pending | 0% |
| Docker & CI/CD | 11 | ⏳ Pending | 0% |
| Production Deploy | 12 | ⏳ Pending | 0% |

## Legend:
- ⏳ Pending
- 🔄 In Progress
- ✅ Completed
- ❌ Blocked

---

*Implementation Roadmap v1.0 - December 26, 2024*
