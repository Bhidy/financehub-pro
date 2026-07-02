# FinanceHub Pro - Gemini CLI Context

> ⚠️ **PARTIALLY STALE — corrected 2026-07-02.** Read [`docs/CANONICAL_STATE.md`](docs/CANONICAL_STATE.md) first; it overrides anything here. Corrections to claims below: the market is **Egypt/EGX only** (not Saudi/GCC); backend dev port is **7860** (not 8000); primary data is **TradingView** (not Mubasher — Mubasher is funds/news only); the backend deploys **only** via `gh workflow run backend-deploy.yml` — the `deploy_production.sh` / `deploy_smart.sh` / direct-SSH instructions further down are **retired and unsafe** (laptop→server SSH is edge-blocked). The repo is **public**.

## Project Overview

FinanceHub Pro is an enterprise-grade financial intelligence platform for the **Egyptian Exchange (EGX only)**. (Historical note: earlier versions targeted Saudi Arabia / GCC; that support was dropped — see [`docs/CANONICAL_STATE.md`](docs/CANONICAL_STATE.md).)

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

### Backend (`backend-core/` - Dockerized on Hetzner)
- **Framework:** FastAPI (Python 3.10+)
- **Database:** PostgreSQL via Supabase
- **Deployment:** Hetzner VPS (Docker Compose; deploy via the "Backend Deploy" GitHub Action or scripts/deploy_backend_key.sh)
- **Server IP:** `46.224.223.172` — SSH is **key-only** (password auth disabled 2026-06).
- **SSH auth:** key `~/.ssh/starta_deploy` (NO password). Backend deploy: `./scripts/deploy_backend_key.sh`.
- **Secrets:** never commit credentials. Server/DB secrets live in the server `.env` and your local gitignored `.env` only — never in tracked files.
- **Data Extraction:** Custom scrapers in `extractors/`

### Deployment
- **Frontend:** Vercel (project `finhub`). Deploy = **merge a PR to `main`** → Vercel Git Integration auto-builds and `startamarkets.com` auto-follows. **Never run `vercel --prod`/`vercel alias`.** See `docs/DEPLOY_RUNBOOK.md`.
- **Backend:** Hetzner VPS — `./scripts/deploy_backend_key.sh`.
- **Database:** Supabase PostgreSQL

---

## Critical Rules

1. **API URL:** The production API URL is `https://starta.46-224-223-172.sslip.io/api/v1`. Hardcode this in `frontend/lib/api.ts`.
2. **Deployment (frontend):** Deploy = **merge a PR to `main`**. Vercel's Git Integration (project `finhub`) builds it automatically and `startamarkets.com` auto-follows — that is the ONLY web deploy path. **NEVER** run `vercel`, `vercel --prod`, `vercel alias`, or `./scripts/deploy_production.sh frontend`; those are removed/forbidden because they created a competing build that raced the git deploy (the root cause of every "changes-not-live" incident). Authoritative procedure: `docs/DEPLOY_RUNBOOK.md`.
  3. **CSS:** Use Tailwind v4 utility classes. The color palette is defined in `frontend/app/globals.css`. Avoid purple/indigo; prefer blues, greens, teals, reds, oranges.
  4. **AI Integration:** The AI chatbot uses Groq SDK. The system prompt and tool definitions are in `frontend/app/api/chat/route.ts`.
  5. **Data Integrity:** All stock data comes from Mubasher. If data is missing, check the extraction logs (`ingestion.log`, `fill_data.log`).
  6. **Configuration Updates:** When updating environment variables (like secrets) on Hetzner, Docker containers MUST be restarted with `--force-recreate` to pick up the changes. The `setup_hetzner.sh` script handles this automatically.
  7. **CLOUD-ONLY MANDATE:** All automated processes (schedulers, scrapers, data sync) MUST run on the Cloud Infrastructure (Hetzner + GitHub Actions). **Local execution of automated workflows is STRICTLY PROHIBITED** to prevent data corruption and IP bans. The local machine is for development only.
  8. **CHAT ROUTE STRUCTURE (CRITICAL):** The canonical production chatbot URL is `https://startamarkets.com/AiChat`. Deprecated aliases such as `/ai-analyst`, `/ai-mobile`, and `/mobile-ai-analyst` must never be reintroduced. The Market Dashboard remains available at `/dashboard`.

  ## 🔒 SECURITY & SECRETS MANAGEMENT (ENTERPRISE STANDARDS)
  > [!IMPORTANT]
  > **SECRETS ARCHITECTURE:**
  > - **NO HARDCODED SECRETS:** All credentials, database URLs, API keys (Groq, OpenAI-embeddings, Resend, Google), and JWT `SECRET_KEY` MUST be loaded from environment variables (`.env`).
  > - **NO FALLBACK SECRETS IN CODE:** Do not implement string concatenations or logical ORs for enterprise secrets in the codebase. Strict reliance on `.env` or `os.getenv` is mandatory for the v5.0.0-SECURE architecture.
  > - **CORS POLICY:** FastAPI CORS origins are strictly controlled to explicit production and local development origins in `main.py`.

  ## DATA INTEGRITY & PROTECTION RULES
  > [!CRITICAL]
  > **SECTOR CLASSIFICATION IS SACRED.**
  > The `sector_name` column in `market_tickers` is strictly controlled by the Master Excel File (`backend-core/data/EGX_Stocks_Sectors.xlsx`).
  > **NEVER** allow automated scrapers (e.g., `market_loader.py`, `admin.py`, `ingest_stockanalysis.py`) to overwrite this column.
  > **REQUIRED LOGIC for Updates**: Always use `COALESCE(market_tickers.sector_name, EXCLUDED.sector_name)` in SQL updates. If a sector exists, KEEP IT. Only update if NULL.

  ## STRICT ARCHITECTURE RULES (CRITICAL)
  > [!IMPORTANT]
  > **NO HUGGINGFACE**: HuggingFace is **completely banned**. Do not use `hf.space`, `huggingface.co`, or any related domains. The backend is **ONLY** on Hetzner.
  > **BACKEND LOCATION**: The real backend code is in `backend-core/`. **NEVER USE `backend/`**. The `backend/` folder is legacy and should be ignored for all deployment and development purposes.
  > **DEPLOYMENT**: The `Dockerfile` MUST copy from `backend-core/`. Always verify this before deploying.

---

## 🔒 PROTECTED: 4-Layer Chatbot Response Structure

> [!CAUTION]
> ## ⚠️ DO NOT MODIFY WITHOUT EXPLICIT USER REQUEST ⚠️
> This chatbot response structure is **PRODUCTION-CRITICAL** and has been approved by the product owner.
> **AI Agents: DO NOT change, remove, or "improve" any of these components unless the USER explicitly requests it.**
> Breaking this structure will result in a degraded user experience.

### The 4 MANDATORY Layers (ALL responses MUST have these)

| Layer | Component | Description | NEVER Remove |
|-------|-----------|-------------|--------------|
| 1 | **Greeting/Opening** | Personalized greeting with user's first name. Example: "Got it, Mohamed. Let me show you..." | ⛔ PROTECTED |
| 2 | **Data Cards** | Stock data, metrics, charts, screener results | ⛔ PROTECTED |
| 3 | **Learning Section** | Blue box with 📊 title and educational bullet points explaining the data | ⛔ PROTECTED |
| 4 | **Follow-up Prompt** | Gray box with 💡 suggesting what to explore next | ⛔ PROTECTED |

### Protected Files (DO NOT MODIFY without explicit request)

| File | Purpose | Protection Level |
|------|---------|------------------|
| `backend-core/app/chat/chat_service.py` | Lines 504-540: 4-Layer structure guarantee | 🔴 CRITICAL |
| `backend-core/app/chat/llm_explainer.py` | Narrative generation prompts | 🔴 CRITICAL |
| `backend-core/app/chat/learning_section_generator.py` | Educational bullets | 🟠 HIGH |
| `backend-core/app/chat/follow_up_generator.py` | Follow-up suggestions | 🟠 HIGH |
| `frontend/app/AiChat/page.tsx` | Canonical AI chat entry route | 🔴 CRITICAL |
| `frontend/components/chatbot/ResponsivePage.tsx` | Shared AI chat rendering surface | 🔴 CRITICAL |
| `frontend/hooks/useAIChat.ts` | Response type definitions | 🟠 HIGH |

### What an AI Agent CAN Do

✅ Fix bugs that prevent the 4 layers from appearing
✅ Improve the content/quality within each layer
✅ Add new card types to Layer 2
✅ Update the learning definitions in Layer 3
✅ Change follow-up suggestions in Layer 4

### What an AI Agent MUST NOT Do

❌ Remove any of the 4 layers
❌ Make any layer conditional (they must ALWAYS appear)
❌ Change the rendering order of the layers
❌ Remove the fallback guarantees in chat_service.py
❌ Modify the response type definitions in useAIChat.ts
❌ "Simplify" or "clean up" the response structure



  ---

## Directory Map

| Directory | Purpose |
|-----------|---------|
| `frontend/` | Next.js application deployed to Vercel |
| `frontend/app/` | App Router pages |
| `frontend/components/` | Reusable React components |
  | `frontend/lib/api.ts` | API client configuration |
  | `backend-core/` | **PRODUCTION BACKEND** (FastAPI on Hetzner) |
  | `backend-core/app/api/v1/` | API endpoints |
  | `backend-core/scripts/` | Data extraction and maintenance scripts |
  | `backend/` | **LEGACY/DEPRECATED** (Do not use) |
  | `scripts/` | Root-level utility scripts |
  | `.agent/workflows/` | Deployment and verification workflows |

---

## Common Tasks

### Start Local Development
```bash
# Frontend (http://localhost:3000)
cd frontend && npm install && npm run dev

# Backend (http://localhost:8000 — API docs at /docs)
cd backend-core && pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Deploy Frontend to Production
```bash
# Deploy = merge your PR to `main`. Vercel (project finhub) builds it and
# startamarkets.com auto-follows. There is NO frontend deploy command.
# Verify it went live (verify-only — does not deploy):
./scripts/deploy-web.sh
```

### Check Production Health
```bash
curl https://starta.46-224-223-172.sslip.io/health
```

### Deploy Backend to Hetzner
```bash
./scripts/deploy_backend_key.sh
```

### Force "Nuclear" Backend Rebuild (Immediate)
```bash
./scripts/deploy_production.sh backend nuclear
```

## AI & DEPLOYMENT PROTOCOLS (STRICT ENFORCEMENT)
> [!CAUTION]
> **VIOLATION OF THESE RULES CAUSES SYSTEM FAILURE.**
> Future Agents: You MUST follow these protocols accurately.

### 1. The "Smart" Deployment Strategy (Standard)
**NEVER** use manual `git pull` on the server.
**ALWAYS** use the automated Smart Deployment script. This handles git sync, targeted caching, and zero-downtime rolling updates.

1.  **Run Locally:**
    ```bash
    ./scripts/deploy_smart.sh
    ```
2.  **Verify:**
    ```bash
    python3 scripts/verify_live_7layer.py
    ```

**Fallback (Emergency Only):**
If Smart Deployment fails repeatedly, use the "Nuclear" option:
```bash
./scripts/deploy_production.sh backend nuclear
```

### 2. Infrastructure Constraints (Disk & CPU)
-   **NO GPU/CUDA:** The server is a standard VPS. Installing default `torch` will fill the disk (2.5GB+).
-   **REQUIREMENT:** Always use `torch --index-url https://download.pytorch.org/whl/cpu`.
-   **MONITORING:** running `df -h` is mandatory before and after large builds.

### 3. Connectivity & SSL
-   **NO GENERIC BINDINGS:** Caddy MUST use the explicit domain (e.g., `starta.46-224-223-172.sslip.io`) to trigger ACME.
-   **VERIFICATION:** After deployment, run `scripts/verify_full_system.py` to prove SSL and Logic are healthy.

### 4. Code & Context
-   **Backend:** Always uses `backend-core/`. The `backend/` folder is a decoy/legacy.
-   **Context:** `Dockerfile` COPY command must be `COPY . .` from within `backend-core` context, NOT root.

### 5. CLOUD-ONLY OPERATIONS (MANDATORY)
-   **NO LOCAL CRON:** Do not set up cron jobs or scheduled tasks on the local development machine.
-   **HEADLESS SCRAPERS:** All extraction scripts must run in `headless=True` mode on the server.
-   **GITHUB ACTIONS:** Use GitHub Actions for external triggers (Watchdog).
-   **INTERNAL SCHEDULER:** Use the internal FastAPI scheduler (active on server startup) for continuous tasks.
-   **VERIFICATION:** Use `CLOUD_VERIFICATION_CERTIFICATE.md` as the standard for audit compliance.

### 6. AUTOMATED UPDATE PROTOCOLS (SYNC POLLING)
> [!IMPORTANT]
> **FAILURE TO FOLLOW THIS PROTOCOL WILL CAUSE "FALSE SUCCESS" AND DATA STALENESS.**

1.  **SYNCHRONOUS POLLING (MANDATORY)**:
    -   GitHub Actions (Workflows) MUST NOT just "trigger" an API endpoint.
    -   They MUST **trigger + poll**.
    -   **Pattern**: Trigger API -> Loop `while status.is_running == true` -> Sleep 10s -> Check again.
    -   **Exit Condition**: Only exit when status is `success` or `failure`.

2.  **BACKEND TRANSPARENCY**:
    -   All long-running backend functions (`ingestion`, `backfill`, `sync`) MUST use a global lock/status tracker (`refresh_status`).
    -   They MUST provide **live callbacks** or updates to this tracker (e.g., `Ingesting 15/223...`).
    -   Never use "fire-and-forget" background tasks without a way to track them.

3.  **ALL CLOUD, ZERO LOCAL**:
    -   All scheduling is handled by GitHub Actions (Watchdog) or the internal FastAPI Scheduler.
    -   Your local machine is **NEVER** the runner.
    -   Verification of these processes must be done by inspecting **server logs** (`docker logs starta-backend-1`), not local output.

### 7. BULLETPROOF DEPLOYMENT PROTOCOL (MANDATORY)
> [!CAUTION]
> **THIS IS THE ONLY CORRECT WAY TO DEPLOY. FAILURE TO FOLLOW CAUSES DISK FULL ERRORS AND TIMEOUTS.**

#### Pre-Deployment Checklist
1. **Check Disk Space FIRST**: 
   ```bash
   ssh root@46.224.223.172 "df -h"
   ```
   - If usage > 70%, run aggressive prune: `docker system prune -af --volumes`
   - Minimum 15GB free required for torch/sentence-transformers builds

2. **Commit and Push**:
   ```bash
   git add . && git commit -m "Your message" && git push origin main
   ```

#### Deployment Command (Standard)
```bash
./scripts/deploy_smart.sh
```

#### Emergency Fallback (Nuclear)
Use ONLY if disk is full or Docker is corrupted.
```bash
./scripts/deploy_production.sh backend nuclear
```

#### Post-Deployment Verification
```bash
curl https://starta.46-224-223-172.sslip.io/health
```
Expected: `"version": "X.X.X-YOUR-VERSION"`, `"status": "healthy"`

#### Common Failure Modes & Fixes
| Error | Cause | Fix |
|-------|-------|-----|
| `no space left on device` | Disk full from Docker cache | Run `docker system prune -af --volumes` on server |
| `ReadTimeoutError (pytorch CDN)` | Network timeout | Wait and retry - pip auto-retries 5 times |
| `parent snapshot does not exist` | Stale Docker cache | Run `docker system prune -af` before build |
| Expect script timeout | Large image export > 1200s | Retry - image is cached after first build |

#### Emergency Recovery
If deployment fails mid-way:
```bash
ssh root@46.224.223.172 "cd /opt/starta && docker system prune -af --volumes && docker compose -f docker-compose.prod.yml up -d --build"
```

---

## Multi-Provider LLM System (High Availability)

> [!IMPORTANT]
> The chatbot uses a multi-provider LLM fallback system to ensure **zero downtime** when any single provider's quota is exhausted.

### Provider Priority Order
| Priority | Provider | Daily Limit | Base URL |
|----------|----------|-------------|----------|
| 1 (only) | **Groq** | 100K tokens/day | `api.groq.com` |

> Groq is the **sole** AI provider. If Groq is unavailable, the chatbot degrades
> gracefully (data cards still render; only the LLM narrative is skipped).
> `OPENAI_API_KEY` is used **only** for chat-memory embeddings, not chat.

### API Keys Location
**Server:** `/opt/starta/.env`
```bash
GROQ_API_KEY=<REDACTED-ROTATE-ME>              # Primary + only chat provider
```

### Quota Renewal Schedule
| Provider | Renewal Time | How to Check |
|----------|--------------|--------------|
| Groq | Midnight UTC | [console.groq.com](https://console.groq.com) |

### Implementation Files
| File | Purpose |
|------|---------|
| `backend-core/app/chat/llm_clients.py` | Multi-provider orchestrator |
| `backend-core/app/chat/llm_explainer.py` | Narrative generation |
| `backend-core/app/chat/middleware/paraphraser.py` | Slang translation |

### Guaranteed 4-Layer Response Structure
Every chatbot response MUST have:
1. ✅ **Greeting/Opening** - "Welcome back, {name}" or "Got it, {name}"
2. ✅ **Data Cards** - Stock metrics, charts, tables
3. ✅ **Learning Section** - Educational bullet points (always present)
4. ✅ **Follow-up Prompt** - Suggested next action (always present)
