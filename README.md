# Starta Markets

**Bilingual (AR/EN) financial-intelligence platform for the Egyptian Exchange (EGX).**
Real-time market data, mutual-fund NAV & performance, market news, an educational "Learn" academy, portfolios, and an AI chatbot.

> **New here? Read [`START_HERE.md`](START_HERE.md) first.** It is the single orientation doc — what this is, where it deploys, and what *not* to touch.

| | |
|---|---|
| **Public site** | https://startamarkets.com |
| **Internal / Vercel project name** | `finhub` (a.k.a. "FinanceHub Pro" in older docs) |
| **Frontend** | Next.js (App Router) — hosted on **Vercel** |
| **Backend** | FastAPI (Python 3.11, Docker) — hosted on **Hetzner VPS** |
| **Database** | PostgreSQL — **Supabase** (cloud, source of truth) |
| **Repo** | `github.com/Bhidy/financehub-pro` (private) |

> "Starta Markets", "FinanceHub Pro", and the Vercel project "finhub" are **three names for one product**. There is no separate finhub app.

---

## Canonical docs

| Topic | Doc |
|---|---|
| Orientation + governance rules | [`START_HERE.md`](START_HERE.md) |
| Architecture, data flow, AI chatbot, DB schema | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Deploy procedure (web = merge to `main`; no manual alias step) | [`docs/DEPLOY_RUNBOOK.md`](docs/DEPLOY_RUNBOOK.md) |
| Secret management + rotation runbook | [`docs/SECURITY.md`](docs/SECURITY.md) |
| Public website source tree & routing | [`docs/STARTAMARKETS_PUBLIC_SITE.md`](docs/STARTAMARKETS_PUBLIC_SITE.md) |
| What changed in the 2026-06 restructure | [`docs/archive/2026-06-RESTRUCTURE.md`](docs/archive/2026-06-RESTRUCTURE.md) |

---

## Project structure (current)

```
startamarkets/
├── frontend/              # Next.js app → Vercel
│   ├── app/               # App Router pages (incl. /admin/analytics, /admin/users)
│   ├── components/        # React components
│   ├── lib/               # API client, auth
│   ├── public/            # Static branded public site (home.html, market-pulse.html, ...)
│   └── middleware.ts      # canonical-host redirect + legacy route redirects
├── backend-core/          # FastAPI backend → Hetzner (Docker)
│   ├── app/               # main.py, api/v1/, chat/ (AI), services/, db/, core/
│   ├── scripts/           # data extraction / ops scripts
│   └── data_pipeline/     # loaders
├── docs/                  # canonical documentation (+ docs/archive/ for history)
├── index.html             # duplicate of frontend/public/home.html (must stay identical)
├── Dockerfile             # backend image
└── stop_all.sh            # kill local dev processes (ports 3000/8000)
```

---

## Local development

**Prerequisites:** Node.js 18+, Python 3.11+, and access to the Supabase database (connection string in your local `.env`).

```bash
# Frontend (http://localhost:3000)
cd frontend && npm install && npm run dev

# Backend (FastAPI)
cd backend-core && pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 7860
# API docs at http://localhost:7860/docs
```

> ⚠️ **Do not run automated data-extraction scripts locally** — they can cause IP bans or conflict with the production server. Data ingestion runs in the cloud (GitHub Actions + the backend on Hetzner).

---

## Deploying

- **Frontend:** merge to `main` → Vercel Git Integration builds **and auto-aliases** `startamarkets.com` (the old manual `vercel alias` step is obsolete). Verify after merge with `./scripts/deploy-web.sh`. Full procedure: [`docs/DEPLOY_RUNBOOK.md`](docs/DEPLOY_RUNBOOK.md).
- **Backend:** run the **"Backend Deploy"** GitHub Action (`workflow_dispatch`) — it executes on the Hetzner runner itself, so it works even when SSH from a laptop is blocked. Fallback when SSH works: `./scripts/deploy_backend_key.sh`.
- **iOS:** `./scripts/ship-ios.sh` (manual, needs this Mac's Xcode + App Store Connect key).
- **Never run `vercel` from inside `frontend/`** — always from the repo root (Vercel Root Directory is `frontend`).

---

## Status: Online ✅  ·  Public site: https://startamarkets.com
