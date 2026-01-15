# FinHub Pro - Production Deployment Reference Guide

> **Purpose**: This document is the authoritative reference for deploying FinHub Pro to production. Provide this document to any AI model or developer to enable correct deployment without confusion.

---

## Quick Reference

| Component | URL | Platform |
|-----------|-----|----------|
| **Frontend** | https://finhub-pro.vercel.app | Vercel |
| **Backend API** | Hetzner VPS | Hetzner |

---

## Frontend Deployment (Vercel)

### Critical Configuration

| Setting | Value |
|---------|-------|
| **Project Name** | `finhub` |
| **Project ID** | `prj_EYpG42djOp1vEYI5BTadOreRFWC0` |
| **Org ID** | `team_Gqpf3K97tjrOCyIlEnGjWCOE` |
| **Root Directory** | `frontend` (set in Vercel Dashboard) |
| **Framework** | Next.js 16.1.1 |
| **Production URL** | https://finhub-pro.vercel.app |

### Deployment Steps

> [!CAUTION]
> **MUST deploy from the repository root**, NOT from inside the `frontend` folder.

```bash
# Step 1: Navigate to repository root
cd /Users/home/Documents/Info\ Site/mubasher-deep-extract

# Step 2: Install dependencies (from frontend directory)
cd frontend && npm install && cd ..

# Step 3: Build production bundle (optional, Vercel builds remotely)
cd frontend && npm run build && cd ..

# Step 4: Deploy to Vercel production (FROM ROOT!)
npx vercel --prod --yes
```

### Why Deploy from Root?

The Vercel project has `frontend` configured as its **Root Directory** in the dashboard settings. When you run `vercel` from:

- ✅ **Repository root** → Vercel looks for `./frontend` → Finds it → **Success**
- ❌ **Frontend folder** → Vercel looks for `./frontend/frontend` → Fails → **Error**

### Verification

```bash
# Check deployment is live
curl -s -o /dev/null -w "%{http_code}" https://finhub-pro.vercel.app/
# Expected: 200
```

---

## Repository Structure

```
mubasher-deep-extract/           ← DEPLOY FROM HERE
├── .vercel/                     ← Vercel config (linked to finhub project)
│   └── project.json
├── frontend/                    ← Next.js application
│   ├── .vercel/                 ← DUPLICATE (same project, causes confusion)
│   ├── app/                     ← App Router pages
│   ├── components/              ← React components
│   └── package.json
├── backend/                     ← FastAPI backend
└── backend-core/               ← Backend API (Dockerized on Hetzner)
```

---

## Common Issues & Solutions

### Issue: "The provided path does not exist"

**Error Message:**
```
Error: The provided path "~/Documents/Info Site/mubasher-deep-extract/frontend/frontend" does not exist
```

**Cause**: Running `vercel` from inside the `frontend` directory.

**Solution**: Navigate to repository root and deploy from there:
```bash
cd /Users/home/Documents/Info\ Site/mubasher-deep-extract
npx vercel --prod --yes
```

### Issue: Deployment succeeds but changes not visible

**Cause**: Vercel might be building from an old commit cached in their system.

**Solution**: 
1. Clear Vercel cache: Go to [Project Settings](https://vercel.com/bhidys-projects/finhub/settings) → Clear Build Cache
2. Redeploy: `npx vercel --prod --yes --force`

---

## Workflow Commands

Use these slash commands in the AI assistant:

| Command | Description |
|---------|-------------|
| `/deploy-frontend` | Deploy frontend to Vercel production |
| `/deploy-backend` | Deploy backend to Hetzner VPS |
| `/deploy-and-verify` | Full deployment with verification |

---

## Environment Variables

Frontend environment variables are managed in Vercel Dashboard:
- [Environment Variables Settings](https://vercel.com/bhidys-projects/finhub/settings/environment-variables)

Key variables:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `DATABASE_URL` - PostgreSQL connection string

---

## Manual Deployment Alternative

If CLI fails, use Vercel Dashboard:

1. Go to https://vercel.com/bhidys-projects/finhub/deployments
2. Click "Create Deployment"
3. Select branch "main" and latest commit
4. Click "Create Deployment"

---

## Document Version

| Version | Date | Author |
|---------|------|--------|
| 1.0 | 2026-01-01 | AI Assistant |

