# Saudi Market Data Expansion Plan (Phase 4+)
**Generated:** December 29, 2025
**Status:** 📋 **PLANNING**

---

## 1. Current Collection Status ✅

| Data Type | Status | Records |
|-----------|--------|---------|
| Daily OHLC (10 years) | ✅ Complete | 498,251 |
| Intraday 1-Hour (2 years) | ✅ Complete | 909,396 |
| Intraday 5-Min (60 days) | ✅ Complete | 811,691 |
| Annual Financial Statements | ✅ Complete | 6,133 |
| Company Profiles | ✅ Complete | 383 |
| Market Cap/PE/Beta | ✅ Complete | 388 |
| **TOTAL** | ✅ | **3.23M rows** |

---

## 2. Available Data NOT Yet Collected 🔍

Based on API probe of Saudi stocks, the following modules are **AVAILABLE but NOT COLLECTED**:

### 📊 HIGH VALUE - Recommended for Phase 4

| Module | Description | Data Points | Priority |
|--------|-------------|-------------|----------|
| `balanceSheetHistoryQuarterly` | Quarterly balance sheets (Assets, Liabilities, Equity) | ~4 quarters × 453 stocks | 🔴 HIGH |
| `cashflowStatementHistoryQuarterly` | Quarterly cash flows (Operating, Investing, Financing) | ~4 quarters × 453 stocks | 🔴 HIGH |
| `incomeStatementHistoryQuarterly` | Quarterly income statements | ~4 quarters × 453 stocks | 🔴 HIGH |
| `recommendationTrend` | Buy/Hold/Sell analyst recommendations | ~453 stocks | 🔴 HIGH |
| `earningsTrend` | EPS estimates and trends | ~453 stocks | 🔴 HIGH |

### 📈 MEDIUM VALUE - Phase 5

| Module | Description | Data Points | Priority |
|--------|-------------|-------------|----------|
| `institutionOwnership` | Major institutional holders | ~10 per stock | 🟠 MEDIUM |
| `fundOwnership` | Mutual fund ownership | ~10 per stock | 🟠 MEDIUM |
| `majorHoldersBreakdown` | % held by insiders vs institutions | 1 per stock | 🟠 MEDIUM |
| `netSharePurchaseActivity` | Insider buying/selling activity | 1 per stock | 🟠 MEDIUM |
| `earningsHistory` | Historical EPS vs estimates | ~4 quarters × 453 | 🟠 MEDIUM |

### 📊 LOWER VALUE - Phase 6

| Module | Description | Priority |
|--------|-------------|----------|
| `calendarEvents` | Ex-dividend dates, earnings dates | 🟡 LOW |
| `indexTrend` | Index performance estimates | 🟡 LOW |
| `industryTrend` | Industry performance estimates | 🟡 LOW |
| `sectorTrend` | Sector performance estimates | 🟡 LOW |
| `financialData` | Additional ratios (already partial) | 🟡 LOW |

### ❌ UNAVAILABLE for Saudi Stocks

| Module | Reason |
|--------|--------|
| `esgScores` | Not tracked for Saudi market |
| `secFilings` | SEC is US-only |
| `upgradeDowngradeHistory` | Limited analyst coverage |
| `topHoldings` | For ETFs only |
| `fundProfile` | For funds only |

---

## 3. Phase 4 Implementation Plan

### 3.1 Quarterly Financials Collection

**Script:** `local_phase4_quarterly.py`

**Target Tables:**
- `financial_statements` (with `period_type='Quarterly'`)

**Data to Collect:**
```
- Balance Sheet: Total Assets, Total Liabilities, Total Equity, Cash, Debt
- Income Statement: Revenue, Net Income, Operating Income, EPS
- Cash Flow: Operating CF, Investing CF, Financing CF, Free Cash Flow
```

**Estimated Records:** ~7,248 (4 quarters × 453 stocks × 4 years)

### 3.2 Analyst & Earnings Data

**Script:** `local_phase4_analysts.py`

**Target Tables:**
- `analyst_ratings` (recommendations)
- `earnings_history` (EPS history)

**Data to Collect:**
```
- Recommendation Trends: Strong Buy, Buy, Hold, Sell, Strong Sell counts
- EPS Estimates: Current Quarter, Next Quarter, Current Year, Next Year
- EPS History: Actual vs Estimate for past 4 quarters
```

### 3.3 Ownership Data

**Script:** `local_phase4_ownership.py`

**Target Tables:**
- `major_shareholders`
- `institutional_holders` (new table)

**Data to Collect:**
```
- Top 10 Institutional Owners: Name, Shares, % Held, Date
- Insider Holdings: Name, Position, Shares Held
- Ownership Breakdown: % Insiders, % Institutions, % Public Float
```

---

## 4. Database Schema Additions Required

```sql
-- For quarterly financials (reuse existing table with period_type='Quarterly')

-- For institutional holders (new table)
CREATE TABLE IF NOT EXISTS institutional_holders (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20),
    holder_name TEXT,
    shares_held BIGINT,
    percent_held NUMERIC,
    value NUMERIC,
    as_of_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, holder_name, as_of_date)
);

-- For earnings history (reuse existing table)
```

---

## 5. Execution Timeline

| Phase | Data Type | Est. Records | Est. Time | Priority |
|-------|-----------|--------------|-----------|----------|
| **Phase 4A** | Quarterly Financials | ~7,200 | ~3 hours | 🔴 HIGH |
| **Phase 4B** | Analyst/Earnings | ~1,800 | ~1 hour | 🔴 HIGH |
| **Phase 5** | Ownership Data | ~4,500 | ~2 hours | 🟠 MEDIUM |
| **Phase 6** | Calendar/Trends | ~1,400 | ~1 hour | 🟡 LOW |

**Total Additional Data:** ~15,000 high-value records

---

## 6. Summary

### What You Have Now:
- ✅ 3.23 Million rows of price and fundamental data
- ✅ 10 years of daily OHLC history
- ✅ 2 years of hourly intraday data
- ✅ Annual financial statements

### What You Can Add:
- 📊 Quarterly financial statements (~7,200 records)
- 📈 Analyst recommendations & earnings estimates
- 👥 Institutional ownership data
- 📅 Earnings calendar and dividend dates

### Recommendation:
**Start with Phase 4A (Quarterly Financials)** - This provides the most analytical value with quarterly breakdowns of revenue, income, and cash flows.

---
**Report Generated by Antigravity**
