---
description: Deploy frontend to Vercel production
---

# Frontend Deployment Workflow

**⚠️ CRITICAL: Vercel is NOT connected to GitHub. You MUST deploy via CLI.**

## Prerequisites
- You are in the `frontend/` directory
- All changes are saved and tested locally

## Steps

// turbo-all

1. Navigate to the frontend directory:
```bash
cd /Users/home/Documents/Info\ Site/mubasher-deep-extract/frontend
```

2. Build locally to verify no errors:
```bash
npm run build
```

3. Deploy to Vercel production:
```bash
npx vercel --prod --yes
```

4. Wait for deployment to complete (about 60 seconds)

5. Verify the deployment is live:
```bash
curl -s https://frontend-five-black-90.vercel.app/api/inventory | head -50
```

6. Verify the API URL is correct (should NOT contain localhost):
```bash
curl -s https://frontend-five-black-90.vercel.app/ | grep -o "bhidy-financehub-api" | head -1
```

## Expected Outcome
- Deployment URL: https://frontend-five-black-90.vercel.app
- API connected to: https://bhidy-financehub-api.hf.space
- All pages showing live data

## If Deployment Fails
1. Check Vercel CLI is logged in: `npx vercel whoami`
2. Check for build errors in the output
3. Verify you're in the correct directory

## DO NOT
- ❌ Use Vercel Dashboard "Redeploy" button (it uses cached code)
- ❌ Push to GitHub and expect changes to deploy
- ❌ Modify `lib/api.ts` PRODUCTION_API constant without approval
