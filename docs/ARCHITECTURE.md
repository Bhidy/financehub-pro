# Starta Markets — System Architecture
*Current as of 2026-06. Supersedes the older `SYSTEM_ARCHITECTURE_ANALYSIS.md` (now in `archive/`).*

Bilingual (Arabic/English) financial-intelligence platform for the Egyptian Exchange (EGX): real-time market data, mutual-fund NAV/performance, news, an educational academy, portfolios, and an AI chatbot.

---

## 1. Production topology

```
                         ┌──────────────────────────────┐
   users ──HTTPS──▶  startamarkets.com (Vercel)         │
                     │  Vercel project: "finhub"          │
                     │  projectId prj_EYpG42djOp1vEYI5…   │
                     │  Next.js frontend (Root Dir: frontend) │
                     └───────────────┬────────────────────┘
                                     │  /api/v1/...  (same-origin)
                                     ▼
                     ┌──────────────────────────────┐
                     │  Hetzner VPS (Docker)         │
                     │  FastAPI — backend-core/app   │
                     │  Port 7860                    │
                     │  AI chat engine + REST API    │
                     └───────────────┬────────────────┘
                                     ▼
                     ┌──────────────────────────────┐
                     │  Supabase PostgreSQL          │
                     │  (cloud — source of truth)    │
                     └──────────────────────────────┘

   Data refresh:  GitHub Actions (watchdog/cron)  ──triggers──▶  backend extraction jobs
```

| Layer | Tech | Host | Source path |
|---|---|---|---|
| Frontend | Next.js (App Router) + static public HTML | Vercel (`finhub`) | `frontend/` |
| Backend API + AI | FastAPI / Python 3.11 / Docker, port 7860 | Hetzner VPS | `backend-core/app/` |
| Database | PostgreSQL | Supabase (cloud) | — |
| Data ingestion | Scrapers + scheduler | GitHub Actions + Hetzner | `backend-core/scripts/`, `data_pipeline/` |

---

## 2. Frontend

Two coexisting surfaces under `frontend/`:

1. **Static branded public site** — `frontend/public/*.html` (home, marketplace, fund-details, learn, news, market-pulse), served via Next.js **rewrites**. This is what `startamarkets.com/`, `/Funds`, `/Learn`, `/News`, `/Market-Pulse` serve. See [`STARTAMARKETS_PUBLIC_SITE.md`](STARTAMARKETS_PUBLIC_SITE.md).
2. **React App Router app** — `frontend/app/*` (AiChat, portfolio, screener, admin, etc.) for the dynamic/authenticated product.

`frontend/middleware.ts` enforces the **canonical host** (any `*.vercel.app` → 308 → `startamarkets.com`) and legacy chat-route redirects.

**API routing (hybrid):** `frontend/next.config.ts` rewrites `/api/:path*` to the FastAPI backend (`NEXT_PUBLIC_API_URL`), **and** there are ~55 Next.js route handlers under `frontend/app/api/` running on Vercel. So some endpoints are served by Vercel, others proxied to Hetzner — both appear same-origin under `startamarkets.com/api/...`. The backend sits behind **Caddy** (SSL + reverse proxy) on the VPS; its env is at `/opt/starta/.env`.

---

## 3. Backend (`backend-core/app`)

Deployed via **`backend-core/Dockerfile`** (`FROM python:3.11-slim`); `docker-compose.prod.yml` builds `context: ./backend-core`. Entry: `app.main:app`, port 7860. (The old root `Dockerfile` / `Dockerfile.base` / `starta-base` image were unused and removed 2026-07.)

Key areas:
- `app/api/v1/endpoints/` — REST endpoints: `auth`, `otp_auth`, `google_auth`, `ai` (chat), `market`, `portfolio`, `yahoo`, `company`, `egx`, `admin`, `analytics_router`, `user`, `trading`.
- `app/chat/` — **the AI chatbot** (see §4).
- `app/services/` — business logic incl. `scheduler.py`.
- `app/db/`, `app/core/` — DB access + configuration.

> **Scheduler note:** the in-process scheduler (`engine.scheduler`) runs **only in dev** and is `try/except`-guarded. In **production it is disabled** — data extraction is driven by **GitHub Actions**. (`backend-core/engine/` is not in the repo; the `Dockerfile` COPY for it is intentionally disabled — see the Dockerfile comment.)

---

## 4. AI chatbot pipeline (`backend-core/app/chat/`)

Protected, multi-stage. **Do not bulk-edit or delete this directory.**

```
USER MESSAGE
  → text normalizer (Arabic/dialect, symbol extraction)
  → compliance check (banned topics, disclaimers)
  → intent router (rule-based, 30+ intents)
  → symbol resolver (ticker/nickname/db fuzzy/context)
  → dispatch to handler (price, financials, chart, screener, deep-dive, dividends, news, ...)
  → LLM explainer (multi-provider fallback)
  → response builder (greeting → data cards → learning → follow-up)
```

**LLM providers (env-keyed, fallback order):** `GROQ_API_KEY` (primary) → `MISTRAL_API_KEY`, with `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` available. All read via `os.getenv` — **never hardcoded**. Keys live in the Hetzner backend `.env` (not Vercel). See [`SECURITY.md`](SECURITY.md).

---

## 5. Data pipeline & sources

The DB is kept fresh by extraction jobs (cloud-scheduled via GitHub Actions; **never run locally** — IP-ban / conflict risk).

| Source | Role |
|---|---|
| **TradingView** (`scanner.tradingview.com`) | 🟢 **PRIMARY EGX feed** — live prices (`EGX_PRIMARY_TV=1`), technicals, 20yr statements, estimates, dividends, news, ISIN/logos. Drop-in `SOURCE-0` in `admin.process_egx()` via `EGXFeedRouter` (TV→yfinance fallback). Harvested by `scripts/tv_egx_harvester.py` (workflow `tv-egx-harvester.yml`). See `docs/TRADINGVIEW_EGX_RUNBOOK.md`. |
| Yahoo / yfinance | EGX **fallback** + OHLCV chart history (reservoir `populate_yahoo_reservoir.py` → `ohlc_data`); KSA prices |
| **Mubasher** (`mubasher.info`) | external provider — Egypt/Saudi prices & data (`run_mubasher_job`, daily ~06:00) |
| Decypha | Egypt funds / NAV |
| StockAnalysis | 🔴 deprecated (Cloudflare-blocked; superseded by TradingView) |

> "Mubasher" is an **external data source**, not the product brand. The product is **Starta Markets**.
>
> **EGX feed note (2026-06-03):** the prior live-price path (yfinance `.CA` quote) returned values 30–650% wrong; TradingView is now primary and correct. The `_h` 20-year statement arrays feed `egx_financials`; the symbol page renders Technicals/Forecasts/20yr-Financials tabs.

---

## 6. Database (Supabase PostgreSQL — source of truth)

Representative tables: `market_tickers`, `ohlc_data`, intraday tables, `financial_*`, `valuation_history`, `earnings_*`, `dividend_history`, `mutual_funds`, `nav_history`, `major_shareholders`, plus portfolio tables (`portfolios`, `portfolio_holdings`, `portfolio_snapshots`, `portfolio_transactions`) and users/auth.

**TradingView EGX tables (2026-06-03):** `symbol_map` (ISIN-keyed identity), `egx_technicals` (symbol×timeframe), `egx_estimates` (analyst targets/ratings), `egx_news`, `egx_financials` (20yr annual statements), `egx_dividends` (snapshot + forward ex/payment calendar), `egx_ingest_deadletter`. `market_tickers` gained `isin/logo_url/source/updated_at/recommend_all/beta`. Every table has a DB-enforced UNIQUE natural key (zero-duplicate guarantee). **Supabase Realtime** enabled on `market_tickers/ohlc_data/egx_technicals` (mobile app subscribes; web via ISR/poll).

`DATABASE_URL` is configured in **both** the Hetzner backend `.env` **and** Vercel (the frontend serverless routes connect too). Keep them in sync.

---

## 7. Auth
Email/password + OTP + Google OAuth. JWTs signed with `SECRET_KEY` (backend env), stored client-side. Admin endpoints are gated by `Depends(require_admin)`.

---

## 8. Known issues (see audit report)
- 43 npm vulnerabilities in `frontend/` — address with `npm audit fix` after committing in-flight work.
- Exposed secrets (historical) — **rotate**; see [`SECURITY.md`](SECURITY.md).
