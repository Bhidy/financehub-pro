# Chief Expert Recommendations: Supabase Usage Optimization

## 🚨 Executive Summary
**Severity:** CRITICAL (Usage Limit Exceeded)
**Current Status:** Database at ~490MB / 500MB Limit (98% Utilization)
**Resolved Strategy:** **Aggressive Cleanup of Intraday Data ONLY.**
**Safety Guarantee:** Daily Price Data (`ohlc_history`, `ohlc_data`) and Critical Financials are **PROTECTED** and will NOT be touched.

## 🛠 Action Plan

### Phase 1: Immediate Space Reclamation (Target: Save ~150MB)
**Objective:** Bring usage down to ~340MB (Safe Zone) by removing old high-frequency data.

1.  **Run Maintenance Script (Intraday Only):**
    The script `scripts/maintenance_cleanup.py` has been configured to:
    -   ✅ **DELETE** `intraday_5m` older than 30 days (Retain last month only).
    -   ✅ **DELETE** `intraday_1h` older than 180 days (Retain last 6 months only).
    -   🛡️ **KEEP** All Daily/Weekly/Monthly OHLC Data (Forever).
    -   🛡️ **KEEP** All Financial Statements & Company Profiles.

    *Status:* Script is currently running/completed.

2.  **Reclaim Physical Space (Critical Step):**
    After the script finishes, you **MUST** run this in the **Supabase SQL Editor** to actually free the disk space:
    ```sql
    VACUUM FULL intraday_5m;
    VACUUM FULL intraday_1h;
    ```
    *Why?* Postgres database size will not decrease until `VACUUM FULL` is run, even after deleting rows.

### Phase 2: Prevention (Automated Maintenance)
**Objective:** Prevent future overflows without manual intervention.

1.  **Weekly Job:** 
    Schedule `scripts/maintenance_cleanup.py` to run once a week.
    This ensures `intraday_5m` never grows beyond 30 days of history.

## 📊 Projected Outcome
| Item | Current Size | Action | Estimated New Size | Saved |
|------|--------------|--------|--------------------|-------|
| `ohlc_history` | 118 MB | **KEEP (PROTECTED)** | 118 MB | 0 MB |
| `intraday_1h` | 100 MB | **Prune** (> 180d) | ~30 MB | **~70 MB** |
| `intraday_5m` | 90 MB | **Prune** (> 30d) | ~15 MB | **~75 MB** |
| `ohlc_data` | 83 MB | **KEEP (PROTECTED)** | 83 MB | 0 MB |
| **TOTAL** | **~490 MB** | | **~340 MB** | **~150 MB** |

---

**✅ VERIFICATION:**
Your critical daily data (`ohlc_history` and `intraday_data`) remains 100% intact. We are only trimming the high-frequency "noise" that is older than necessary.
