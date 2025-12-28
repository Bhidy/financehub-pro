# ⚠️ CRITICAL RULES - READ BEFORE ANY DEPLOYMENT ⚠️

These rules are MANDATORY and must be followed for EVERY frontend deployment.

---

## 🚨 BEFORE PUSHING ANY FRONTEND CHANGES

1. **API URL Check**
   ```bash
   grep "bhidy-financehub-api.hf.space/api/v1" frontend/lib/api.ts
   ```
   MUST contain `/api/v1` in the URL

2. **Test API Endpoint**
   ```bash
   curl -s https://bhidy-financehub-api.hf.space/api/v1/tickers | head -c 100
   ```
   MUST return JSON data

3. **Version Bump** (all 3 locations)
   - `frontend/package.json`
   - `frontend/components/Sidebar.tsx` 
   - `frontend/app/command-center/page.tsx` footer

4. **Sync Lockfile**
   ```bash
   cd frontend && npm install
   ```

---

## 🚨 AFTER PUSHING - MANDATORY VERIFICATION

5. **Check GitHub Actions**
   - URL: https://github.com/Bhidy/financehub-pro/actions
   - Workflow MUST be running/completed

6. **Verify Version Deployed**
   - Open: https://finhub-pro.vercel.app/command-center
   - Sidebar AND footer must show new version

7. **Verify Data Working**
   - Open: https://finhub-pro.vercel.app/
   - Volume MUST NOT be 0.0M
   - Gainers/Losers MUST NOT be 0

8. **Browser Console Check**
   - Open DevTools (F12)
   - NO 404/500 errors in Network tab

---

## ❌ NEVER SAY "DEPLOYMENT SUCCESSFUL" UNTIL ALL 8 STEPS PASS
