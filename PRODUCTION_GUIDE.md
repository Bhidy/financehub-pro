# FinanceHub Pro - Enterprise Production Infrastructure Guide

> **Version:** 1.0.0  
> **Last Updated:** 2025-12-27  
> **Environment:** PRODUCTION  

---

## 🏢 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FINANCEHUB PRO - PRODUCTION                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐         ┌──────────────────────────────────────────┐     │
│   │   FRONTEND   │         │              BACKEND                     │     │
│   │   (Vercel)   │  ────▶  │         (Hetzner VPS)                    │     │
│   │              │  HTTPS  │                                          │     │
│   │  Next.js 16  │         │  FastAPI + PostgreSQL (Supabase)         │     │
│   └──────────────┘         └──────────────────────────────────────────┘     │
│         │                              │                                     │
│         │                              │                                     │
│   ┌─────▼─────┐                ┌───────▼───────┐                            │
│   │  Vercel   │                │   Supabase    │                            │
│   │   CDN     │                │   PostgreSQL  │                            │
│   │  (Edge)   │                │   Database    │                            │
│   └───────────┘                └───────────────┘                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 PRODUCTION ENDPOINTS

### Frontend (Vercel)
| Environment | URL | Status |
|-------------|-----|--------|
| **Production** | https://startamarkets.com | ✅ LIVE |
| Deployment Method | Vercel CLI (`vercel --prod`) | Manual |

### Backend API (Hetzner VPS)
| Environment | URL | Status |
|-------------|-----|--------|
| **Production** | https://starta.46-224-223-172.sslip.io | ✅ LIVE |
| Health Check | https://starta.46-224-223-172.sslip.io/health | ✅ |
| API Docs | https://starta.46-224-223-172.sslip.io/docs | ✅ |

### Database (Supabase)
| Component | Details |
|-----------|---------|
| Provider | Supabase PostgreSQL |
| Region | Configured in Secrets |
| Connection | Via `DATABASE_URL` environment variable |

---

## 📁 REPOSITORY STRUCTURE

```
financehub-pro/
├── frontend/                    # Next.js Frontend (Deployed to Vercel)
│   ├── app/                     # Next.js App Router pages
│   ├── components/              # React components
│   ├── lib/
│   │   └── api.ts              # ⚠️ CRITICAL: API configuration
│   ├── .env                    # LOCAL ONLY (gitignored)
│   ├── .env.example            # Environment template
│   └── vercel.json             # Vercel configuration
│
├── backend-core/               # Backend API (Dockerized on Hetzner)
│   ├── app/
│   │   ├── api/v1/             # API endpoints
│   │   ├── core/               # Configuration
│   │   ├── db/                 # Database connection
│   │   └── main.py             # FastAPI entry point
│   ├── Dockerfile              # Container configuration
│   └── README.md               # Backend metadata
│
├── backend/                    # Legacy (DO NOT USE)
│
└── PRODUCTION_GUIDE.md         # This document
```

---

## 🚀 DEPLOYMENT PROCEDURES

### Frontend Deployment (REQUIRED METHOD)

**⚠️ CRITICAL: Vercel is NOT connected to GitHub.** 
You MUST deploy via CLI from the local `frontend/` directory.

```bash
# Navigate to frontend directory
cd /Users/home/Documents/Info\ Site/mubasher-deep-extract/frontend

# Deploy to production
npx vercel --prod

# Expected output:
# ✅ Production: https://startamarkets.com
```

### Backend Deployment (Hetzner VPS)

The backend is deployed via the Smart Deployment protocol.

```bash
# Deploy to Hetzner (Smart Update)
./scripts/deploy_smart.sh

# Verify deployment
python3 scripts/verify_live_7layer.py
```

---

## 🛡️ CRITICAL CONFIGURATION FILES

### 1. Frontend API Configuration (`frontend/lib/api.ts`)

```typescript
// ⚠️ PRODUCTION CONFIGURATION - DO NOT MODIFY WITHOUT APPROVAL
const PRODUCTION_API = "https://starta.46-224-223-172.sslip.io";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : `${PRODUCTION_API}/api/v1`;  // Fallback to production
```

**Rule:** The fallback MUST always be the production URL, never `localhost`.

### 2. Vercel Environment Variables

Set in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Scope |
|----------|-------|-------|
| `NEXT_PUBLIC_API_URL` | `https://starta.46-224-223-172.sslip.io` | Production, Preview |

### 3. Backend Secrets

Set in `.env` file on Hetzner (managed via `deploy_to_hetzner.sh`):

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `SECRET_KEY` | JWT Secret Key for Authentication |
| `GROQ_API_KEY` | Primary Groq API Key |
| `RESEND_API_KEY` | Resend Email API Key |
| `FROM_EMAIL` | Sender Email Address |
| `GOOGLE_CLIENT_ID` | Google OAuth ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret |

**CRITICAL SECURITY PROTOCOL (v5.0.0-SECURE):** Do NOT hardcode any of these secrets in the codebase. All secrets must strictly reside in `.env` and be loaded via `os.getenv()` or Pydantic `BaseSettings`. No string concatenation fallbacks for secrets are permitted.

---

## ⚠️ COMMON ISSUES & PREVENTION

### Issue 1: Frontend Shows "0 Data" or "localhost" Errors

**Root Cause:** Code deployed to Vercel doesn't have production API URL.

**Prevention:**
1. ALWAYS deploy via `vercel --prod` from local machine
2. NEVER rely on Vercel's "Redeploy" button (it uses cached code)
3. Verify deployment with: `curl -s https://startamarkets.com/ | grep "bhidy-financehub-api"`

### Issue 2: Backend API Returns 500 Errors

**Root Cause:** Database connection issues or missing environment variables.

**Prevention:**
1. Check Hetzner logs via Docker: `docker logs backend`
2. Verify DATABASE_URL is set in `.env`
3. Test database: `curl https://starta.46-224-223-172.sslip.io/api/v1/stats`

### Issue 3: Changes Not Reflected After Push

**Root Cause:** Changes not pushed to GitHub or not deployed to Hetzner.

**Prevention:**
1. Frontend: Use `vercel --prod` command
2. Backend: Use `./scripts/deploy_smart.sh`

### Issue 4: Environment Variables (Secrets) Not Updating

**Root Cause:** Docker caching prevents running containers from seeing new `.env` file changes.

**Prevention (Enterprise Fix):**
1. **Always Force Recreate:** When deploying secrets, use:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --force-recreate
   ```
   *(Note: The `setup_hetzner.sh` script now enforces this automatically)*
2. **Verify on Server:**
   Run `scripts/diagnose_remote.exp` to prove secrets exist in the running container.

---

## 📊 MONITORING & HEALTH CHECKS

### Automated Health Check URLs

```bash
# Frontend Status
curl -I https://startamarkets.com/

# Backend Health
curl https://starta.46-224-223-172.sslip.io/health

# Database Stats
curl https://starta.46-224-223-172.sslip.io/api/v1/dashboard/summary

# Expected Response:
# {"stocks":453,"funds":582,"shareholders":1009,"earnings":2659...}
```

### Key Metrics to Monitor

| Metric | Expected Value | Alert Threshold |
|--------|---------------|-----------------|
| Stocks Count | ~453 | < 400 |
| NAV Records | ~615,000 | < 500,000 |
| API Response Time | < 500ms | > 2000ms |
| Database Health | "healthy" | "unhealthy" |

---

## 🔄 INCIDENT RESPONSE

### If Production is Down

1. **Check Backend:**
   ```bash
   curl https://starta.46-224-223-172.sslip.io/health
   ```
   If failing → SSH into Hetzner and check Docker logs

2. **Check Frontend:**
   ```bash
   curl -I https://startamarkets.com/
   ```
   If failing → Check Vercel dashboard

3. **Redeploy if needed:**
   ```bash
   cd frontend && npx vercel --prod
   ```

---

## 📝 CHANGE MANAGEMENT

### Before Making Any Changes:

1. ✅ Verify you're in the correct directory (`frontend/` or `backend-core/`)
2. ✅ Check current production status is healthy
3. ✅ Create a backup or note current commit SHA
4. ✅ Test changes locally first
5. ✅ Deploy using correct method (CLI, not dashboard)

### After Deployment:

1. ✅ Verify health endpoints return 200
2. ✅ Check console for API URL (should show `starta...sslip.io`)
3. ✅ Verify data is loading on key pages (Home, Screener, Command Center)
4. ✅ Document any issues encountered

---

## 🎯 CONTACT & OWNERSHIP

| Role | Responsibility |
|------|---------------|
| Infrastructure | Vercel (Frontend), Hetzner VPS (Backend), Supabase (DB) |
| Repository | https://github.com/Bhidy/financehub-pro |
| Primary Domain | https://startamarkets.com |

---

*This document is the source of truth for FinanceHub Pro production infrastructure.*
