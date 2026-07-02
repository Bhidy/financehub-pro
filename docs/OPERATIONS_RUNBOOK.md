# OPERATIONS RUNBOOK — read this FIRST when something is wrong

> **Purpose:** turn "15 hours of searching" into 15 minutes. This is the single
> entry point for diagnosing and fixing any production incident on Starta Markets
> (repo `Bhidy/financehub-pro`). If you are an AI session or engineer picking this
> up cold, read the **60-second triage** below, then jump to the matching playbook.
> Architecture truth lives in [`CANONICAL_STATE.md`](CANONICAL_STATE.md); deploys
> in [`DEPLOY_RUNBOOK.md`](DEPLOY_RUNBOOK.md). This file is *operations & incidents*.

Last verified: 2026-07-02.

---

## ⚡ 60-second triage — run these first, always

```bash
# 1. What's failing right now? (most incidents show here)
gh run list --repo Bhidy/financehub-pro --limit 15

# 2. Read the actual failure — NEVER guess the cause
gh run view <run-id> --repo Bhidy/financehub-pro --log-failed | tail -60

# 3. Is our most critical dependency (Supabase Postgres) healthy?
#    Public, no-auth incident feed for our region:
curl -s https://status.supabase.com/api/v2/summary.json \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['status']['description']);\
[print(c['name'],c['status']) for c in d['components'] if 'eu-central-1'==c['name']]"

# 4. Trigger the self-diagnosing monitors (they print a full health picture):
gh workflow run db-health-monitor.yml     --repo Bhidy/financehub-pro   # DB writable? fresh? incident?
gh workflow run supabase-mgmt-monitor.yml --repo Bhidy/financehub-pro   # project health + security/perf advisors
gh workflow run pipeline-watchdog.yml     --repo Bhidy/financehub-pro   # every dataset's freshness + schedule liveness
```

**Rule #1: read the log before theorizing.** Today's 15-hour incident was one
error (`ReadOnlySQLTransactionError`) printed in every failed run's log from the
first minute. The taxonomy below exists so you match a symptom to a cause in
seconds.

---

## 🩺 Incident playbooks (symptom → cause → fix)

### A. A *flood* of "Run failed" pushes; many write jobs fail at once
**Almost always: Supabase is READ-ONLY (a platform incident), not our bug.**
- **Confirm:** every failed run's log shows `asyncpg.exceptions.ReadOnlySQLTransactionError: cannot execute INSERT/CREATE TABLE/DROP VIEW in a read-only transaction`, AND the status API (triage step 3) shows `eu-central-1` degraded / an unresolved incident.
- **It is handled automatically:** all write paths now *skip cleanly* on read-only (see `backend-core/data_pipeline/pg_resilient.py` → `database_is_read_only` / `is_read_only_error`; consumers: `tv_egx_harvester.py`, `refresh_stock_statistics.py`, `pipeline_watchdog.py`, `qa/egx_audit.py`). `db-health-monitor` alerts once per transition.
- **Your job:** confirm it's the platform (status API), then **wait**. Do NOT "fix" code. If read-only persists with **no** matching Supabase incident, it may be *our* side (disk full / plan cap) — check disk via the metrics layer / Supabase dashboard.
- History: [`supabase-readonly-resilience` memory], incident 2026-07-02 18:22–~20:00 UTC.

### B. Pipeline Watchdog RED: `charts/ohlc STALE (max date X, expected ≥ Y)`
**Usually a MISSING EGX HOLIDAY in the trading calendar — a false positive, not a data gap.**
- EGX trades **Sun–Thu**; holidays are hardcoded in **TWO files that must stay in lockstep**:
  `scripts/pipeline_watchdog.py` (`EGX_HOLIDAYS`) **and** `frontend/app/api/v1/health/freshness/route.ts` (`EGX_HOLIDAYS`).
- If "expected" date is a market holiday, add it to **both** sets (same date string). Verify with `_is_trading_day()` / `isTradingDay()`.
- Do **NOT** blindly rewrite moveable Islamic-holiday dates from the web — a *wrong* holiday MASKS real staleness. Confirm against the owner / official egx.com.eg calendar.
- Only if the day really WAS a trading session and data is genuinely missing: backfill via `egx-history-backfill.yml` (daily candles) — the intraday `prices` cycle CANNOT backfill a past daily candle post-close.

### C. Discord alerts fail / owner not getting alerts
- Discord rejects webhook POSTs sent with a default `Python-urllib/x.y` or `python-httpx` User-Agent (**HTTP 403**). Every Discord sender MUST set an explicit `User-Agent` header (e.g. `Starta/1.0 (+https://startamarkets.com)`). Senders live in `scripts/notify.py`, `scripts/pipeline_watchdog.py`, `scripts/tv_field_reconcile_gate.py`, `scripts/symbol_data_quality_gate.py`, `backend-core/app/services/notification_service.py`.
- `notify.send_alert()` is the canonical multi-channel sender (Discord → webhook → email → GitHub issue). Prefer it.

### D. Watchdog auto-heal shows `dispatch-failed`
- The watchdog dispatches corrective workflows via `gh` using `WATCHDOG_DISPATCH_TOKEN` (falls back to `GITHUB_TOKEN`). `_gh()` now LOGS the gh error on failure — read it. Common causes: a transient GitHub 5xx (retries next cycle) or the PAT lacking `actions:write`. The workflow itself already grants `permissions: actions: write`.

### E. `QA write-contract` gate is NO-GO / RED on a PR
- If the reason is `ReadOnlySQLTransactionError` → it's the read-only incident (the gate now SKIPs this neutrally; a red one predates the fix — rebase on `main`).
- If it's `UndefinedColumn/Table/Syntax` → **real schema drift**: the write SQL no longer matches the live schema. Fix the SQL or update the probe args in `qa/egx_audit.py` in the SAME commit.

### F. Backend (FastAPI) down or bad deploy
- Only deploy path: `gh workflow run backend-deploy.yml -f reason="…"` (health-gated, auto-rollback). Never SSH-deploy by hand. See [`DEPLOY_RUNBOOK.md`](DEPLOY_RUNBOOK.md).

---

## 🔑 Access & credentials inventory (what we can do, and the traps)

**GitHub Actions secrets** (names only — values are never printed; `gh secret list --repo Bhidy/financehub-pro`):

| Secret | Unlocks | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase Postgres (pooler, port 6543) for all jobs/monitors | **Rotated 2026-07-02** — the local `.env` still has the OLD password, so local DB connects FAIL with `password authentication failed`. Use CI or the PAT run-SQL instead. |
| `SUPABASETOKENKEY` | **Supabase Management API** (PAT): project health, advisors, run-SQL (no DB pw), backups/PITR, read-replicas, resize, config | Account-wide credential. Used by `supabase-mgmt-monitor.yml`. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Metrics API** (Prometheus): disk %, CPU, mem, connections vs pooler cap | ✅ present (2026-07-02). Powers the `db-health-monitor` infra step (`scripts/supabase_metrics.py`). **God-key** — bypasses RLS; secret-only, never client-side. |
| `DISCORD_WEBHOOK_URL` | Alerts | Needs explicit User-Agent (see playbook C). |
| `WATCHDOG_DISPATCH_TOKEN` | Watchdog self-heal `gh workflow run` | Needs `actions:write`. |
| `HETZNER_API_TOKEN` | **Hetzner Cloud API** (project "Starta"): server status/type/IP, reboot/resize | ✅ present (2026-07-02). Read&Write, project-scoped (blast radius = the 1 backend server). Used by `hetzner-infra-monitor.yml`. |
| `NOTIFICATION_EMAIL`, `SMTP_PASSWORD` | Email alert fallback | |
| `GROQ_API_KEY`, `ADMIN_API_TOKEN` | AI chat / admin | Rotated 2026-07-02. |

**Access we DO have:** GitHub (gh CLI + `git@github.com` SSH), Supabase dashboard (browser, session expires fast), Supabase Management API (PAT), Vercel (via git-push auto-deploy of `finhub` project).

**Access we do NOT have (gaps — see roadmap):**
- **Hetzner VPS SSH** (`root@46.224.223.172`, `/opt/starta`) — publickey **denied** from the dev Mac. The backend host (Docker, Caddy, cron, disk, logs) is only reachable via `backend-deploy.yml`. Ad-hoc host debugging is blind.
- **`workflow` scope on the gh token** — missing. Pushing branches that touch `.github/workflows/**` MUST use the SSH remote: `git push git@github.com:Bhidy/financehub-pro.git HEAD:<branch>`. Non-workflow branches push fine over https.
- **Vercel API token** — no programmatic frontend deploy/log access (deploys happen via `main` push).

---

## 🛰️ Monitoring & alerting topology (what watches what)

| Monitor (workflow) | Watches | Cadence | Alerts |
|---|---|---|---|
| `db-health-monitor.yml` (`scripts/db_health_probe.py`) | DB writable/recovery/size/connections/freshness **+ Supabase status API** | ~10 min | Discord, once per state transition (dedup via Actions cache) |
| `supabase-mgmt-monitor.yml` (`scripts/supabase_mgmt.py`) | PAT validity, project status, network-restrictions, **Security + Performance Advisors** | daily 06:00 UTC (GitHub-hosted) | Discord on ERROR-level security findings |
| `hetzner-infra-monitor.yml` (`scripts/hetzner_infra.py`) | The backend VPS via the Hetzner Cloud API: server running/off, type, IP, reboots | ~30 min (GitHub-hosted) | Discord on server state change |
| `pipeline-watchdog.yml` (`scripts/pipeline_watchdog.py`) | Every dataset's freshness SLA, schedule liveness of all crons, runner disk; auto-heals via dispatch | ~hourly | Discord + honest RED exit when a problem is unhealed |
| `*-freshness-monitor.yml` | Per-domain freshness (stocks/funds) | scheduled | Discord |
| `backend-deploy.yml` | Health-gated backend deploy w/ auto-rollback | on dispatch | GitHub issue on failure |

Alert channels (in `notify.send_alert` order): **Discord → generic webhook → email → GitHub issue** (last resort needs no external creds).

---

## ⚠️ Known traps (each has bitten us; do not relearn the hard way)

1. **Single self-hosted runner** (`[self-hosted, linux, x64, hetzner]`) is a SPOF and a throughput bottleneck — it queues every job serially and drops ~2/3 of scheduled fires. Do not assume parallelism; dispatched runs can wait many minutes.
2. **`EGX_HOLIDAYS` lockstep** — watchdog + frontend freshness route must match (playbook B).
3. **`frontend/public/index.html` must be byte-identical to `home.html`** (a prebuild gate `verify-route-aliases.mjs` enforces it).
4. **Local `.env` DB password is stale** (post-rotation) — don't waste time debugging "auth failed" locally; use CI.
5. **TradingView is primary; Yahoo EGX froze 2024-07-23** — never source EGX prices from `yahoo_cache`.
6. **Surgical `git add` only** — the working tree can carry unrelated WIP.

---

## 🚀 Automation roadmap — to make this world-class & fully hands-off

**Have:** DB-health monitoring, Management-API/Advisors monitoring, freshness/schedule watchdog, read-only resilience, multi-channel alerting, health-gated backend deploy with rollback.

**Gaps + what's needed:**
1. **Infra-metrics early warning** — ✅ **DONE** (2026-07-02): `scripts/supabase_metrics.py` scrapes the Prometheus Metrics API (`https://<ref>.supabase.co/customer/v1/privileged/metrics`, Basic auth `service_role`) for disk %, memory, connections and alerts *before* a disk-full/connection-exhaustion read-only. Runs inside `db-health-monitor.yml`.
2. **Kill the single-runner SPOF** — 🔄 **in progress** (2026-07-02): API-only monitors moved to GitHub-hosted `ubuntu-latest` (`supabase-mgmt-monitor`, `hetzner-infra-monitor` — free on a public repo). `db-health-monitor` moves too once `supabase-mgmt-monitor` confirms network restrictions are OPEN (it now reports them); if an IP allowlist exists, DB-touching monitors stay on the fixed-IP self-hosted runner. `pipeline-watchdog` stays self-hosted (its runner-disk check watches the box).
3. **Synthetic end-to-end uptime** — a monitor that hits `startamarkets.com` + the backend API every N min and asserts 200 + sane payload (nothing currently proves the *live* app is up/correct).
4. **Host visibility** — ✅ **DONE** (2026-07-02): `scripts/hetzner_infra.py` watches the VPS via the Hetzner Cloud API (`HETZNER_API_TOKEN`, project-scoped to Starta) — server running/off, type, reboots. Raw SSH remains denied/break-glass; ad-hoc box shell still only via `ops-inspect.yml`.
5. **Secret hygiene** — enable GitHub secret-scanning + push-protection and a rotation calendar (repo is public; keys have leaked before).

Keep this file current: when a new incident class appears, add a playbook here in the SAME session you fix it.
