# Professional Comprehensive Plan: Egyptian Stock Market Data Integration

## 1. Executive Summary
This plan details the "World Class" integration of Egyptian Stock Market (EGX) data from `stockanalysis.com` into the `mubasher-deep-extract` system. The goal is to achieve 100% data coverage (Financials, Statistics, Profiles, Dividends, History) with zero errors, ensuring a robust, premium user experience.

## 2. Data Source Analysis
**Source**: `stockanalysis.com`
**Market**: Egypt (EGX)
**URL Pattern**: `https://stockanalysis.com/quote/egx/[SYMBOL]/`
**Data Availability**:
- **market_tickers**: ~200+ Active Companies (Symbol, Name, Sector, Market Cap).
- **financial_statements**: Annual & Quarterly (Income Statement, Balance Sheet, Cash Flow).
- **statistics**: Valuation (PE, PB), Profitability (Margins, ROE), Price History Stats.
- **dividends**: Historical payment dates, amounts, and yields.
- **company_profiles**: Business summary, website, industry, employees.
- **history**: Daily OHLCV data.

**Reliability**:
- The site uses standard HTML Tables (`<table>`), making it highly durable against structural changes.
- URLs are predictable based on Symbol.

## 3. Database Architecture Enhancements
The current Schema is split across `schema_complete.sql` (Base), `schema_enterprise.sql` (Financials/Profiles), and `schema_extended.sql` (Ratios).

**Gap Analysis**:
- `dividend_history`: Referenced in API but missing from DDL. We will create a robust `dividend_history` table or use `corporate_actions` effectively.
- `currency`: Ensure `market_tickers` and `financial_statements` correctly reflect 'EGP'.

**Schema Updates**:
```sql
-- Ensure currency column covers EGP
ALTER TABLE market_tickers ALTER COLUMN currency SET DEFAULT 'SAR'; -- Keep default but we will insert 'EGP'

-- Dedicated Dividend History Table (if not exists)
CREATE TABLE IF NOT EXISTS dividend_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) REFERENCES market_tickers(symbol),
    ex_date DATE,
    payment_date DATE,
    record_date DATE,
    amount DECIMAL(12, 4),
    dividend_yield DECIMAL(8, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, ex_date)
);
```

## 4. Extraction Module Development (`backend/extractors/egx_loader.py`)
We will build a modular, class-based extractor using `requests` and `BeautifulSoup`.

### 4.1 Class Structure
```python
class EGXExtractor:
    BASE_URL = "https://stockanalysis.com"
    
    def get_all_tickers(self) -> List[Dict]:
        """Scrapes /stocks/country/egypt/ for initial list"""
        pass

    def get_profile(self, symbol: str) -> Dict:
        """Scrapes Overview tab for profile/sector info"""
        pass
        
    def get_financials(self, symbol: str) -> List[Dict]:
        """Scrapes Financials tab (Annual & Quarterly)"""
        pass
        
    def get_statistics(self, symbol: str) -> Dict:
        """Scrapes Statistics tab for Ratios"""
        pass
        
    def get_dividends(self, symbol: str) -> List[Dict]:
        """Scrapes Dividends tab"""
        pass
```

### 4.2 Data Normalization
- **Currency**: Convert all monetary values to numeric (remove 'EGP', 'B', 'M' suffixes).
- **Dates**: Standardize to `YYYY-MM-DD`.
- **Zeros/Nulls**: Handle dashes `'-'` as `None` or `0` appropriately.

## 5. Integration Strategy
1.  **Phase 1: Ticker Population**
    -   Run `get_all_tickers()` to populate `market_tickers` with `market_code = 'EGX'`.
2.  **Phase 2: Deep Data Extraction**
    -   Iterate through all EGX symbols.
    -   Map data to `financial_statements`, `financial_ratios`, `company_profiles`, `dividend_history`.
    -   Use `upsert` (INSERT ON CONFLICT UPDATE) logic to prevent duplicates.
3.  **Phase 3: Automation**
    -   Add `update_egx_market()` job to `backend/engine/scheduler.py` to run Daily.

## 6. Execution Plan
1.  **Database**: Execute schema patch for `dividend_history`.
2.  **Code**: Implement `backend/extractors/egx_loader.py`.
3.  **Runner**: Create `scripts/load_egx_data.py` for immediate execution and validaton.
4.  **Verify**: Check API endpoints (`/financials/COMI`, `/api/company/COMI/profile`).

## 7. Zero Error Fail-Safes
-   **Retry Logic**: Implement exponential backoff for network requests.
-   **Validation**: Drop records with missing critical fields (e.g., Dates).
-   **Logging**: Detailed logs in `extract_egx.log`.
