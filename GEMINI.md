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
2. **Deployment:** ALWAYS use the unified script: `./scripts/deploy_production.sh`. **NEVER** run `npx vercel` or `git push` manually for production updates. This script enforces the critical "Frontend Root Execution" rule.
  3. **CSS:** Use Tailwind v4 utility classes. The color palette is defined in `frontend/app/globals.css`. Avoid purple/indigo; prefer blues, greens, teals, reds, oranges.
  4. **AI Integration:** The AI chatbot uses Groq SDK. The system prompt and tool definitions are in `frontend/app/api/chat/route.ts`.
  5. **Data Integrity:** All stock data comes from Mubasher. If data is missing, check the extraction logs (`ingestion.log`, `fill_data.log`).
  6. **Configuration Updates:** When updating environment variables (like secrets) on Hetzner, Docker containers MUST be restarted with `--force-recreate` to pick up the changes. The `setup_hetzner.sh` script handles this automatically.
  7. **CLOUD-ONLY MANDATE:** All automated processes (schedulers, scrapers, data sync) MUST run on the Cloud Infrastructure (Hetzner + GitHub Actions). **Local execution of automated workflows is STRICTLY PROHIBITED** to prevent data corruption and IP bans. The local machine is for development only.
  8. **ROOT URL STRUCTURE (CRITICAL):** The root URL `https://startamarkets.com/` (i.e., `/`) **MUST ALWAYS serve the AI Chatbot** (`mobile-ai-analyst`). This is the core product experience. The Market Dashboard is available at `/dashboard`. **DO NOT** change this structure or create a different homepage. The file `frontend/app/page.tsx` re-exports the Mobile AI Analyst and must remain unchanged.

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
| `frontend/app/mobile-ai-analyst/page.tsx` | Lines 303-327: UI rendering | 🔴 CRITICAL |
| `frontend/app/ai-analyst/page.tsx` | Desktop UI rendering | 🔴 CRITICAL |
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
./start_all.sh
```

### Deploy Frontend to Production
```bash
### Deploy Frontend to Production
```bash
./scripts/deploy_production.sh frontend
```

### Check Production Health
```bash
curl https://starta.46-224-223-172.sslip.io/health
```

### Deploy Backend to Hetzner
```bash
### Deploy Backend to Hetzner
```bash
./scripts/deploy_production.sh backend
```

### Force "Nuclear" Backend Rebuild (Immediate)
```bash
./scripts/deploy_production.sh backend nuclear
```

## AI & DEPLOYMENT PROTOCOLS (STRICT ENFORCEMENT)
> [!CAUTION]
> **VIOLATION OF THESE RULES CAUSES SYSTEM FAILURE.**
> Future Agents: You MUST follow these protocols accurately.

### 1. The "Nuclear" Deployment Strategy
**NEVER** attempt to "patch" the running server with `git pull` and `docker compose up`. The state will desync.
**ALWAYS** use the Immutable Strategy:
1.  **Stop & Prune:** `docker compose down` AND `docker system prune -af` (Free disk space).
2.  **Rebuild:** `docker compose build --build-arg CACHEBUST=$(date +%s)` (Force fresh code).
3.  **Start:** `docker compose up -d --force-recreate`.
4.  **Reference Script:** Use `scripts/restore_production.exp`.

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

#### Deployment Command (Single Step)
```bash
./scripts/deploy_production.sh backend nuclear
```

#### What the Nuclear Script Does (In Order)
1. `docker compose down` - Stop containers
2. `docker system prune -af` - Clear all caches (CRITICAL for disk space)
3. `git pull origin main` - Fetch latest code
4. `docker compose up -d --build --force-recreate` - Fresh rebuild
5. `sleep 10 && docker ps` - Health check

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
| 1 | **Groq** | 100K tokens/day | `api.groq.com` |
| 2 | **Cerebras** | 14,400 requests/day | `api.cerebras.ai` |
| 3 | **Mistral** | 1B tokens/month | `api.mistral.ai` |

### API Keys Location
**Server:** `/opt/starta/.env`
```bash
GROQ_API_KEY=gsk_...              # Primary (configured)
CEREBRAS_API_KEY=csk-f4w64kfr5pn8dh9m3yrtrvwn8y29556y9vtr5pmxvkyfdwww
MISTRAL_API_KEY=eKM8088tpNHFdFbgEyX8dzoSQszHyoFB
```

### Quota Renewal Schedule
| Provider | Renewal Time | How to Check |
|----------|--------------|--------------|
| Groq | Midnight UTC | [console.groq.com](https://console.groq.com) |
| Cerebras | Midnight UTC | [cloud.cerebras.ai](https://cloud.cerebras.ai) |
| Mistral | Monthly | [console.mistral.ai](https://console.mistral.ai) |

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

