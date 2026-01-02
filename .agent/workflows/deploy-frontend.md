---
description: Deploy frontend to Vercel production
---

# Deploy Frontend to Vercel

> **CRITICAL**: Deploy from REPOSITORY ROOT, not from frontend folder!

// turbo-all

## Steps

1. Navigate to repository root:
```bash
cd /Users/home/Documents/Info\ Site/mubasher-deep-extract
```

2. Install frontend dependencies:
```bash
cd frontend && npm install && cd ..
```

3. Deploy to Vercel production (from root!):
```bash
npx vercel --prod --yes
```

4. Verify deployment is live:
```bash
curl -s -o /dev/null -w "%{http_code}" https://finhub-pro.vercel.app/
```

## Manual Alternative

If CLI fails, deploy via Vercel Dashboard:
1. Go to https://vercel.com/bhidys-projects/finhub/deployments
2. Click "Create Deployment"
3. Select branch "main" and latest commit
4. Click "Create Deployment"
