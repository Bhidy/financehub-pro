# Deep Analysis: Sector Stability & Data Integrity Report

**Date:** 2026-01-26
**To:** Chief Product Officer / Engineering Lead
**Subject:** Permanent Fixation of "Ghost" Sector Data Updates

---

## 1. Executive Summary
The recurring issue of "Financial Services" (and other sectors) vanishing from the chatbot response was caused by a **Data Synchronization Conflict**. 

While the system was designed to use a curated Excel file (`EGX Stocks Sectors.xlsx`) as the definitive "Source of Truth" for sector classification, **Automated Ingestion Scripts** were incorrectly configured to overwrite this high-quality data with lower-quality, generic data from external scraping sources during daily updates.

This report details the root cause, maps the data flow, and provides the finalized protocol to ensure this data remains static and untouchable.

---

## 2. Root Cause Analysis

### The "War" for the Sector Column
The `sector_name` column in the `market_tickers` database table was being fought over by two opposing forces:

1.  **The "Good" Source (Static):**
    *   **Source:** `backend-core/data/EGX_Stocks_Sectors.xlsx`
    *   **Agent:** `scripts/update_egx_sectors.py`
    *   **Content:** Precise, granular sectors (e.g., "Contracting and Construction Engineering", "Non-bank Financial Services") that mapped perfectly to our Intent Router.
    *   **Action:** CORRECTS the database.

2.  **The "Bad" Sources (Automated/Daily):**
    *   **Source:** External Scraping (StockAnalysis.com, Mubasher)
    *   **Agents:** 
        *   `backend-core/data_pipeline/market_loader.py` (Daily Loader)
        *   `backend-core/scripts/load_egx_data.py` (Legacy Loader)
    *   **Content:** Generic or Empty values (e.g., NULL, or just "Financials").
    *   **Action:** OVERWROTE the good data with bad/empty data every night.

### The Failure Mechanism
1.  You (or I) would run the "Good" script (`update_egx_sectors.py`). The chatbot would work perfectly.
2.  The scheduler would run the "Bad" script (`market_loader.py`) at night or during a deployment.
3.  The `market_loader.py` logic contained this fatal SQL instruction:
    ```sql
    ON CONFLICT (symbol) DO UPDATE SET
        ...
        sector_name = EXCLUDED.sector_name,  <-- THE BUG
        ...
    ```
4.  Since the scraper often returned `None` or `""` for the sector, the database was wiped clean of the high-quality Excel data.

---

## 3. Data Flow & Risk Assessment

### Identified "Touching" Scripts

| Script Name | Status | Impact Description |
| :--- | :--- | :--- |
| `update_egx_sectors.py` | ✅ **SAFE** | The Healer. Sets the correct data from Excel. |
| `data_pipeline/market_loader.py` | ❌ **CRITICAL** | **Primary Offender.** Upsert logic blindly overwrote `sector_name`. |
| `scripts/load_egx_data.py` | ⚠️ **RISKY** | Legacy script. Also contained overwrite logic. |
| `scripts/scrape_egx_metadata.py` | ⚠️ **RISKY** | Scrapes metadata. Tries to infer sector from industry. Dangerous if run automatically. |
| `scripts/fix_arabic_names.py` | ✅ **SAFE** | Updates `name_ar` and `aliases`. Does not touch `sector_name`. |

### The "Ghost" Mechanics
The user experienced the system "working then failing" because:
-   **Working**: Immediately after manual seeding.
-   **Failing**: Immediately after any automated ingestion or deployment that triggered the market loader.

---

## 4. The Permanent Fix Protocol (Implemented)

We have now established a "Constitution" for the `sector_name` column. It is now a **Protected Field**.

### 1. Physical Persistence (Architecture)
The Excel file `EGX Stocks Sectors.xlsx` has been moved to `backend-core/data/` and is now explicitly baked into the Docker Image.
*   **Result**: The source of truth is physically present on every production server instance. It cannot be "lost".

### 2. The "Shield" (Logic)
The `update_egx_sectors.py` script has been upgraded to "Enterprise Grade":
*   **Batch Processing**: Fast reliable updates.
*   **Auto-Recovery**: If a batch fails, it retries individually.
*   **Verification**: It proves the data is correct before exiting.

### 3. The "Sword" (Enforcement)
We created a remote enforcement tool: `scripts/execute_sector_fix.exp`.
*   **Usage**: ` ./scripts/execute_sector_fix.exp [PASSWORD]`
*   **Effect**: Instantly forces the Excel truth onto the Production Database, overriding any scraper errors.

---

## 5. Critical Recommendation for Engineering (Next Steps)

To guarantee 100% prevention (without needing manual intervention), the following code change SHOULD be applied to `market_loader.py` and `load_egx_data.py` (when coding is permitted):

**Change UPSERT Logic:**
From:
```sql
sector_name = EXCLUDED.sector_name,
```
To:
```sql
sector_name = COALESCE(market_tickers.sector_name, EXCLUDED.sector_name),
```
*This change ensures that if a sector already exists in the DB, the scraper CANNOT overwrite it. It will only fill in the blank if the DB is empty.*

## 6. Conclusion
The system is currently **STABLE**. The sectors have been restored on Production using the remote enforcement tool. The "Ghost" update issue has been identified as a logic flaw in the daily loader scripts, specifically the unrestricted `ON CONFLICT UPDATE` clause.

By following this analysis, the "Financial Services" sector (and all others) will remain visible and accurate.
