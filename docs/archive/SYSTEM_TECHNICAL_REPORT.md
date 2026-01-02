# 📋 FINANCEHUB PRO - COMPREHENSIVE TECHNICAL SYSTEM REPORT
## Complete System Documentation for Expert Review

**Document Type:** Technical Architecture & Capabilities Report  
**Version:** 1.0  
**Generated:** December 26, 2024  
**System Name:** FinanceHub Pro (Mubasher Deep Extract)  
**Classification:** Internal Technical Documentation

---

# 📊 TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Backend System](#3-backend-system)
4. [Frontend System](#4-frontend-system)
5. [Database Architecture](#5-database-architecture)
6. [Data Extraction Pipeline](#6-data-extraction-pipeline)
7. [API Specification](#7-api-specification)
8. [AI/ML Capabilities](#8-aiml-capabilities)
9. [Automation & Scheduling](#9-automation--scheduling)
10. [System Capabilities Matrix](#10-system-capabilities-matrix)

---

# 1. SYSTEM OVERVIEW

## 1.1 Purpose

FinanceHub Pro is an **enterprise-grade financial intelligence platform** specifically designed for the **Saudi Stock Exchange (Tadawul)**. The system provides:

- Real-time stock market data and analytics
- Historical OHLC charting with technical indicators
- Mutual fund NAV tracking and analysis
- Earnings calendar and corporate actions
- AI-powered market sentiment analysis
- Paper trading simulation with backtesting
- Comprehensive investment research tools

## 1.2 Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend Framework** | Next.js | 16.1.1 | Server-side rendering, App Router |
| **UI Library** | React | 19.2.3 | Component-based UI |
| **Styling** | TailwindCSS | 4.0 | Utility-first CSS |
| **State Management** | TanStack Query | 5.90.12 | Server state, caching |
| **Charts** | Lightweight Charts | 5.1.0 | TradingView-style candlesticks |
| **Charts (Secondary)** | Recharts | 3.6.0 | Area/Line charts |
| **Animations** | Framer Motion | 12.23.26 | Micro-interactions |
| **Backend Framework** | FastAPI | Latest | Async Python API |
| **Database** | PostgreSQL | 15 | Relational data store |
| **Database Driver** | asyncpg | Latest | Async PostgreSQL client |
| **Scheduler** | schedule | Latest | Python job scheduling |
| **HTTP Client** | aiohttp/tls_client | Latest | WAF bypass, async requests |

## 1.3 System Metrics (Current State)

| Metric | Value | Notes |
|--------|-------|-------|
| **Total Stocks Tracked** | 453 | Full Tadawul coverage |
| **Mutual Funds** | 582 | Saudi investment funds |
| **OHLC Data Points** | 140,000+ | Historical daily bars |
| **NAV History Records** | 615,000+ | 20+ years for some funds |
| **Intraday Bars** | 36,000+ | 1-minute resolution |
| **Financial Statements** | 5,000+ | Quarterly/Annual |
| **Earnings Calendar Entries** | 2,500+ | EPS announcements |
| **Major Shareholders** | 900+ | Ownership records |
| **API Endpoints** | 38 | RESTful endpoints |
| **Frontend Pages** | 18 | React pages |
| **React Components** | 17 | Reusable components |
| **Data Extractors** | 24 | Python scraping scripts |

---

# 2. ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FINANCEHUB PRO ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        NEXT.JS 16 FRONTEND                              ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐││
│  │  │  App Router  │  │  TanStack    │  │  Lightweight │  │   Framer     │││
│  │  │  18 Pages    │  │  Query       │  │  Charts      │  │   Motion     │││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐││
│  │  │  Sidebar     │  │  GlobalSearch│  │  HealthCheck │  │  MarketTicker│││
│  │  │  Navigation  │  │  Cmd+K       │  │  Status      │  │  Tape        │││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                     ▼                                        │
│                           HTTP (localhost:3000)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ AXIOS (REST API)
┌─────────────────────────────────────────────────────────────────────────────┐
│                               API LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        FASTAPI BACKEND                                  ││
│  │                     (localhost:8000, 549 lines)                         ││
│  │  ┌────────────────────────────────────────────────────────────────────┐││
│  │  │                    38 REST ENDPOINTS                               │││
│  │  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐          │││
│  │  │  │  /tickers │ │  /ohlc    │ │  /funds   │ │  /ai      │          │││
│  │  │  │  /history │ │  /intraday│ │  /earnings│ │  /backtest│          │││
│  │  │  │  /screener│ │  /news    │ │  /analysts│ │  /portfolio│         │││
│  │  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘          │││
│  │  └────────────────────────────────────────────────────────────────────┘││
│  │  ┌────────────────────────────────────────────────────────────────────┐││
│  │  │                    CORE MODULES                                    │││
│  │  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │││
│  │  │  │  database.py  │  │  ai_engine.py │  │ backtest_engine│         │││
│  │  │  │  asyncpg pool │  │  NLP Sentiment│  │  SMA, RSI     │          │││
│  │  │  └───────────────┘  └───────────────┘  └───────────────┘          │││
│  │  └────────────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                     ▼                                        │
│                              asyncpg (Async)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                     POSTGRESQL 15 DATABASE                              ││
│  │                        (mubasher_db)                                    ││
│  │  ┌────────────────────────────────────────────────────────────────────┐││
│  │  │                    CORE TABLES (8)                                 │││
│  │  │  market_tickers │ ohlc_data │ intraday_data │ financial_statements│││
│  │  │  mutual_funds   │ nav_history│ market_news  │ earnings_calendar   │││
│  │  └────────────────────────────────────────────────────────────────────┘││
│  │  ┌────────────────────────────────────────────────────────────────────┐││
│  │  │                    EXTENDED TABLES (10)                            │││
│  │  │  corporate_actions│ analyst_ratings│ fair_values │ technical_levels│││
│  │  │  major_shareholders│ financial_ratios│ volume_stats│ ipo_history  │││
│  │  └────────────────────────────────────────────────────────────────────┘││
│  │  ┌────────────────────────────────────────────────────────────────────┐││
│  │  │                    TRADING TABLES (4)                              │││
│  │  │  portfolios │ portfolio_holdings │ trade_history │ order_book_snap │││
│  │  └────────────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA EXTRACTION LAYER                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    24 PYTHON EXTRACTORS                                 ││
│  │  ┌────────────────────────────────────────────────────────────────────┐││
│  │  │  STOCK DATA          │  FUNDAMENTALS        │  FUNDS              │││
│  │  │  stock_extractor     │  fundamental_extractor│  real_fund_extractor│││
│  │  │  production_extractor│  ratios_extractor    │  fund_history_extrac│││
│  │  │  deep_stock_extractor│  profile_extractor   │                     │││
│  │  └────────────────────────────────────────────────────────────────────┘││
│  │  ┌────────────────────────────────────────────────────────────────────┐││
│  │  │  RESEARCH DATA       │  HISTORY             │  REAL-TIME          │││
│  │  │  earnings_extractor  │  full_history_extrac │  snapshot_extractor │││
│  │  │  shareholder_extrac  │  yahoo_real_data     │  news_extractor     │││
│  │  │  real_analyst_extrac │  ohlc.py             │  real_insider_extrac│││
│  │  └────────────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                     ▲                                        │
│                          tls_client / aiohttp / Playwright                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL DATA SOURCES                               │
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │    MUBASHER.INFO     │  │    YAHOO FINANCE     │                        │
│  │  (Primary Source)    │  │  (Fallback Source)   │                        │
│  │  - Stock Prices      │  │  - Historical OHLC   │                        │
│  │  - Company Profiles  │  │  - Dividend Data     │                        │
│  │  - Financials        │  │                      │                        │
│  │  - Fund NAVs         │  │                      │                        │
│  └──────────────────────┘  └──────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 3. BACKEND SYSTEM

## 3.1 FastAPI Application Structure

### Main Application (`backend/api.py`)

**File Size:** 549 lines, 21,621 bytes

**Initialization Flow:**
```python
# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Connect to PostgreSQL database
    await db.connect()
    
    # 2. Start automation engine in background thread
    scheduler_thread = threading.Thread(target=start_scheduler, daemon=True)
    scheduler_thread.start()
    
    yield
    
    # 3. Cleanup on shutdown
    await db.close()

# Application creation
app = FastAPI(title="Mubasher Deep Extract API", lifespan=lifespan)
```

**CORS Configuration:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 3.2 Database Layer (`backend/database.py`)

**Implementation Details:**

```python
class Database:
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        """Creates asyncpg connection pool"""
        self._pool = await asyncpg.create_pool(dsn=DB_DSN)
        # DSN: postgresql://home@localhost:5432/mubasher_db

    async def fetch_all(self, query: str, *args) -> List[Dict[str, Any]]:
        """Execute SELECT query, return list of dicts"""
        async with self._pool.acquire() as conn:
            records = await conn.fetch(query, *args)
            return [dict(r) for r in records]

    async def fetch_one(self, query: str, *args) -> Optional[Dict[str, Any]]:
        """Execute SELECT query, return single dict or None"""
        async with self._pool.acquire() as conn:
            record = await conn.fetchrow(query, *args)
            return dict(record) if record else None

    async def execute(self, query: str, *args):
        """Execute INSERT/UPDATE/DELETE query"""
        async with self._pool.acquire() as conn:
            await conn.execute(query, *args)

# Global singleton instance
db = Database()
```

**Technical Notes:**
- Uses `asyncpg` for non-blocking I/O
- Connection pool managed automatically
- No explicit pool size configuration (uses asyncpg defaults)
- Silent failure on pool unavailability (returns None/empty list)

## 3.3 AI Engine (`backend/ai_engine.py`)

**Purpose:** Natural Language Processing for market sentiment analysis

**Implementation:**

```python
def analyze_headlines(headlines: List[str]) -> dict:
    """
    Analyzes news headlines to extract:
    - Key themes (top 5 words by frequency)
    - Sentiment score (-N to +N)
    - Sentiment label (BULLISH/NEUTRAL/BEARISH)
    - Summary text
    """
    
    # 1. Text preprocessing
    all_text = " ".join(headlines).lower()
    cleaned_text = re.sub(r'[^\w\s]', '', all_text)
    words = cleaned_text.split()
    
    # 2. Stopword removal (500+ stopwords including domain-specific)
    filtered_words = [w for w in words if w not in STOPWORDS and len(w) > 2]
    
    # 3. Theme extraction (word frequency)
    word_counts = Counter(filtered_words)
    themes = [word for word, count in word_counts.most_common(5)]
    
    # 4. Heuristic sentiment scoring
    bullish_terms = ['gain', 'rise', 'up', 'surge', 'jump', 'green', 
                     'growth', 'profit', 'dividend', 'buy']
    bearish_terms = ['loss', 'fall', 'down', 'drop', 'crash', 'red', 
                     'decline', 'debt', 'sell', 'risk']
    
    sentiment_score = 0
    for word in words:
        if word in bullish_terms: sentiment_score += 1
        elif word in bearish_terms: sentiment_score -= 1
    
    # 5. Sentiment classification
    if sentiment_score > 2: sentiment = "BULLISH"
    elif sentiment_score < -2: sentiment = "BEARISH"
    else: sentiment = "NEUTRAL"
    
    return {
        "themes": themes,
        "sentiment": sentiment,
        "score": sentiment_score,
        "summary": f"Market focus: {', '.join(themes[:3]).upper()}. Sentiment: {sentiment}"
    }
```

**Limitations:**
- Keyword-based (not ML/transformer-based)
- English only
- No contextual understanding
- No named entity recognition

## 3.4 Backtest Engine (`backend/backtest_engine.py`)

**Purpose:** Strategy backtesting with technical indicators

**Class Structure:**

```python
class BacktestEngine:
    def __init__(self, data, initial_capital=10000.0, commission=0.0):
        self.data = sorted(data, key=lambda x: x['time'])
        self.capital = float(initial_capital)
        self.initial_capital = float(initial_capital)
        self.commission = float(commission)
        self.position = 0          # Current shares held
        self.trades = []           # Trade history
        self.equity_curve = []     # Equity over time
        self.indicators = {}       # Calculated indicators

    def calculate_sma(self, period, key='close') -> List[float]:
        """Simple Moving Average"""
        # Returns list of SMA values (None for first period-1 values)
        
    def calculate_rsi(self, period, key='close') -> List[float]:
        """Relative Strength Index (Wilder's smoothing)"""
        # Implements standard RSI calculation
        
    def run(self, rules: List[dict]) -> dict:
        """
        Execute backtest with given rules
        
        Rules format:
        [
            {"indicator": "RSI_14", "operator": "<", "value": 30, "action": "BUY"},
            {"indicator": "RSI_14", "operator": ">", "value": 70, "action": "SELL"}
        ]
        
        Returns:
        {
            "final_capital": float,
            "total_trades": int,
            "trades": List[Trade],
            "equity_curve": List[{"time": str, "value": float}]
        }
        """
```

**Supported Indicators:**
| Indicator | Syntax | Description |
|-----------|--------|-------------|
| SMA | `SMA_20`, `SMA_50`, `SMA_200` | Simple Moving Average |
| RSI | `RSI_14` | Relative Strength Index |

**Supported Operators:**
- `<` - Less than
- `>` - Greater than
- `=` - Equal to

**Trading Logic:**
- Single position only (no pyramiding)
- Market orders at close price
- Full capital allocation per trade
- No short selling
- No commission by default

---

# 4. FRONTEND SYSTEM

## 4.1 Application Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with Sidebar
│   ├── page.tsx                  # Home page (Market Overview)
│   ├── globals.css               # Global styles
│   ├── providers.tsx             # TanStack Query Provider
│   │
│   ├── symbol/[id]/page.tsx      # Stock detail page
│   ├── intraday/page.tsx         # Day trading interface
│   ├── charts/page.tsx           # Technical analysis
│   ├── funds/page.tsx            # Mutual funds list
│   ├── funds/[id]/page.tsx       # Fund detail page
│   ├── screener/page.tsx         # Stock screener
│   ├── portfolio/page.tsx        # Paper trading
│   ├── strategy/page.tsx         # Strategy builder
│   ├── analyst-ratings/page.tsx  # Analyst recommendations
│   ├── earnings/page.tsx         # Earnings calendar
│   ├── shareholders/page.tsx     # Ownership analysis
│   ├── insider-trading/page.tsx  # Insider activity
│   ├── corporate-actions/page.tsx# Dividends/Splits
│   ├── data-explorer/page.tsx    # Raw data access
│   ├── economics/page.tsx        # Economic indicators
│   ├── markets/page.tsx          # Market intelligence
│   ├── market-pulse/page.tsx     # Real-time pulse
│   └── command-center/page.tsx   # System admin
│
├── components/                    # Reusable components
│   ├── Sidebar.tsx               # Main navigation (254 lines)
│   ├── GlobalSearch.tsx          # Cmd+K search (263 lines)
│   ├── MultiTimeframeChart.tsx   # TradingView chart (405 lines)
│   ├── StrategyBuilder.tsx       # Backtest UI (262 lines)
│   ├── HealthCheck.tsx           # Status indicator
│   ├── MarketTicker.tsx          # Scrolling ticker tape
│   ├── TechnicalIndicatorsPanel.tsx # Indicator controls
│   ├── AlertManager.tsx          # Price alerts
│   ├── DataGrid.tsx              # Data tables
│   └── ...                       # 8 more components
│
└── lib/
    └── api.ts                    # API client (216 lines)
```

## 4.2 API Client Layer (`lib/api.ts`)

**Configuration:**
```typescript
import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

export const api = axios.create({
    baseURL: API_BASE_URL,
});
```

**Type Definitions:**

```typescript
export type Ticker = {
    symbol: string;        // "1120"
    name_en: string;       // "Al Rajhi Bank"
    name_ar: string;       // Arabic name
    sector_name: string;   // "Banks"
    last_price: number;    // 95.50
    change: number;        // +0.75
    change_percent: number;// +0.79
    volume: number;        // 5000000
}

export type OHLC = {
    time: string;          // "2024-12-26"
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface MutualFund {
    fund_id: string;
    fund_name: string;
    fund_type: string;
    manager_name: string;
    latest_nav: number;
    expense_ratio: number;
    minimum_investment: number;
    sharpe_ratio?: number;
    standard_deviation?: number;
    ytd_return?: number;
    one_year_return?: number;
    three_year_return?: number;
    five_year_return?: number;
}

export interface InsiderTransaction {
    id: number;
    symbol: string;
    insider_name: string;
    insider_role: string;
    transaction_type: 'BUY' | 'SELL';
    transaction_date: string;
    shares: number;
    price: number;
    value: number;
}

export interface AnalystRating {
    id: number;
    symbol: string;
    analyst_firm: string;
    rating: string;        // "BUY", "HOLD", "SELL"
    price_target: number;
    target_upside: number;
}
```

**Fetch Functions (21 total):**

| Function | Endpoint | Returns |
|----------|----------|---------|
| `fetchTickers()` | GET /tickers | `Ticker[]` |
| `fetchHistory(symbol)` | GET /history/{symbol} | `OHLC[]` |
| `fetchOHLC(symbol, period)` | GET /ohlc/{symbol} | `OHLC[]` |
| `fetchFinancials(symbol)` | GET /financials/{symbol} | Financial statements |
| `fetchNews(symbol?)` | GET /news | News articles |
| `fetchSectors()` | GET /sectors | Sector performance |
| `fetchScreener(params)` | GET /screener | Filtered stocks |
| `fetchPortfolio()` | GET /portfolio | Portfolio data |
| `executeTrade(symbol, qty, side)` | POST /trade | Trade result |
| `fetchAIBriefing()` | GET /ai/briefing | AI analysis |
| `fetchCorporateActions(symbol?)` | GET /corporate-actions | Actions list |
| `fetchEconomicIndicators(limit)` | GET /economic-indicators | Indicators |
| `fetchFunds()` | GET /funds | `MutualFund[]` |
| `fetchFund(fundId)` | GET /funds/{id} | Single fund |
| `fetchFundNav(fundId, limit)` | GET /funds/{id}/nav | NAV history |
| `fetchInsiderTrading(limit)` | GET /insider-trading | Transactions |
| `fetchAnalystRatings(limit)` | GET /analyst-ratings | Ratings |
| `fetchMarketBreadth(limit)` | GET /market-breadth | Advance/decline |
| `fetchRatios(symbol)` | GET /ratios | Financial ratios |
| `fetchFairValues(symbol?)` | GET /fair-values | Target prices |
| `fetchOrderBook(symbol)` | GET /order-book/{symbol} | Level 2 quotes |

## 4.3 Key Components

### Global Search (`GlobalSearch.tsx`)

**Features:**
- Keyboard shortcut: `Cmd+K` / `Ctrl+K`
- Searches across: Stocks, Funds, Corporate Actions, Insider Trades
- Real-time filtering as you type
- Keyboard navigation support
- Deep linking to detail pages

**Search Categories:**
```typescript
interface SearchResult {
    type: "stock" | "fund" | "action" | "insider";
    id: string | number;
    title: string;
    subtitle: string;
    link: string;
}
```

### Multi-Timeframe Chart (`MultiTimeframeChart.tsx`)

**Technology:** TradingView Lightweight Charts 5.1

**Features:**
- Chart types: Candlestick, Line, Area
- Timeframes: 1M, 3M, 6M, 1Y, 3Y, 5Y, MAX
- Volume histogram overlay
- Technical indicators: SMA, Bollinger Bands
- Crosshair with price/time tooltip
- Responsive sizing

**Chart Configuration:**
```typescript
const chart = createChart(container, {
    layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#64748b',
    },
    grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
    },
    crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#10b981', width: 1, style: 2 },
        horzLine: { color: '#10b981', width: 1, style: 2 }
    }
});
```

### Sidebar Navigation (`Sidebar.tsx`)

**Structure:**
```typescript
const NAV_SECTIONS = [
    {
        title: "System",
        color: "orange",
        items: [
            { label: "Command Center", icon: Database, href: "/command-center", badge: "LIVE" },
        ]
    },
    {
        title: "Market Data",
        color: "blue",
        items: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/" },
            { label: "Stock Screener", icon: ScanLine, href: "/screener" },
            { label: "Market Intelligence", icon: TrendingUp, href: "/markets" },
            { label: "Market Pulse", icon: Activity, href: "/market-pulse" },
            { label: "Intraday Desk", icon: BarChart3, href: "/intraday" },
        ]
    },
    {
        title: "Investment Research",
        items: [
            { label: "Mutual Funds", icon: DollarSign, href: "/funds" },
            { label: "Shareholders", icon: Users, href: "/shareholders" },
            { label: "Analyst Ratings", icon: Star, href: "/analyst-ratings" },
            { label: "Insider Trading", icon: Activity, href: "/insider-trading" },
            { label: "Earnings", icon: TrendingUp, href: "/earnings" },
            { label: "Corporate Actions", icon: Grid3x3, href: "/corporate-actions" },
        ]
    },
    // ... more sections
];
```

---

# 5. DATABASE ARCHITECTURE

## 5.1 Core Tables

### market_tickers
```sql
CREATE TABLE market_tickers (
    symbol VARCHAR(20) PRIMARY KEY,
    name_en TEXT,
    name_ar TEXT,
    sector_name VARCHAR(100),
    last_price DECIMAL(12, 4),
    change DECIMAL(12, 4),
    change_percent DECIMAL(8, 4),
    volume BIGINT,
    market_cap DECIMAL(18, 4),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Records: 453
```

### ohlc_data
```sql
CREATE TABLE ohlc_data (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    date DATE NOT NULL,
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, date)
);
-- Records: 140,000+
-- Index: idx_ohlc_symbol_date (symbol, date DESC)
```

### intraday_ohlc
```sql
CREATE TABLE intraday_ohlc (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    interval VARCHAR(10) DEFAULT '1m',
    open DECIMAL(12, 4),
    high DECIMAL(12, 4),
    low DECIMAL(12, 4),
    close DECIMAL(12, 4),
    volume BIGINT,
    UNIQUE(symbol, timestamp, interval)
);
-- Records: 36,000+
-- Index: idx_intraday_symbol_time (symbol, timestamp DESC)
```

### financial_statements
```sql
CREATE TABLE financial_statements (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    fiscal_year INT NOT NULL,
    period_type VARCHAR(10) NOT NULL,  -- 'Q1', 'Q2', 'Q3', 'Q4', 'FY'
    
    -- Income Statement
    revenue DECIMAL(18, 4),
    gross_profit DECIMAL(18, 4),
    operating_income DECIMAL(18, 4),
    net_income DECIMAL(18, 4),
    eps DECIMAL(10, 4),
    
    -- Balance Sheet
    total_assets DECIMAL(18, 4),
    total_liabilities DECIMAL(18, 4),
    total_equity DECIMAL(18, 4),
    cash_and_equivalents DECIMAL(18, 4),
    
    -- Cash Flow
    operating_cash_flow DECIMAL(18, 4),
    investing_cash_flow DECIMAL(18, 4),
    financing_cash_flow DECIMAL(18, 4),
    
    UNIQUE(symbol, fiscal_year, period_type)
);
-- Records: 5,000+
```

### mutual_funds
```sql
CREATE TABLE mutual_funds (
    fund_id VARCHAR(50) PRIMARY KEY,
    fund_name TEXT NOT NULL,
    fund_type VARCHAR(100),
    manager_name TEXT,
    expense_ratio DECIMAL(8, 4),
    minimum_investment DECIMAL(18, 4),
    inception_date DATE,
    benchmark VARCHAR(100),
    sharpe_ratio DECIMAL(8, 4),
    standard_deviation DECIMAL(8, 4),
    ytd_return DECIMAL(8, 4),
    one_year_return DECIMAL(8, 4),
    three_year_return DECIMAL(8, 4),
    five_year_return DECIMAL(8, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Records: 582
```

### nav_history
```sql
CREATE TABLE nav_history (
    id SERIAL PRIMARY KEY,
    fund_id VARCHAR(50) NOT NULL REFERENCES mutual_funds(fund_id),
    date DATE NOT NULL,
    nav DECIMAL(12, 4) NOT NULL,
    aum DECIMAL(18, 4),
    units_outstanding DECIMAL(18, 4),
    UNIQUE(fund_id, date)
);
-- Records: 615,000+ (20+ years for some funds)
-- Index: idx_nav_fund_date (fund_id, date DESC)
```

## 5.2 Extended Tables

### corporate_actions
```sql
CREATE TABLE corporate_actions (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    action_type VARCHAR(50) NOT NULL,  -- 'DIVIDEND', 'SPLIT', 'RIGHTS', 'BONUS'
    announcement_date DATE,
    ex_date DATE,
    record_date DATE,
    payment_date DATE,
    dividend_amount DECIMAL(10, 4),
    dividend_currency VARCHAR(10) DEFAULT 'SAR',
    dividend_yield DECIMAL(8, 4),
    split_ratio VARCHAR(20),           -- '2:1', '1:10'
    raw_data JSONB,
    UNIQUE(symbol, action_type, ex_date)
);
```

### major_shareholders
```sql
CREATE TABLE major_shareholders (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    shareholder_name TEXT NOT NULL,
    shareholder_name_en TEXT,
    ownership_percent DECIMAL(8, 4),
    shares_held BIGINT,
    shareholder_type VARCHAR(50),      -- 'GOVERNMENT', 'INSTITUTION', 'INSIDER'
    as_of_date DATE,
    UNIQUE(symbol, shareholder_name, as_of_date)
);
-- Records: 900+
```

### analyst_ratings
```sql
CREATE TABLE analyst_ratings (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    analyst_firm VARCHAR(200),
    rating VARCHAR(50),                -- 'BUY', 'HOLD', 'SELL', 'OVERWEIGHT'
    target_price DECIMAL(12, 4),
    current_price DECIMAL(12, 4),
    upside_potential DECIMAL(8, 4),
    rating_date DATE,
    UNIQUE(symbol, analyst_firm, rating_date)
);
```

### earnings_calendar
```sql
CREATE TABLE earnings_calendar (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    fiscal_quarter VARCHAR(10),        -- 'Q1 2025', 'FY 2024'
    announcement_date DATE,
    eps_actual DECIMAL(10, 4),
    eps_estimate DECIMAL(10, 4),
    eps_surprise DECIMAL(10, 4),
    eps_surprise_percent DECIMAL(8, 4),
    revenue_actual DECIMAL(18, 4),
    revenue_estimate DECIMAL(18, 4),
    UNIQUE(symbol, fiscal_quarter)
);
-- Records: 2,500+
```

### financial_ratios_extended
```sql
CREATE TABLE financial_ratios_extended (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL REFERENCES market_tickers(symbol),
    fiscal_year INT NOT NULL,
    period_type VARCHAR(10) DEFAULT 'FY',
    
    -- Valuation (5)
    pe_ratio DECIMAL(10, 4),
    pb_ratio DECIMAL(10, 4),
    ps_ratio DECIMAL(10, 4),
    ev_ebitda DECIMAL(10, 4),
    price_to_fcf DECIMAL(10, 4),
    
    -- Profitability (6)
    gross_margin DECIMAL(8, 4),
    operating_margin DECIMAL(8, 4),
    net_margin DECIMAL(8, 4),
    roe DECIMAL(8, 4),
    roa DECIMAL(8, 4),
    roic DECIMAL(8, 4),
    
    -- Liquidity (3)
    current_ratio DECIMAL(8, 4),
    quick_ratio DECIMAL(8, 4),
    cash_ratio DECIMAL(8, 4),
    
    -- Leverage (3)
    debt_to_equity DECIMAL(10, 4),
    debt_to_assets DECIMAL(8, 4),
    interest_coverage DECIMAL(10, 4),
    
    -- Efficiency (3)
    asset_turnover DECIMAL(8, 4),
    inventory_turnover DECIMAL(8, 4),
    receivables_turnover DECIMAL(8, 4),
    
    -- Per Share (4)
    book_value_per_share DECIMAL(12, 4),
    tangible_book_per_share DECIMAL(12, 4),
    fcf_per_share DECIMAL(12, 4),
    dividend_per_share DECIMAL(10, 4),
    
    -- Growth (3)
    revenue_growth_yoy DECIMAL(8, 4),
    earnings_growth_yoy DECIMAL(8, 4),
    dividend_growth_yoy DECIMAL(8, 4),
    
    UNIQUE(symbol, fiscal_year, period_type)
);
-- 27 ratio columns
```

## 5.3 Trading Tables

### portfolios
```sql
CREATE TABLE portfolios (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) UNIQUE NOT NULL,
    cash_balance DECIMAL(18, 4) DEFAULT 1000000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### portfolio_holdings
```sql
CREATE TABLE portfolio_holdings (
    id SERIAL PRIMARY KEY,
    portfolio_id INT REFERENCES portfolios(id),
    symbol VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    average_price DECIMAL(12, 4) NOT NULL,
    UNIQUE(portfolio_id, symbol)
);
```

### trade_history
```sql
CREATE TABLE trade_history (
    id SERIAL PRIMARY KEY,
    portfolio_id INT REFERENCES portfolios(id),
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,         -- 'BUY', 'SELL'
    quantity INT NOT NULL,
    price DECIMAL(12, 4) NOT NULL,
    total_value DECIMAL(18, 4) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 5.4 Database Indexes

```sql
-- Performance indexes defined in schema_extended.sql
CREATE INDEX idx_corp_actions_symbol ON corporate_actions (symbol, ex_date DESC);
CREATE INDEX idx_shareholders_symbol ON major_shareholders (symbol, ownership_percent DESC);
CREATE INDEX idx_analyst_symbol ON analyst_ratings (symbol, rating_date DESC);
CREATE INDEX idx_technicals_symbol ON technical_levels (symbol, calc_date DESC);
CREATE INDEX idx_earnings_symbol ON earnings_calendar (symbol, announcement_date DESC);
CREATE INDEX idx_volume_symbol ON volume_statistics (symbol, stat_date DESC);
CREATE INDEX idx_ratios_ext_symbol ON financial_ratios_extended (symbol, fiscal_year DESC);
CREATE INDEX idx_index_history ON index_history (index_code, date DESC);
```

---

# 6. DATA EXTRACTION PIPELINE

## 6.1 Extractor Inventory

| Extractor | File | Lines | Purpose |
|-----------|------|-------|---------|
| **Stock Extractor** | `stock_extractor.py` | 355 | Main stock data from Mubasher |
| **Production Extractor** | `production_extractor.py` | 374 | WAF bypass, multi-strategy |
| **Deep Stock Extractor** | `deep_stock_extractor.py` | 285 | Enhanced stock profiles |
| **Fundamental Extractor** | `fundamental_extractor.py` | 244 | Financial statements |
| **Ratios Extractor** | `ratios_extractor.py` | 192 | 27 financial ratios |
| **Profile Extractor** | `profile_extractor.py` | 136 | Company profiles |
| **Earnings Extractor** | `earnings_extractor.py` | 177 | EPS calendar |
| **Dividend Extractor** | `dividend_extractor.py` | 178 | Dividend history |
| **Shareholder Extractor** | `shareholder_extractor.py` | 167 | Ownership data |
| **Fair Value Extractor** | `fairvalue_extractor.py` | 158 | Analyst targets |
| **Real Fund Extractor** | `real_fund_extractor.py` | 148 | Mutual fund data |
| **Fund History Extractor** | `fund_history_extractor.py` | 105 | NAV history |
| **Full History Extractor** | `full_history_extractor.py` | 185 | Historical OHLC |
| **News Extractor** | `news_extractor.py` | 124 | Market news |
| **Snapshot Extractor** | `snapshot_extractor.py` | 100 | Real-time prices |
| **Real Analyst Extractor** | `real_analyst_extractor.py` | 71 | Analyst ratings |
| **Real Insider Extractor** | `real_insider_extractor.py` | 122 | Insider trading |
| **Yahoo Real Data** | `yahoo_real_data.py` | 314 | Fallback source |

## 6.2 Production Extractor Architecture

**Primary Class: `ProductionDataExtractor`**

```python
class ProductionDataExtractor:
    """
    Production-grade real data extractor
    ZERO tolerance for simulated data
    """
    
    def __init__(self):
        self.stats = {
            "tickers_extracted": 0,
            "history_bars": 0,
            "api_calls": 0,
            "errors": 0
        }
        
    def _make_request(self, url: str, headers: dict = None):
        """Make HTTP request with WAF bypass"""
        # Uses tls_client for WAF bypass
        
    async def extract_tickers_playwright(self):
        """Extract using Playwright with stealth mode"""
        # Browser automation fallback
        
    async def extract_tickers_api(self):
        """Try multiple API endpoints"""
        # Direct API extraction
        
    async def extract_all_tickers(self):
        """Multi-strategy extraction"""
        # 1. Try API
        # 2. Fallback to Playwright
        
    async def store_all_data(self, tickers: List[Dict]):
        """Store in PostgreSQL with upsert"""
```

**Data Sources:**
1. **Primary:** mubasher.info API (`www.mubasher.info/api/1`)
2. **Secondary:** Yahoo Finance API
3. **Fallback:** Web scraping with Playwright

**WAF Bypass Techniques:**
- `tls_client` for TLS fingerprint spoofing
- Browser-like headers
- Request delays (rate limiting)
- Playwright stealth mode

## 6.3 Stock Extractor Details

```python
class RealStockExtractor:
    def __init__(self):
        self.base_url = "https://www.mubasher.info/api/1"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
            "Referer": "https://www.mubasher.info/markets/TDWL/stocks",
            "Origin": "https://www.mubasher.info"
        }
        
    async def fetch_all_tickers(self) -> List[Dict]:
        """
        Fetches from: /markets/TDWL/stocks
        Returns: 453 tickers with prices, changes, volumes
        """
        
    async def fetch_stock_history(self, symbol: str, period: str = "max"):
        """
        Fetches from: /stocks/{symbol}/chart
        Returns: Historical OHLC data
        """
        
    async def fetch_stock_profile(self, symbol: str):
        """
        Fetches from: /stocks/{symbol}/profile
        Returns: Company fundamentals
        """
```

---

# 7. API SPECIFICATION

## 7.1 Complete Endpoint Reference

### Health & System

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/` | Health check | `{"status": "ok", "db": "connected"}` |
| GET | `/stats` | Database stats | `{"total": 453}` |
| GET | `/dashboard/summary` | Full summary | All table counts |

### Market Data (12 endpoints)

| Method | Endpoint | Parameters | Description |
|--------|----------|------------|-------------|
| GET | `/tickers` | - | All 453 stocks |
| GET | `/history/{symbol}` | `limit=100` | OHLC history |
| GET | `/ohlc/{symbol}` | `period=1y` | Yahoo OHLC data |
| GET | `/intraday/{symbol}` | `interval=1m`, `limit=300` | Intraday bars |
| GET | `/order-book/{symbol}` | - | Level 2 quotes |
| GET | `/news` | `limit=20`, `symbol` | Market news |
| GET | `/sectors` | - | Sector performance |
| GET | `/screener` | `min_price`, `max_price`, `sector`, `sort_by`, `order` | Filtered stocks |
| GET | `/market-breadth` | `limit=30` | Advance/decline |
| GET | `/indices/{index_code}/constituents` | - | Index members |

### Investment Research (10 endpoints)

| Method | Endpoint | Parameters | Description |
|--------|----------|------------|-------------|
| GET | `/funds` | - | All 582 mutual funds |
| GET | `/funds/{fund_id}` | - | Single fund details |
| GET | `/funds/{fund_id}/nav` | `limit=365` | NAV history |
| GET | `/etfs` | - | ETF listings |
| GET | `/analyst-ratings` | `symbol`, `limit=100` | Buy/Sell ratings |
| GET | `/insider-trading` | `symbol`, `limit=100` | Insider activity |
| GET | `/shareholders` | `symbol`, `limit=100` | Ownership data |
| GET | `/earnings` | `symbol`, `limit=100` | EPS calendar |
| GET | `/fair-values` | `symbol`, `limit=100` | Target prices |
| GET | `/ratios` | `symbol`, `limit=100` | Financial ratios |

### Financials (2 endpoints)

| Method | Endpoint | Parameters | Description |
|--------|----------|------------|-------------|
| GET | `/financials/{symbol}` | - | Income/Balance/Cash flow + calculated margins |
| GET | `/corporate-actions` | `symbol`, `limit=100` | Dividends, splits |

### Trading (4 endpoints)

| Method | Endpoint | Body/Parameters | Description |
|--------|----------|-----------------|-------------|
| GET | `/portfolio` | - | Current holdings |
| POST | `/trade` | `{"symbol", "quantity", "side"}` | Execute trade |
| POST | `/reset_portfolio` | - | Reset to $1M |
| POST | `/backtest/run` | `{"symbol", "initial_capital", "rules"}` | Run backtest |

### AI (1 endpoint)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ai/briefing` | NLP analysis of last 50 headlines |

## 7.2 Response Examples

### GET /tickers
```json
[
    {
        "symbol": "1120",
        "name_en": "Al Rajhi Bank",
        "name_ar": "مصرف الراجحي",
        "sector_name": "Banks",
        "last_price": 95.50,
        "change": 0.75,
        "change_percent": 0.79,
        "volume": 5234567
    }
]
```

### GET /ohlc/1120?period=1m
```json
[
    {
        "date": "2024-12-26",
        "open": 95.00,
        "high": 96.20,
        "low": 94.80,
        "close": 95.50,
        "volume": 2345678
    }
]
```

### GET /ai/briefing
```json
{
    "themes": ["oil", "aramco", "earnings", "dividend", "growth"],
    "sentiment": "BULLISH",
    "score": 5,
    "summary": "Market focus: OIL, ARAMCO, EARNINGS. Sentiment: BULLISH"
}
```

### POST /trade
```json
// Request
{"symbol": "1120", "quantity": 100, "side": "BUY"}

// Response
{"status": "Trade Executed", "price": 95.50}
```

### POST /backtest/run
```json
// Request
{
    "symbol": "1120",
    "initial_capital": 100000,
    "rules": [
        {"indicator": "RSI_14", "operator": "<", "value": 30, "action": "BUY"},
        {"indicator": "RSI_14", "operator": ">", "value": 70, "action": "SELL"}
    ]
}

// Response
{
    "final_capital": 128456.78,
    "total_trades": 24,
    "trades": [...],
    "equity_curve": [{"time": "2024-01-01", "value": 100000}, ...]
}
```

---

# 8. AI/ML CAPABILITIES

## 8.1 Current Implementation

### Sentiment Analysis Engine

**Location:** `backend/ai_engine.py`

**Algorithm:** Keyword-based heuristic analysis

**Process:**
1. Aggregate last 50 news headlines
2. Clean text (remove punctuation, lowercase)
3. Filter 500+ stopwords
4. Count word frequency for theme extraction
5. Match against bullish/bearish keyword lists
6. Calculate net sentiment score
7. Classify: BULLISH (>2), NEUTRAL (-2 to 2), BEARISH (<-2)

**Limitations:**
- No contextual understanding
- No negation handling ("not bullish" treated as bullish)
- English only
- No entity recognition
- No temporal awareness

## 8.2 Technical Indicator Calculations

**Location:** `backend/backtest_engine.py`, `frontend/components/MultiTimeframeChart.tsx`

### Backend Calculations

| Indicator | Formula | Implementation |
|-----------|---------|----------------|
| **SMA** | Σ(Close[i]) / n | Rolling window average |
| **RSI** | 100 - (100 / (1 + RS)) | Wilder's smoothing method |

### Frontend Calculations (technicalindicators library)

| Indicator | Description |
|-----------|-------------|
| SMA | Simple Moving Average |
| Bollinger Bands | Mean ± 2σ bands |

## 8.3 Planned AI Enhancements

| Feature | Technology | Status |
|---------|------------|--------|
| FinBERT Sentiment | HuggingFace transformers | Planned |
| GPT-4 Natural Language Queries | OpenAI API | Planned |
| LSTM Price Prediction | TensorFlow/PyTorch | Planned |
| Anomaly Detection | Isolation Forest | Planned |
| Pattern Recognition | CNN | Planned |

---

# 9. AUTOMATION & SCHEDULING

## 9.1 Scheduler Architecture

**Two schedulers exist:**

### 1. Engine Scheduler (`backend/engine/scheduler.py`) - 75 lines

**Triggered:** Automatically when API starts (in daemon thread)

**Jobs:**
| Loop | Frequency | Task |
|------|-----------|------|
| Fast | Every 1 min | Market snapshots |
| Medium | Every 15 min | News extraction |
| Slow | Every 24 hours | Daily data sync |

### 2. Master Scheduler (`scheduler.py`) - 286 lines

**Triggered:** Manually via `python3 scheduler.py`

**Configuration:**
```python
# Market Hours Detection
MARKET_OPEN_HOUR = 10   # 10:00 AM AST
MARKET_CLOSE_HOUR = 15  # 3:00 PM AST
MARKET_DAYS = [0, 1, 2, 3, 6]  # Sun-Thu (Saudi week)
```

**Complete Job Schedule:**

| Job | Schedule | Extractor | Condition |
|-----|----------|-----------|-----------|
| Market Data | Every 15 min | `stock_extractor` | Market hours only |
| Intraday | Every 5 min | `production_stock_extractor` | Market hours only |
| Daily OHLC | 6:00 PM | `full_history_extractor` | Daily |
| Fund NAVs | 7:00 PM | `fund_history_extractor` | Daily |
| Earnings | 8:00 PM | `earnings_extractor` | Daily |
| Analyst Ratings | 9:00 PM | `real_analyst_extractor` | Daily |
| Insider Trading | 9:00 AM, 5:00 PM | `real_insider_extractor` | Twice daily |
| Financials | Friday 8:00 PM | `fundamental_extractor`, `ratios_extractor` | Weekly |
| Shareholders | Friday 10:00 PM | `shareholder_extractor` | Weekly |
| Full Sync | 2:00 AM | All extractors | Daily |
| Health Check | Every hour | Database/API ping | Hourly |

**Extractor Execution:**
```python
def run_extractor(extractor_name: str, log_suffix: str = ""):
    script_path = f"backend/extractors/{extractor_name}.py"
    
    result = subprocess.run(
        ['python3', script_path],
        capture_output=True,
        timeout=1800  # 30 minutes max
    )
    
    # Log output to logs/{extractor}_{suffix}.log
```

## 9.2 Startup Scripts

### start_all.sh
```bash
#!/bin/bash
# Starts both backend and frontend

# Backend API
cd backend
python3 -m uvicorn api:app --host 0.0.0.0 --port 8000 &

# Frontend
cd frontend
npm run dev &
```

### stop_all.sh
```bash
#!/bin/bash
# Kills all FinanceHub processes

lsof -ti:8000 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend
```

---

# 10. SYSTEM CAPABILITIES MATRIX

## 10.1 Feature Comparison (vs. Bloomberg Terminal)

| Feature | FinanceHub Pro | Bloomberg | Notes |
|---------|----------------|-----------|-------|
| Real-time Quotes | ✅ | ✅ | 15-min delay (delayed) |
| Historical OHLC | ✅ | ✅ | 5+ years |
| Candlestick Charts | ✅ | ✅ | TradingView style |
| Technical Indicators | ⚠️ Partial | ✅ | SMA, RSI only |
| Financial Statements | ✅ | ✅ | 27 ratios |
| Mutual Fund NAV | ✅ | ✅ | 20+ years history |
| Analyst Ratings | ✅ | ✅ | Buy/Sell/Hold |
| Insider Trading | ✅ | ✅ | Transactions |
| Earnings Calendar | ✅ | ✅ | EPS estimates |
| AI Sentiment | ⚠️ Basic | ✅ | Keyword-based |
| Natural Language Query | ❌ | ✅ | Planned |
| Paper Trading | ✅ | ⚠️ | Full simulation |
| Strategy Backtesting | ✅ | ✅ | RSI/SMA rules |
| Mobile App | ❌ | ✅ | Planned |
| Multi-Market | ❌ | ✅ | Saudi only |
| Arabic Language | ❌ | ✅ | Planned |

## 10.2 Data Coverage

| Data Type | Coverage | Update Frequency | Source |
|-----------|----------|------------------|--------|
| Stock Prices | 453/453 (100%) | 15 min during market | Mubasher |
| Daily OHLC | 453/453 (100%) | Daily 6 PM | Yahoo Finance |
| Intraday Bars | 50/453 (11%) | 5 min during market | Mubasher |
| Financial Statements | 450/453 (99%) | Quarterly | Mubasher |
| Mutual Fund NAV | 582/582 (100%) | Daily 7 PM | Mubasher |
| Analyst Ratings | 200/453 (44%) | Daily 9 PM | Mubasher |
| Insider Trading | 150/453 (33%) | Twice daily | Mubasher |
| Earnings Calendar | 400/453 (88%) | Daily 8 PM | Mubasher |
| Major Shareholders | 400/453 (88%) | Weekly Friday | Mubasher |

## 10.3 Performance Characteristics

| Metric | Current Value | Target |
|--------|---------------|--------|
| API Response Time (avg) | ~100-300ms | <100ms |
| Database Query Time (avg) | ~50-100ms | <50ms |
| Frontend Load (initial) | ~2-3s | <1.5s |
| Chart Render Time | ~100-200ms | <100ms |
| Concurrent Users | Unknown | 100+ |
| Daily API Requests | Unknown | 100,000+ |

## 10.4 Security Status ⚠️

| Security Control | Status | Risk Level |
|------------------|--------|------------|
| Authentication | ❌ None | 🔴 CRITICAL |
| Authorization (RBAC) | ❌ None | 🔴 CRITICAL |
| Rate Limiting | ❌ None | 🔴 CRITICAL |
| Input Validation | ❌ None | 🟠 HIGH |
| SQL Injection Prevention | ⚠️ Parameterized | 🟡 MEDIUM |
| HTTPS | ❌ None | 🔴 CRITICAL |
| CORS | ⚠️ localhost only | 🟡 MEDIUM |
| API Keys | ❌ None | 🔴 CRITICAL |
| Secrets Management | ❌ Hardcoded | 🔴 CRITICAL |
| Logging/Monitoring | ⚠️ Basic | 🟠 HIGH |

---

# 📋 APPENDIX: FILE INVENTORY

## Backend Files (90 files)

```
backend/
├── api.py                      # 549 lines - Main API
├── database.py                 # 44 lines - DB connection
├── ai_engine.py                # 52 lines - Sentiment
├── backtest_engine.py          # 168 lines - Backtesting
├── orchestrator.py             # 251 lines - Extraction orchestrator
├── schema.sql                  # Base schema
├── schema_extended.sql         # Extended schema (10 tables)
├── schema_enterprise.sql       # Enterprise additions
├── extractors/                 # 24 Python scripts
├── engine/                     # Scheduler engine
├── calculators/                # Financial calculations
└── [50+ helper/debug files]
```

## Frontend Files (42 files)

```
frontend/
├── app/                        # 23 files (pages + layout)
├── components/                 # 17 React components
├── lib/api.ts                  # API client
└── config files                # 7 configuration files
```

## Documentation Files

```
mubasher-deep-extract/
├── README.md                   # Quick start guide
├── ENTERPRISE_TRANSFORMATION_PLAN.md  # Previous analysis
├── WORLD_CLASS_ENTERPRISE_ANALYSIS.md # Strategic analysis
├── IMPLEMENTATION_ROADMAP.md   # Week-by-week plan
├── SYSTEM_TECHNICAL_REPORT.md  # This document
└── [10+ other planning docs]
```

---

*End of Technical System Report*  
*Generated: December 26, 2024*  
*FinanceHub Pro v1.0*
