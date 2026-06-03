# FinHub Pro - Production Deployment Reference Guide

> **Purpose**: This document is the authoritative reference for deploying FinHub Pro to production. Provide this document to any AI model or developer to enable correct deployment without confusion.

> [!IMPORTANT]
> For branded public pages served at `https://startamarkets.com` (`/`, `/Funds`, `/Learn`, `/News`, `/Market-Pulse`, theme, or language work), read [`STARTAMARKETS_PUBLIC_SITE.md`](./STARTAMARKETS_PUBLIC_SITE.md) first. It records the actual static-page route map, shared theme/language systems, source-of-truth warning, and public-site deployment procedure.

---

## Quick Reference

| Component | URL | Platform |
|-----------|-----|----------|
| **Branded Public Site** | https://startamarkets.com | Vercel (`finhub` project) |
| **Vercel Project Hostname** | https://startamarkets.com | Vercel |
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
| **Production URL** | https://startamarkets.com |

### Deployment Steps

> [!CAUTION]
> **MUST deploy from the repository root**, NOT from inside the `frontend` folder.

```bash
# Step 1: Navigate to repository root
cd /Users/home/Documents/startamarkets

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
curl -s -o /dev/null -w "%{http_code}" https://startamarkets.com/
# Expected: 200
```

---

## Repository Structure

```
startamarkets/                   ← DEPLOY FROM HERE
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
Error: The provided path "~/Documents/startamarkets/frontend/frontend" does not exist
```

**Cause**: Running `vercel` from inside the `frontend` directory.

**Solution**: Navigate to repository root and deploy from there:
```bash
cd /Users/home/Documents/startamarkets
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

## ⚠️ CRITICAL: Vercel git-author block (Hobby plan)

> **Symptom**: Every git push to `main` produces a Vercel deployment that never goes live; `vercel inspect` shows `readyState: BLOCKED`, reason **"The Deployment was blocked because there was no git user associated with the commit."** The live site keeps serving an old deployment. This looks like a "broken build" but the build never runs.

**Root cause**: On the Hobby plan, Vercel only builds git deployments whose **commit-author email is linked to the Vercel/GitHub account** (`mohamedbhidy@gmail.com` / GitHub `Bhidy`). Commits authored with an unlinked email (e.g. `m.mostafa@mubasher.net`) are blocked.

**Fix (already applied repo-locally)**:
```bash
git config user.email "mohamedbhidy@gmail.com"   # repo-local; future commits deploy
```
Alternatively, add the other email as a *verified* email on the GitHub `Bhidy` account.

**To recover a stuck state**: make any commit authored by the linked email (even `git commit --allow-empty`) and push — it builds. Then run the mandatory alias step (below).

### 🛡️ PREVENTION (so this never recurs)

1. **Repo-local git identity** (set — verify with `git config user.email`):
   ```bash
   git config user.email "mohamedbhidy@gmail.com"
   git config user.name  "Mohamed Bhidy"
   ```
2. **Pre-push guard (committed)** — `scripts/git-hooks/pre-push` blocks any push to
   `main` whose commit-author email is not the linked one. **Enable once per clone:**
   ```bash
   git config core.hooksPath scripts/git-hooks
   ```
   It refuses the push *before* it reaches GitHub, with the exact fix command — so a
   BLOCKED Vercel deploy can never happen again from a wrong-author commit.
3. **Pre-deploy checklist** (every release):
   - [ ] `git config user.email` → `mohamedbhidy@gmail.com`
   - [ ] `git status --short` reviewed — only intended files staged (repo carries unrelated in-flight work; never `git add -A`)
   - [ ] `cd frontend && npm run build` passes locally
   - [ ] push → poll Vercel until `readyState: READY` (not BLOCKED/ERROR)
   - [ ] **alias** the new deployment URL to `startamarkets.com` + `www` (below) — **never skip**
   - [ ] verify live: `curl -s -o /dev/null -w "%{http_code}" https://startamarkets.com/` → 200
4. **How to detect a BLOCK fast** (if a deploy "did nothing"):
   ```bash
   ./frontend/node_modules/.bin/vercel inspect <deployment-url>   # look for: BLOCKED
   # or via API: GET api.vercel.com/v6/deployments?projectId=...&limit=1  → readyState
   ```

**Mandatory after EVERY deploy** (git push *or* `vercel deploy`): alias the new deployment URL to the domains, or the live site keeps serving the old build:
```bash
./frontend/node_modules/.bin/vercel alias set <new-deployment-url> startamarkets.com
./frontend/node_modules/.bin/vercel alias set <new-deployment-url> www.startamarkets.com
```

## Document Version

| Version | Date | Author |
|---------|------|--------|
| 1.0 | 2026-01-01 | AI Assistant |
| 1.1 | 2026-06-03 | Added Vercel git-author block fix + mandatory alias step |
