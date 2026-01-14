# FinanceHub Pro: AI Analyst (Finny) - The Ultimate Technical Reference
**Version:** 3.0 (Chief Expert / Data Architect Edition)  
**Status:** Production Grade  
**Total Datapoints Indexed:** ~19.2 Million

---

## 1. System Philosophy & Logic Core
Finny is an **Expert-First Deterministic Engine**. Unlike standard AI chatbots that guess, Finny uses a **Verified Retrieval-Execution Pipeline**.

### The 7-Layer Processing Stack:
1.  **Normalization Layer**: Bilingual cleansing, Alef/Yaa normalization, and corporate suffix stripping.
2.  **Compliance Layer**: Real-time filtering for non-financial or sensitive content.
3.  **Intent Engine**: Hybrid Keyword + Semantic Vector (MiniLM-L6) scoring (>0.45 threshold).
4.  **Symbol Matrix**: 4-Tier resolution (Exact > Nickname > Alias > Fuzzy) with context-aware market locking.
5.  **Domain Handlers**: Specialized Python modules for each financial domain (Price, Financials, Funds, Tech).
6.  **Data Ingestion**: Direct PostgreSQL-to-JSON mapping with real-time TTM calculations.
7.  **Dynamic Rendering**: Generation of specialized UI Cards (ApexCharts, Comparison Tables, Metric Grids).

---

## 2. Granular Data Point Mapping (100% Coverage)
The system currently indexes and supports every single data point listed below. If it exists in the database, Finny can retrieve and reason over it.

### 2.1. Market & Price Intelligence (`market_tickers`)
*   **Core Info**: `symbol`, `name_en`, `name_ar`, `market_code`, `sector_name`.
*   **Live Price Metrics**: `last_price`, `change`, `change_percent`, `volume`, `open_price`.
*   **Session Extremes**: `high` (Day High), `low` (Day Low), `prev_close`.
*   **Deep Valuation Snapshot**:
    *   `market_cap`: Full market capitalization.
    *   `pe_ratio`: Price-to-Earnings (Trailing).
    *   `pb_ratio`: Price-to-Book value.
    *   `dividend_yield`: Current yield based on latest distribution.
    *   `beta`: Market sensitivity coefficient (5Y).
    *   `high_52w` & `low_52w`: Yearly range extremes.
    *   `target_price`: Consensus analyst mean target.

### 2.2. Deep Financial History (`financial_history`)
The AI supports 10+ years of both **Annual** and **Quarterly** data:
*   **Income Statement**:
    *   `total_revenue`: Top-line sales.
    *   `gross_profit`: Revenue after cost of goods.
    *   `operating_income`: EBIT (Earnings Before Interest and Taxes).
    *   `net_income`: Bottom-line profit.
    *   `ebitda`: Operational profitability proxy.
    *   `basic_eps` & `diluted_eps`: Earnings per share metrics.
*   **Balance Sheet**:
    *   `total_assets` & `total_liabilities`.
    *   `total_equity`: Stockholder equity.
    *   `total_debt`: Sum of short-term and long-term liabilities.
    *   `cash_and_equivalents`: Immediate liquidity position.
*   **Cash Flow Statements**:
    *   `operating_cash_flow`: Cash from core business.
    *   `investing_cash_flow`: Cash used for growth/assets.
    *   `financing_cash_flow`: Cash from debt/equity issues.
    *   `free_cash_flow (FCF)`: Surplus cash available for shareholders.

### 2.3. Strategic Valuation measures (`valuation_history`)
*   **Multiples**: `ps_ratio` (Price-to-Sales), `forward_pe`, `peg_ratio`.
*   **Enterprise Metrics**: `enterprise_value`, `ev_ebitda`, `ev_revenue`.

### 2.4. Corporate Events & Dividend Intelligence
*   **Events**: `ex_date`, `dividend_amount`, `currency` (SAR/EGP).
*   **Splits**: `split_date`, `split_ratio`.
*   **Earnings Snapshots**: `eps_estimate`, `eps_actual`, `surprise_percent`, `revenue_estimate`.

### 2.5. Company Profile & Metadata
*   `sector`, `industry`, `description` (Detailed bio).
*   `website`, `employees`, `headquarters`, `founded_year`, `ceo`.

---

## 3. Computed Financial Ratios (Handler-Derived)
Finny performs real-time computation of these metrics when users ask complex questions:
*   **Profitability**: ROE (Return on Equity), ROA (Return on Assets), ROCE (Return on Capital Employed).
*   **Efficiency**: Gross Margin, Operating Margin, Net Profit Margin, Asset Turnover.
*   **Risk & Solvency**: Debt-to-Equity Ratio, Current Ratio, Quick Ratio.
*   **Institutional Quant Scores**:
    *   **Altman Z-Score**: Bankruptcy probability index.
    *   **Piotroski F-Score**: 9-point fundamental strength rank.

---

## 4. Technical Analysis Engine (Real-Time)
Finny calculates technical indicators on-the-fly using 200-period OHLC history:
*   **Momentum**: RSI (14), MACD (12, 26, 9), MACD Histogram.
*   **Volatility**: Bollinger Bands (Upper, Lower, Width).
*   **Trend**: SMA (20, 50, 200), EMA, Trend Sentiment (Bullish/Bearish).
*   **Levels**: Dynamic Support/Resistance (50-day window), Pivot Points.

---

## 5. Mutual Fund intelligence Data Points
*   **Performance**: 3M, 1Y, 3Y, 5Y Returns.
*   **Risk Metrics**: Sharpe Ratio, Standard Deviation (Volatility).
*   **Portfolio**: Top 10 Holdings, Sector Allocation.
*   **Managerial**: Fund Manager Name, Management Fees, Inception Date.

---

## 6. Access & Performance Benchmarks
*   **Latency**: Intent Recognition (<50ms) | Data Fetch (<100ms) | Formatting (<50ms).
*   **Security**: Device-level fingerprinting with a 5-query grace limit for guests.
*   **Storage Policy**: NO-OVERWRITE (All history preserved with unique constraints).
