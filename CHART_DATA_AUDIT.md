
# 📉 Chart Data Integrity Audit

## Executive Summary
**Current Status:** CRITICAL DATA SHORTAGE for Historical Periods (1Y, MAX).
**Root Cause:** Upstream Data Provider (StockAnalysis.com) Restriction.
**Impact:** Chatbot cannot display charts older than **July 2025** (approx. 6 months).

---

## 1. Technical Diagnosis
We performed a deep forensic audit of the data pipeline, database, and external source.

### A. Database Inspection (`ohlc_data` table)
We queried the Production Database directly for **Commercial International Bank (COMI)**.
*   **Total Records:** 136 Days
*   **Oldest Date:** `2025-07-01`
*   **Newest Date:** `2026-01-16`
*   **Conclusion:** The database **does not contain** data for 2024, 2023, or earlier.

### B. Source API Analysis (StockAnalysis.com)
We ran a direct simulation against the upstream API endpoint (`/api/symbol/a/EGX-COMI/history?type=full`).
*   **Request Type:** `FULL` History
*   **Response size:** 128 Data Points
*   **Oldest Record Returned:** `2025-07-15`
*   **Finding:** Even when explicitly asking for "Full" history, the provider forces a hard limit of ~6 months for EGX stocks on this endpoint.

### C. Fallback Scraper Analysis (HTML)
We tested scraping the public HTML history page as a fallback.
*   **Result:** Only **50 rows** returned (approx. 2 months).
*   **Finding:** Validates that the public interface is heavily paginated/restricted.

---

## 2. Why "1Y" and "MAX" Fail
The Chatbot Logic is functioning correctly, but it cannot display data it does not have.
*   **User Requests 1Y:** Backend calculates date range `NOW - 365 Days` (Jan 2025).
*   **DB Returns:** Data from `July 2025` to `NOW`.
*   **Result:** Chart looks like a "6 Month" or "1 Month" chart because the first half of the requested year is empty.

## 3. Recommended Actions

### Option A: Accept Limitation (Immediate)
Update the UI to remove "1Y" and "MAX" buttons for EGX stocks, or show a toast notification "Historical data limited by exchange source".

### Option B: Switch Data Provider (Strategic)
StockAnalysis.com is excellent for *Financials* (Income/Balance Sheet), but evidently poor for *Deep Price History* on EGX.
*   **Alternative:** Yahoo Finance (`yfinance`) usually provides 10+ years of history for EGX stocks.
*   **Action:** We can build a "One-Time Backfill" script using `yfinance` to populate the `ohlc_data` table with data from 2010-2025. Once backfilled, our existing daily updater will keep it fresh.

## 4. Verification Proofs
Scripts used for this audit:
*   `check_ohlc_range.py`: Verified local DB depth.
*   `check_api_depth.py`: Verified external API response limits.
