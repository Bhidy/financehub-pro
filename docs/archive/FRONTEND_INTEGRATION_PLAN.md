# Frontend Integration Plan: Real Data Visualization

## Goal
Visualize the newly acquired 100% Real Data (Funds, Insider, Analyst, Corp Actions) in the Next.js Frontend.

## 1. Mutual Funds: Deep Dive Page
**Objective:** specific page for each fund showing its 20yr history.
- [ ] **API**: Verify `get_fund_nav_history(fund_id)` in `backend/api.py`.
- [ ] **Routing**: Create `frontend/app/funds/[id]/page.tsx`.
- [ ] **UI Components**:
    -   **Header**: Fund Name, Manager, Type (Metadata).
    -   **Chart**: Interactive Area Chart (NAV History) using `recharts` or `highcharts`.
    -   **Stats Grid**: 1Y Return, YTD (Calculated from history), Last NAV.
- [ ] **Integration**: Link from the main `funds` list to `funds/[id]`.

## 2. Insider Trading: Real-Time Feed
**Objective**: Display authentic regulatory filings.
- [ ] **API**: Ensure `fetchInsiderTrading` hits `/insider-trading`.
- [ ] **Enhancement**: The source API often returns `0.0` for price (transfer/grant?). We will fetch the *Market Price* of the stock on that date from `ohlc_history` to estimate the "Transaction Value" if verified price is missing.
- [ ] **UI**: Update `app/insider-trading/page.tsx` to handle sparse data gracefully (since real data is rarer than simulated).

## 3. Corporate Actions: Calendar
**Objective**: Visualize the 6,000+ dividends/splits.
- [ ] **API**: Create `fetchCorporateActions` in `frontend/lib/api.ts`.
- [ ] **UI**: Create `app/corporate-actions/page.tsx` (if missing) or update `market-pulse`.
- [ ] **Component**: `CorporateActionsCalendar.tsx` - Toggle between List and Calendar View.

## 4. Analyst Ratings: Consensus View
**Objective**: Show "Buy/Sell" Gauges from Yahoo Consensus.
- [ ] **API**: Update `fetchAnalystRatings` to handle the new `analyst_firm='Market Consensus'` format.
- [ ] **UI**: Update `app/analyst-ratings/page.tsx`.
    -   **Gauge**: Visual Meter (Strong Sell <-> Strong Buy).
    -   **Targets**: Show "Upside Potential" (Target Price vs Current Price).

## Execution Sequence
1.  **Mutual Fund Detail Page** (Highest Impact).
2.  **Analyst Ratings Gauge** (High Visual Signal).
3.  **Insider & Corp Actions** (Data Density).
