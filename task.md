# Task: Integrate EGX Logos

- [x] Add `logo_url` column to `market_tickers` table in `backend-core/app/db/enterprise_schema.sql` <!-- id: 0 -->
- [x] Create and execute database migration to add the column <!-- id: 1 -->
- [x] Create `scripts/migrate_logos.py` to move logos and update DB <!-- id: 2 -->
- [x] Execute `scripts/migrate_logos.py` <!-- id: 3 -->
- [x] Update `backend-core/app/chat/handlers/price_handler.py` to return `logo_url` <!-- id: 4 -->
- [x] Update `frontend/components/ai/ChatCards.tsx` to display `logo_url` in Price Header <!-- id: 5 -->
- [x] **[EXPANSION]** Update `market_handler.py` (Gainers/Losers/Market Summary) <!-- id: 8 -->
- [x] **[EXPANSION]** Update `compare_handler.py` (Comparisons) <!-- id: 9 -->
- [x] **[EXPANSION]** Update `ChatCards.tsx` (MoversTable & CompareTable) <!-- id: 10 -->
- [x] Deploy Frontend to Production <!-- id: 7 -->
- [x] Deploy Backend to Production (Nuclear Rebuild Complete) <!-- id: 11 -->
    - [x] Fix Missing `docker-compose.prod.yml` <!-- id: 12 -->
    - [x] Manual SSH Execution via `restore_production.exp` <!-- id: 13 -->
    - [x] **[DEBUG]** Verify Code Integrity (Found missing commit for `market_handler.py`) <!-- id: 14 -->
    - [x] **[FIX]** Re-apply code to `market_handler.py` <!-- id: 15 -->
    - [x] **[FIX]** Remove redundant env vars from `docker-compose.prod.yml` to fix DB connection <!-- id: 16 -->
    - [x] Redeploy Backend (Manual Docker Restart) <!-- id: 17 -->
- [/] Deploy Frontend (Final) <!-- id: 18 -->
