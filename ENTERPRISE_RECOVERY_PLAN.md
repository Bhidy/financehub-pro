# Enterprise Recovery Plan: "Forever Fix" Strategy

## 1. Executive Summary
**Objective:** Eliminate the "deployment loop" and unreliable chatbot responses by implementing strict engineering standards, automated pre-deployment validation, and a self-healing backend architecture.

**Current Status:**  
The system suffers from fragility in three areas:
1.  **NLU Instability:** Valid queries like "Technicals for HRHO" return `UNKNOWN`.
2.  **Runtime Crashes:** Missing imports or mismatched SQL tables cause 500 Errors.
3.  **False Positives:** Tests "Pass" (HTTP 200) even when the bot answers "I don't know".

---

## 2. Root Cause Analysis (Deep Dive)

### A. The "Unknown" Intent Issue
*   **Observation:** `Technicals for HRHO` -> `UNKNOWN`.
*   **Cause:** The `IntentRouter` relies on a hybrid score. If keywords match but the NLU score is low (common with jargon), it defaults to UNKNOWN.
*   **Fix:** Implement **Deterministic Keyword Override**. If a strong keyword class (e.g., "technicals", "support", "resistance") is present, force the intent regardless of NLU score.

### B. The Backend Fragility
*   **Observation:** `NameError: name 'Optional' is not defined`.
*   **Cause:** Lack of static analysis (Linting/Type Checking) in the deployment pipeline.
*   **Fix:** Implement a `pre-push` validation script that runs `pylint` or `py_compile` on all changed files.

### C. Data Schema Mismatches
*   **Observation:** Handlers query `financial_ratios_extended` (which doesn't exist) instead of `financial_ratios_history`.
*   **Cause:** Determining schema by memory rather than a strict source of truth.
*   **Fix:** Create a `db_schema_map.py` module that defines table constants. Handlers must import table names from here.

---

## 3. Implementation Plan (The "Forever Fix")

### Phase 1: Hardening the Core (Immediate)
1.  **Refactor `IntentRouter`:**
    *   Add a `Force Keyword` layer.
    *   Ensure "Fund" queries (`AZ Gold`) are routed correctly even if the symbol is obscure.
2.  **Standardize Handlers:**
    *   Apply the `safe_float` and `safe_query` wrappers to ALL handlers.
    *   Centralize table name references.

### Phase 2: Comprehensive Testing Suite
1.  **Upgrade `qa_production_test.py`:**
    *   Assert NOT just HTTP 200.
    *   Assert `success: True`.
    *   Assert `intent` matches expected (e.g., `STOCK_CHART`).
    *   Assert `cards` is not empty.
2.  **Local Simulation:**
    *   Run valid SQL queries locally to ensure no syntax errors before push.

### Phase 3: "Zero-Error" Deployment
1.  **Pre-Flight Check:** Script that checks imports, syntax, and basic logic.
2.  **Atomic Deployment:** Only push when *all* local checks pass.

---

## 4. Execution Steps

1.  **Verify Schema:** Run a DB introspection tool to get the *exact* table names and columns for `mutual_funds`, `financial_ratios_history`, etc.
2.  **Fix Intent Router:** Add the deterministic overrides.
3.  **Update QA Script:** Make it strict.
4.  **Final Deployment:** Push the hardened code.

