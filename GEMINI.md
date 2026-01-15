# FinanceHub Pro - Gemini CLI Context

## Project Overview

FinanceHub Pro is an enterprise-grade financial intelligence platform for extracting, processing, and visualizing stock market data from Middle Eastern and North African markets (primarily Saudi Arabia, Egypt, and GCC).

**Author:** Bhidy
**Status:** Production (Hetzner)

---

## Technology Stack

### Frontend (`frontend/`)
- **Framework:** Next.js 16.1.1 with App Router
- **UI:** React 19.2.3, Tailwind CSS v4, Framer Motion
- **Charts:** ApexCharts, Recharts, Lightweight Charts
- **State:** TanStack Query (React Query)
- **Language:** TypeScript 5

### Backend (`hf-space/` - Dockerized on Hetzner)
- **Framework:** FastAPI (Python 3.10+)
- **Database:** PostgreSQL via Supabase
- **Deployment:** Hetzner VPS (Docker via Coolify)
- **Base URL:** `https://starta.46-224-223-172.sslip.io`
- **Data Extraction:** Custom scrapers in `extractors/`

### Deployment
- **Frontend:** Vercel (CLI deploy: `vercel --prod`)
- **Backend:** Hetzner VPS (Auto-deployed via Docker)
- **Database:** Supabase PostgreSQL

---

## Critical Rules

1. **API URL:** The production API URL is `https://starta.46-224-223-172.sslip.io/api/v1`. Hardcode this in `frontend/lib/api.ts`.
2. **Deployment:** Vercel is NOT connected to GitHub. Always deploy frontend manually using `npx vercel --prod` from the `frontend/` directory.
3. **CSS:** Use Tailwind v4 utility classes. The color palette is defined in `frontend/app/globals.css`. Avoid purple/indigo; prefer blues, greens, teals, reds, oranges.
4. **AI Integration:** The AI chatbot uses Groq SDK. The system prompt and tool definitions are in `frontend/app/api/chat/route.ts`.
5. **Data Integrity:** All stock data comes from Mubasher. If data is missing, check the extraction logs (`ingestion.log`, `fill_data.log`).

---

## Directory Map

| Directory | Purpose |
|-----------|---------|
| `frontend/` | Next.js application deployed to Vercel |
| `frontend/app/` | App Router pages |
| `frontend/components/` | Reusable React components |
| `frontend/lib/api.ts` | API client configuration |
| `hf-space/` | FastAPI backend (Dockerized on Hetzner) |
| `hf-space/app/api/v1/` | API endpoints |
| `hf-space/scripts/` | Data extraction and maintenance scripts |
| `backend/` | Legacy backend (do not use for production) |
| `scripts/` | Root-level utility scripts |
| `.agent/workflows/` | Deployment and verification workflows |

---

## Common Tasks

### Start Local Development
```bash
./start_all.sh
```

### Deploy Frontend to Production
```bash
cd frontend && npx vercel --prod
```

### Check Production Health
```bash
curl https://starta.46-224-223-172.sslip.io/health
```

### Deploy Backend to Hetzner
```bash
git push origin main
# Coolify automatically rebuilds on push
```
