# Deep Analysis & Plan: Sector Data Immunization

**Date:** 2026-01-26
**To:** Project Stakeholders
**Subject:** Plan to Permanently Block Automated Sector Updates

---

## 1. Objective
To modify the backend automation pipeline ensuring that **Automated Scrapers** (Mubasher/StockAnalysis) are **strictly prohibited** from updating or modifying the `sector_name` column in the `market_tickers` database table. 

The `sector_name` column must be treated as **ReadOnly** for the scraper, reservable ONLY for the Master Excel File (`EGX Stocks Sectors.xlsx`).

---

## 2. Threat Analysis (Audit of Automated Scripts)

We analyzed the codebase to identify every script that interacts with the `sector_name` column.

| Script | Function | Current Behavior | Verdict (Action Required) |
| :--- | :--- | :--- | :--- |
| **`data_pipeline/market_loader.py`** | **Daily Production Loader** | **Active Threat.** Upserts `sector_name` daily, overwriting static data. | **🔴 MUST FIX** |
| `scripts/load_egx_data.py` | Legacy Loader | **Neutralized.** The line is currently commented out (`-- sector_name = ...`). | 🟢 SAFE |
| `scripts/scrape_egx_metadata.py` | Metadata Scraper | **Safe.** Updates `industry`, `pe`, `market_cap` but **does not** include `sector_name` in the UPDATE query. | 🟢 SAFE |
| `scripts/fix_arabic_names.py` | Name Fixer | **Safe.** Only updates `name_ar`. | 🟢 SAFE |
| `scripts/update_egx_sectors.py` | **Master Seeder** | **Authorized.** This is the "Good" script that applies the Excel file. | 🔵 KEEP (Whitelisted) |

---

## 3. The Immunization Plan

We will perform a surgical modification to `backend-core/data_pipeline/market_loader.py`.

### Current Logic (Vulnerable)
The automated loader executes an `INSERT ... ON CONFLICT UPDATE` query.
Currently, the `ON CONFLICT` clause looks like this:
```sql
ON CONFLICT (symbol) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    sector_name = EXCLUDED.sector_name,  <-- VULNERABILITY
    market_code = EXCLUDED.market_code,
    ...
```
This forces the database to accept whatever value the scraper found (often NULL or generic), overwriting your work.

### Proposed Logic (Immunized)
We will **delete** the `sector_name` line from the `UPDATE` clause entirely.

```sql
ON CONFLICT (symbol) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    -- sector_name REMOVED from here. The DB value remains untouched.
    market_code = EXCLUDED.market_code,
    ...
```

### Impact on New Stocks (INSERT)
For *newly discovered* stocks (INSERT), we will also **block** the scraper from assigning a sector.
*   **Behavior**: New stocks will enter the system with `sector_name = NULL`.
*   **Correction**: You will add the new stock to your `EGX Stocks Sectors.xlsx` file and run the Seeder Script.
*   **Benefit**: Guaranteed data purity. No "junk" sectors ever enter the system.

---

## 4. Execution Steps

1.  **Modify `backend-core/data_pipeline/market_loader.py`**:
    *   Remove `sector_name` from the `INSERT` column list.
    *   Remove `sector_name` from the `VALUES` list.
    *   Remove `sector_name` from the `UPDATE SET` list.
    *   Remove parsing logic for `sector_name` (optional, for cleanup).

2.  **Verify**:
    *   Run a test update.
    *   Confirm `sector_name` remains unchanged for existing stocks.

3.  **Deployment**:
    *   Push changes to production.
    *   The "Ghost" issue becomes technically impossible.

---

## 5. Approval Request
This plan adheres to your strict requirement: **"Never touch or update the sectors existing tables"**.

**Do you approve implementing these changes to `market_loader.py`?**
