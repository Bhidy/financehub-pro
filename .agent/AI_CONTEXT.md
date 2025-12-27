# FinanceHub Pro - AI Context & Production Rules

> **This file MUST be read by any AI agent before making changes to this project.**

## 🔴 PRODUCTION ENVIRONMENT - LIVE DATA

This is a **PRODUCTION** system serving real financial data. All changes affect live users.

---

## CRITICAL RULES FOR AI AGENTS

### 1. NEVER Use localhost URLs in Production Code

❌ **WRONG:**
```typescript
const API_URL = "http://localhost:8000";
```

✅ **CORRECT:**
```typescript
const PRODUCTION_API = "https://bhidy-financehub-api.hf.space";
const API_URL = process.env.NEXT_PUBLIC_API_URL || PRODUCTION_API;
```

### 2. ALWAYS Use Correct Deployment Method

| Component | Deploy Method | Command |
|-----------|--------------|---------|
| Frontend | Vercel CLI | `cd frontend && npx vercel --prod` |
| Backend | Git Push to HF | `cd hf-space && git push origin main` |

**⚠️ NEVER tell user to "click Redeploy" on Vercel Dashboard - it doesn't work!**

### 3. Verify Before Claiming Success

After any deployment, ALWAYS verify:
```bash
# Frontend health
curl https://frontend-five-black-90.vercel.app/

# Backend health  
curl https://bhidy-financehub-api.hf.space/health

# Data is flowing
curl https://bhidy-financehub-api.hf.space/api/v1/dashboard/summary
```

### 4. Know The Active Infrastructure

| Service | Provider | URL |
|---------|----------|-----|
| Frontend | Vercel | https://frontend-five-black-90.vercel.app |
| Backend API | HuggingFace | https://bhidy-financehub-api.hf.space |
| Database | Supabase | (connection via DATABASE_URL secret) |

**DO NOT reference or deploy to:**
- ❌ Railway (dead, account closed)
- ❌ Render.com (not used)
- ❌ Any localhost/127.0.0.1 endpoints

### 5. File Locations

```
/Users/home/Documents/Info Site/mubasher-deep-extract/
├── frontend/          # Next.js app → Deploy to Vercel
├── hf-space/          # FastAPI app → Deploy to HuggingFace
├── backend/           # ❌ LEGACY - DO NOT USE
└── PRODUCTION_GUIDE.md # Full infrastructure documentation
```

### 6. Critical Files - Review Before Modifying

| File | Purpose | Risk Level |
|------|---------|------------|
| `frontend/lib/api.ts` | API base URL config | 🔴 CRITICAL |
| `frontend/vercel.json` | Deployment config | 🟡 HIGH |
| `hf-space/app/main.py` | Backend entry | 🔴 CRITICAL |
| `hf-space/app/db/session.py` | Database connection | 🔴 CRITICAL |

---

## QUICK REFERENCE COMMANDS

### Deploy Frontend (After Code Changes)
```bash
cd /Users/home/Documents/Info\ Site/mubasher-deep-extract/frontend
npm run build && npx vercel --prod --yes
```

### Check System Health
```bash
curl https://bhidy-financehub-api.hf.space/health
curl https://bhidy-financehub-api.hf.space/api/v1/dashboard/summary
```

### View Logs
- Frontend: https://vercel.com/bhidys-projects/frontend
- Backend: https://huggingface.co/spaces/Bhidy/financehub-api/logs

---

## ERROR PREVENTION CHECKLIST

Before making any suggestion or code change:

- [ ] Is this targeting the correct service (frontend vs backend)?
- [ ] Am I using production URLs, not localhost?
- [ ] Do I know the correct deployment method?
- [ ] Have I checked if the service is currently healthy?
- [ ] Will this change break existing functionality?

---

*Last Updated: 2025-12-27*
*Environment: PRODUCTION*
*Status: LIVE*
