---
description: Deploy frontend to Vercel production
---

# Deploy Frontend to Vercel

This workflow deploys the frontend to Vercel production.

// turbo-all

## Steps

1. Navigate to frontend directory:
```bash
cd /Users/home/Documents/Info\ Site/mubasher-deep-extract/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Build production bundle:
```bash
npm run build
```

4. Deploy to Vercel production:
```bash
npx vercel --prod --yes
```

5. Verify deployment is live:
```bash
curl -s https://finhub-pro.vercel.app | grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+'
```

## Manual Alternative

If CLI fails, deploy via Vercel Dashboard:
1. Go to https://vercel.com/bhidys-projects/finhub/deployments
2. Click "Create Deployment"
3. Select branch "main" and latest commit
4. Click "Create Deployment"
