# Feasibility Analysis: "Sector Isolation Strategy" (New Table)

**Date:** 2026-01-26
**To:** Product Owner
**From:** Chief Architect

---

## 1. The Proposal
**Concept:** Create a dedicated table (e.g., `ticker_classifications`) to store the static sector data.
**Goal:** Decouple the "Sector Truth" from the "Volatile Market Data" (`market_tickers`).
**Mechanism:** The Chatbot will query this new table for classification, effectively ignoring the `sector_name` column in `market_tickers` that gets overwritten by scrapers.

---

## 2. Chief Expert Assessment: **STRONGLY ENDORSED**

This is not just a "good idea"—it is a standard **Data Warehousing Best Practice** (Separation of Dimensions and Facts).

*   **`market_tickers` (Fact Table)**: Should store fast-changing, objective data (Price, Volume, PE Ratio).
*   **`ticker_classifications` (Dimension Table)**: Should store slow-changing, subjective/expert data (Sector, Industry, Tags).

### Why this is superior to the current method:
1.  **Immunity**: The daily scraper scripts (`market_loader.py`) literally *cannot* break this. They don't know the new table exists.
2.  **Zero-Risk Updates**: You can re-run the daily scraper 100 times a day; your sectors will remain perfect.
3.  **Clean Architecture**: It separates "What the market says" (Price) from "What we say" (Classification).

---

## 3. Implementation Blueprint

### Step A: Database Schema (Supabase)
We create a simple, lightweight table.
```sql
CREATE TABLE ticker_classifications (
    symbol TEXT PRIMARY KEY,
    sector_name TEXT NOT NULL,
    industry_name TEXT,
    CONSTRAINT fk_symbol FOREIGN KEY (symbol) REFERENCES market_tickers(symbol)
);
```

### Step B: The Seeder Script
We slightly modify your existing `update_egx_sectors.py` (The "Good" script).
*   **Old Logic**: `UPDATE market_tickers SET sector_name = ...`
*   **New Logic**: `INSERT INTO ticker_classifications (symbol, sector_name) VALUES ... ON CONFLICT UPDATE`

### Step C: The Chatbot Logic (`screener_handler.py`)
This is the only code change required in the app logic. We change the SQL query from a simple SELECT to a JOIN.

**Current Query (Vulnerable):**
```sql
SELECT symbol, last_price FROM market_tickers 
WHERE sector_name = 'Banks'
```

**New Query (Bulletproof):**
```sql
SELECT t.symbol, t.last_price 
FROM market_tickers t
JOIN ticker_classifications c ON t.symbol = c.symbol
WHERE c.sector_name = 'Banks'
```

---

## 4. Potential Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **New IPOs** | A new stock lists on EGX (e.g., `NEWCO`). It appears in `market_tickers` but not `ticker_classifications`. Chatbot ignores it. | **Acceptable**. New stocks need manual classification anyway. We can add a "Missing Sector Report" check. |
| **Performance** | JOINs are slightly slower than single-table lookups. | **Negligible**. For ~300 stocks, the performance difference is nanoseconds. |
| **Code Complexity** | We must update `screener_handler.py` to use JOINS. | **Low**. It's a standard SQL pattern. |

---

## 5. Final Verdict

**This is the correct long-term solution.**
It removes the "Race Condition" where two scripts fight over the same column. It preserves your "Smart Data" (Excel) while allowing the "Dumb Scraper" to do its job without breaking anything.

**Recommendation:** Proceed with this implementation. It requires:
1.  1 SQL Migration (Create Table).
2.  1 Script Update (The Seeder).
3.  1 Handler Update (The Chatbot).
