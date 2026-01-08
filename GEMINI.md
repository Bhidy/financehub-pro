# FinanceHub Pro - Gemini CLI Context

## Project Overview

FinanceHub Pro is an enterprise-grade financial intelligence platform for extracting, processing, and visualizing stock market data from Middle Eastern and North African markets (primarily Saudi Arabia, Egypt, and GCC).

**Author:** Bhidy
**Status:** Production

---

## Technology Stack

### Frontend (`frontend/`)
- **Framework:** Next.js 16.1.1 with App Router
- **UI:** React 19.2.3, Tailwind CSS v4, Framer Motion
- **Charts:** ApexCharts, Recharts, Lightweight Charts
- **State:** TanStack Query (React Query)
- **Language:** TypeScript 5

### Backend (`hf-space/` - Primary, `backend/` - Legacy)
- **Framework:** FastAPI (Python 3.10+)
- **Database:** PostgreSQL via Supabase
- **Deployment:** HuggingFace Spaces (Docker)
- **Data Extraction:** Custom scrapers in `extractors/`

### Deployment
- **Frontend:** Vercel (CLI deploy: `vercel --prod`)
- **Backend:** HuggingFace Spaces (git push to `hf-space/`)
- **Database:** Supabase PostgreSQL

---

## Critical Rules

1. **API URL:** The production API URL is `https://bhidy-financehub-api.hf.space`. Hardcode this as a fallback in `frontend/lib/api.ts`. Never use `localhost` in production builds.

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
| `hf-space/` | FastAPI backend deployed to HuggingFace Spaces |
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

### Deploy Backend to Production
```bash
cd hf-space && git push origin main
```

### Check Production Health
```bash
curl https://bhidy-financehub-api.hf.space/health
```

---

## Debugging Tips

- **Data Issues:** Check `ingestion.log` and correlate with `backend/extractors/` or `hf-space/scripts/`.
- **Frontend Errors:** Look at browser console and `frontend/lib/api.ts` for request failures.
- **Backend Errors:** Check HuggingFace Spaces logs at `https://huggingface.co/spaces/Bhidy/financehub-api/logs`.
