# Critical Data Pipeline Fix: Comprehensive Analysis & Plan

## Executive Summary
**Incident**: System workflows report "Success" in <30 seconds, but data is not updated.
**Root Cause**: The current architecture uses an **Async Handoff** pattern. The GitHub Action triggers the backend and exits immediately when the backend says "Started". The backend continues processing in the background (hidden). The user interprets the early exit as a "break" or failure.
**Solution**: Transition to a **Synchronous Polling** pattern with **Live Progress Tracking**. The GitHub Action will remain active, polling the backend for real-time status (e.g., "Ingesting 15/223 stocks"), and only exit when the backend confirms completion.

## 1. Deep Analysis

| Component | Current State | Issue | Target State |
|-----------|---------------|-------|--------------|
| **GitHub Action** | Sends `curl` request, checks for "started", exits (0m 4s). | False positive "Success". No visibility into actual job. | **Polls status** every 10s. Streams logs to console. Exits only when job finishes. |
| **Backend API** | Returns "started" immediately. Runs background task. | Fire-and-forget. Failures are silent/hidden in server logs. | Updates a global **Status Registry** with live progress metrics. |
| **Ingestion Engine** | `ingest_stockanalysis.py` logs locally to valid stdout. | No communication with the API layer about progress. | Accepts a `callback` to push live stats (e.g., `stocks_done=15`) to the API. |
| **User Experience** | "It broke in 4 seconds." | Total loss of trust in system reliability. | "I see it working chunk by chunk." (Confidence restoration). |

## 2. Implementation Plan

### Phase 1: Backend Instrumentation (Code Level)
We will modify the Python backend to expose the "Black Box" internal state.

1.  **Modify `data_pipeline/ingest_stockanalysis.py`**:
    - Update `run_ingestion_job` to accept a `status_callback` function.
    - Inside the processing loop, call `status_callback({"current": i, "total": total, "last_stock": symbol})`.

2.  **Modify `app/api/v1/endpoints/admin.py`**:
    - Create a bridge function `ingestion_progress_callback` that updates the global `refresh_status` dictionary.
    - Pass this bridge to `run_ingestion_job`.

### Phase 2: Client-side Polling (Workflow Level)
We will rewrite the GitHub Action (`enterprise-data-update.yml`) to be smarter.

1.  **Remove** the simple `curl` check.
2.  **Inject** a robust bash script:
    - Trigger the job.
    - Loop `while status == "true"`.
    - Fetch `/refresh/status`.
    - Print `Progress: [====>....] 45% (Stock ABUK)`.
    - Detect failures (if `errors` list grows).
    - Timeout after 60 minutes.

### Phase 3: "Nuclear" Deployment & Verification
1.  Push code to `main`.
2.  Execute **Nuclear Rebuild** (`scripts/restore_production.exp`) to ensure new code is loaded.
3.  Trigger the workflow and watch the "Magic Bar" fill up.

## 3. Execution Steps

1.  **Edit** `backend-core/data_pipeline/ingest_stockanalysis.py` (Add callback support).
2.  **Edit** `backend-core/app/api/v1/endpoints/admin.py` (Link callback to state).
3.  **Edit** `.github/workflows/enterprise-data-update.yml` (Implement Polling Logic).
4.  **Deploy** to Hetzner.
5.  **Verify** via GitHub Actions loop.

---

**Status**: Ready to Execute.
**Estimated Time**: 20 minutes.
