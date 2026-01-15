# Enterprise Data Quality & "Zero-Tolerance" Plan
**Objective:** Achieve 100% Data Display Accuracy by strictly eliminating "N/A", "—", "Zero", and placeholder artifacts from the FinanceHub Pro Chatbot (Desktop & Mobile).

## 1. Executive Summary
The logic handling unavailable data is currently permissive, leading to "N/A" being displayed to the user. The new standard is **"Invisible or Accurate"**. If a data point is missing in the database, it must:
1.  **Backend:** Be explicitly `None` (null) in the API response.
2.  **Frontend:** Be strictly removed from the UI (DOM).
3.  **Text Response:** Be strictly omitted from the generated text paragraph.

This plan addresses all layers: Database -> Python Handlers -> API Contract -> React Components -> Mobile Deployment.

---

## 2. Backend Architecture Refactoring (Python)

### A. Utility Standardization (`format_utils.py`)
Currently, `_format_number` functions across handlers return `"N/A"` or `"—"`.
*   **Action:** Centralize formatting logic.
*   **New Behavior:** Formatter returns `None` if input is missing. Text generators must handle the conditional logic.

### B. Handler Text Generation Overhaul
All `handlers/*.py` files construct strings using f-strings (e.g., `f"P/E: {pe}"`).
*   **Problem:** If `pe` is `None`, this prints "P/E: None" or falls back to "N/A".
*   **Solution:** Convert all valid message blocks to **Conditional Lists**.
    *   *From:* `msg += f"PE: {pe or 'N/A'}"`
    *   *To:*
        ```python
        lines = []
        if pe: lines.append(f"PE: {pe:.2f}")
        msg = "\n".join(lines)
        ```

### C. Specific Handler Audits
| Handler | Target Fixes |
| :--- | :--- |
| **`price_handler.py`** | Remove `else 'N/A'` logic in text generation. Ensure `snapshot` card data uses `None`. |
| **`statistics_handler.py`** | Remove "N/A" from `_format_number`. Update "Full Metrics" text builder to skip missing lines. |
| **`analysis_handler.py`** | Fix Technicals text (RSI, Pivot). Fix Fund Risk/Fees text generation. |
| **`dividends_handler.py`** | Fix "Detailed history not available" placeholders. |
| **`financials_handler.py`** | Replace `—` return value with `None`. Ensure `Financial Explorer` drops empty rows. |
| **`fund_handler.py`** | Fix fund detail text generation (Fees, Manager, Risk). |

---

## 3. Frontend "Strict Mode" Implementation (React)

### A. Component Auditing (`ChatCards.tsx`)
We will enforce a "Return Null" policy for all sub-components if their primary data is missing.

| Component | Rule |
| :--- | :--- |
| **`SnapshotCard`** | If `change` or `price` is null, hide the specific metric pill. |
| **`StatsCard`** | Iterate through `data` keys. If value is `null`, do NOT render the row. |
| **`RatiosCard`** | Filter `entries`. If value is `null`, skip. |
| **`TechnicalsCard`** | If `RSI` is null, hide RSI box. If `Support` is empty, hide Support section. |
| **`FinancialExplorer`** | (Already implemented) Filter empty rows. |
| **`Deep*Cards`** | (Completed) Already enforcing strict hiding. |

### B. Mobile Parity
*   Verify `mobile-ai-analyst/page.tsx` receives the exact same payload.
*   (Confirmed: Architecture shares the same `ChatCards` component, so fix is universal).

---

## 4. Execution Roadmap

1.  **Phase 1: Backend Refactor (Estimated time: 2 steps)**
    *   Modify all `handlers/*.py` to remove "N/A" string literals.
    *   Implement conditional text generation.

2.  **Phase 2: Frontend "Strict Mode" (Estimated time: 2 steps)**
    *   Update `ChatCards.tsx` to apply strict filtering to *all* remaining card types (`Stats`, `Snapshot`, `Technicals`).

3.  **Phase 3: Production Deployment**
    *   Deploy Backend to Hetzner VPS.
    *   Deploy Frontend to Vercel (Production).

4.  **Phase 4: Final QA**
    *   Test queries: "CIB Price", "Fund 23 Fees", "Valuation of AMOC" to verify zero "N/A" presence.

---

**Signed:** Antigravity (Google Deepmind)
**Status:** Ready for immediate execution.
