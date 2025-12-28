---
description: Deploy frontend with full verification
---

// turbo-all

# Frontend Deployment Workflow (MANDATORY)

> **IMPORTANT**: This workflow MUST be followed for EVERY deployment. Do not skip any verification steps.

## Pre-Deployment Checks

1. Verify API configuration:
   ```bash
   grep "bhidy-financehub-api.hf.space/api/v1" frontend/lib/api.ts
   ```
   Expected: Should find the hardcoded production URL with `/api/v1`

2. Test API is accessible:
   ```bash
   curl -s https://bhidy-financehub-api.hf.space/api/v1/tickers | head -c 200
   ```
   Expected: JSON array with ticker data

3. Verify Zod schema uses safe number parsing:
   ```bash
   grep "z.preprocess" frontend/lib/schemas.ts
   ```
   Expected: Should find preprocess for safeNumber

## Deployment Steps

// turbo
4. Bump version in package.json:
   ```bash
   cd frontend && npm version patch --no-git-tag-version
   ```

5. Update version indicators:
   - `components/Sidebar.tsx` - sidebar version
   - `app/command-center/page.tsx` - footer version

// turbo
6. Sync lockfile:
   ```bash
   cd frontend && npm install
   ```

// turbo
7. Commit and push:
   ```bash
   cd frontend && git add -A && git commit -m "chore: bump version" && git push origin main
   ```

## Post-Deployment Verification

8. Check GitHub Actions (wait 30 seconds):
   - Go to: https://github.com/Bhidy/financehub-pro/actions
   - Verify workflow is running/completed

9. Verify deployment (wait 2-3 minutes):
   - Open: https://finhub-pro.vercel.app/command-center
   - Check sidebar shows new version
   - Check footer shows new version

10. Verify data is working:
    - Open: https://finhub-pro.vercel.app/
    - Check Total Volume is NOT 0.0M
    - Check Gainers/Losers are NOT 0
    - Check Top Gainers list has data

11. Browser console check:
    - Open DevTools (F12)
    - Check Console tab for errors
    - Check Network tab for 404/500 errors
