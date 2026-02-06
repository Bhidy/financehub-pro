# Upgrade Plan: Legacy to Starta Kit

This plan outlines the steps to upgrade the `FinanceHub Pro` chatbot to the "Starta AI" standard defined in the Implementation Kit.

## 1. Database Schema Extensions (Non-Destructive)
We will add new tables alongside existing ones (market_tickers, market_prices) to support the new features.

**New Tables:**
*   `macro_data`: GDP, Inflation, PMI, FX stats.
*   `macro_insights`: Expert text insights (Seasonality, Intermarket).
*   `sector_averages`: Pre-calculated sector benchmarks.
*   `conversations` (Enhanced): Richer logging for learning.

**Action:**
- Create `scripts/migrate_to_kit_schema.py` to idempotently create these tables.

## 2. Core Logic Implementation
We will implement the "Business Logic Layer" defined in the Kit.

**New Modules:**
*   `backend-core/app/chat/logic/financial_calculator.py`: Implements `FinancialCalculator` with sector-specific logic (Banks P/B < 1.2, etc.).
*   `backend-core/app/chat/logic/macro_service.py`: Handles Macro Score calculation.

**Updates:**
*   `backend-core/app/chat/llm_explainer.py`: **REPLACE** entire System Prompt with the "Sacred" prompt from `system_prompt.txt`.
*   `backend-core/app/chat/handlers/analysis_handler.py`: Update to use `FinancialCalculator` results.

## 3. The "Sacred" System Prompt Integration
The prompt in `system_prompt.txt` is the core of the persona.
- It must be injected into the LLM context.
- It requires specific data structures (Bull/Bear cases, Risk Assessment).

## 4. Frontend "Ultra-Premium" Polish
The mockup HTML (`starta_extended_scenarios_mockup.html`) defines the exact look.

**Components to Build/Update:**
*   `DataCard`: Modernized with "Current Position" styling.
*   `InsightCard`: Blue/Red backgrounds for Bull/Bear frames.
*   `StockList`: For Screener results with scores.
*   `MacroScoreCard`: Visual representation of the 0-100 score.

**CSS:**
- Import `Epilogue` font.
- Update `globals.css` with the variables from the mockup.

## 5. Execution Steps
1.  Run DB Migration Script using `run_command`.
2.  Create `financial_calculator.py` and `macro_service.py`.
3.  Update `llm_explainer.py` with new Prompt.
4.  Update `StructuredResponseCards.tsx` in Frontend.
5.  Update `Chat.tsx` styling.
6.  Verify locally.
7.  Deploy Nuclear.
