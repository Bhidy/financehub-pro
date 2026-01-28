# Implementation Plan - Logo Integration Phase 2 (Expansion)

## Goal
Expand logo integration to "Market Summary", "Top Gainers/Losers", and "Compare Stocks" views to meet "World Class" & "Robust" standards.

## Proposed Changes

### 1. Backend Handlers
#### [MODIFY] `backend-core/app/chat/handlers/market_handler.py`
- Update `handle_market_summary` queries (gainers, losers, volume leaders) to select `logo_url`.
- Update `handle_most_active` query to select `logo_url`.
- Update response payloads to include `logo_url` in the `movers` list.

#### [MODIFY] `backend-core/app/chat/handlers/compare_handler.py`
- Update query to selection `logo_url`.
- Update response payload to include `logo_url` in the `stocks` list.

### 2. Frontend Components
#### [MODIFY] `frontend/components/ai/ChatCards.tsx`
- **MoversTable**: Update to accept `logo_url`.
    - implementation: Render logo image inside the rank box (or replace it) if URL exists. Fallback to rank number if valid image not found.
- **CompareTable**: Update headers to show stock logo next to symbol.

## Verification Plan

### Automated
- None (Visual regression primarily).

### Manual
- **Movers**: Check "Market Summary" or "Top Gainers". Verify logos appear in the list.
- **Compare**: Check "Compare COMI vs EAST". Verify logos appear in table headers.
