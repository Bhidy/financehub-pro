# CANONICAL SYSTEM STATE — read this before trusting any other doc

> **Purpose:** one verified, current description of what this system *actually is*, what is
> **live**, what is **legacy/dormant (do not touch or delete)**, and what is **dead**.
> Older docs contain stale claims (Saudi market, Railway, Yahoo-as-primary, "repo is
> private", "deploy-web.sh deploys"). When another doc disagrees with this file, **this file
> wins.** Last verified against live infra + code: **2026-07-02**.

---

## 1. What the product is (verified)

Bilingual (AR/EN) financial-intelligence platform for the **Egyptian Exchange (EGX only)**.
One product, three names: **Starta Markets** (brand) = **FinanceHub Pro** (engineering) =
Vercel project **`finhub`** (`prj_EYpG42djOp1vEYI5BTadOreRFWC0`).

| Layer | Tech | Host | Source dir |
|---|---|---|---|
| Frontend | Next.js 16 (App Router) + static public HTML | **Vercel** (`finhub` → startamarkets.com) | `frontend/` |
| Backend / AI | FastAPI (Python 3.11) in Docker, port **7860**, behind Caddy | **Hetzner VPS** `46.224.223.172` (`/opt/starta`) | `backend-core/` |
| Database | PostgreSQL (source of truth) | **Supabase** (pooler `:6543`) | — |
| Automation | GitHub Actions (self-hosted runner on the Hetzner box) + APScheduler | GitHub / Hetzner | `.github/workflows/`, `scripts/` |

> **Egypt only.** Saudi/KSA/GCC support was **dropped**. Any "Saudi", "TASI", "`.SR`", or
> "Aramco/2222" reference in code or docs is **legacy** (see §5). The DB may still contain a
> few stray non-EGX rows — treat them as data debt, not features.

## 2. Deploy — the ONLY correct paths

- **Web (startamarkets.com):** merge a PR to `main`. Vercel's Git integration builds `finhub`
  and the domain auto-follows. **There is no CLI deploy and no alias step.**
  `./scripts/deploy-web.sh` is **VERIFY-ONLY** — it health-checks the live site, it does **not**
  deploy or alias. **Never run `vercel`, `vercel --prod`, or `vercel alias set` by hand** —
  manual aliasing was the root cause of past split-brain prod incidents.
- **Backend (Hetzner):** `gh workflow run backend-deploy.yml -f reason="…"`. It runs on the
  self-hosted runner *on the box*, provisions `SECRET_KEY`/`ADMIN_API_TOKEN` into the server
  `.env`, rebuilds the container, and is **health-gated with auto-rollback**. Direct
  laptop→server SSH is **blocked at the network edge**; there is no local `~/.ssh/starta_deploy`
  by default. `deploy_backend_key.sh` is a fallback that only works where SSH is allowed.
- **iOS (TestFlight):** `./scripts/ship-ios.sh` (needs Xcode + the App Store Connect key at
  `~/.appstoreconnect/private_keys/AuthKey_53QD83W9UK.p8`).
- **Merge discipline:** `main` is branch-protected (4 required CI checks, linear history).
  Use `gh pr merge --squash --auto --delete-branch` so the merge waits for green CI.
  One PR = one concern. Any change to harvester/loader write-SQL is gated by the
  `QA write-contract` CI job (dry-runs the exact statements against the live schema).

## 3. Data sources — who owns what (verified)

| Source | Role today | Status |
|---|---|---|
| **TradingView** (`scanner.tradingview.com`) | **PRIMARY** EGX live prices, technicals, 52W bounds, statements, dividends, estimates, news | ✅ authoritative |
| `ohlc_data` + `market_tickers` (own DB) | The platform's **own truth** for candles & quotes | ✅ authoritative |
| **Yahoo / yfinance** | **LEGACY, still wired.** OHLC-history reservoir + fallback only. Its live-quote feed **froze 2024-07-23** and must **never** be a source for price-derived EGX fields. | ⚠️ live but do-not-source-prices |
| **Mubasher** (static CSV + scrape) | Fund NAV (primary) + some news | ✅ funds/news only |
| **Decypha** | Fund **metadata** enrichment (never NAV) | ⚠️ soft-fail; not load-bearing |
| **StockAnalysis.com** | — | ❌ deprecated (Cloudflare-blocked); only `backfill_egx_history_sa.py` remains as an on-demand repair tool |

**Market Pulse** (`frontend/public/assets/market-pulse.js`) was migrated off Yahoo to
TradingView in PR #84 — verified: it reads `last_price` + `/api/v1/tv/snapshot` + own candle
history, **zero** Yahoo references. The frozen-Yahoo 52W bug is fixed there.

## 4. Security posture (as of 2026-07-02)

- **The repo is PUBLIC** (`Bhidy/financehub-pro`). Older docs saying "set private" are wrong.
  Because it is public, **secret hygiene depends on rotation, not history** — assume anything
  ever committed is compromised.
- Secrets live in three stores that must stay in sync: **Hetzner `/opt/starta/.env`**
  (LLM keys, DB URL, SECRET_KEY, Stripe, email), **Vercel `finhub` env** (DB URL, Google OAuth,
  API URLs), and local `.env` (dev). `backend-deploy.yml` syncs only `SECRET_KEY` +
  `ADMIN_API_TOKEN` from GitHub secrets → server `.env`; **DB and LLM keys are set on the box
  directly** (rotating them requires server access).
- GitHub push-protection + secret-scanning are ON. GitHub Actions secrets present:
  `ADMIN_API_TOKEN`, `DATABASE_URL`, `NOTIFICATION_EMAIL`, `SMTP_PASSWORD`. **Not set:**
  `DISCORD_WEBHOOK_URL` (Discord alerts are dark), `WATCHDOG_DISPATCH_TOKEN` (auto-heal
  dispatch can't fire — `GITHUB_TOKEN` can't create `workflow_dispatch`).
- Admin surfaces (`/admin/users`, `/admin/analytics`) are enforced **server-side**
  (`require_admin` = JWT + fresh DB role check). Data-ops (`/refresh/*`, `/debug/*`) require the
  `X-Admin-Token` header (`require_admin_token`, fail-closed).

## 5. Legacy / dormant — DO NOT delete, DO NOT "modernize" blindly

These exist for a reason or are entangled with live code. Touching them has broken prod before.

- **Yahoo path** — `backend-core/app/api/v1/endpoints/yahoo.py` (wired in `router.py`),
  `ingestion/populate_yahoo_reservoir.py`, `data_pipeline/egypt_yahoo_loader.py`, `yahoo_cache`
  table, `data_sync.yml` (every 4h). **Live and scheduled** — it's the OHLC-history reservoir.
  Market Pulse no longer uses it, but other clients/history do. Never source EGX *prices* from it.
- **Saudi/KSA branches** in `admin.py` (`KSAFeedRouter`, `saudi_symbols`) and
  `egx_feed_router.py` — reachable from the live `refresh_all_prices` path but operate over zero
  rows in the EGX-only DB. Dead-weight, but entangled with the live EGX refresh — do not blind-delete.
- **`index.html` (root)** must stay byte-identical to `frontend/public/home.html`
  (`frontend/scripts/verify-route-aliases.mjs` fails CI on drift). Intentional.
- **Railway** env-detection guards in `main.py`/`session.py` are harmless legacy; keep them.
- **Root `scripts/*.sh` operational scripts** (`egx_daily_update.sh`, `run_scheduler.py`,
  `setup_hetzner.sh`, …) may be referenced by an OS crontab on the Hetzner box — confirm
  `crontab -l` on the server before deleting any of them.

## 6. Known gotchas / open items

- Single self-hosted runner is a SPOF; GitHub's scheduler drops ~2/3 of scheduled fires.
  Because the repo is **public**, GitHub-hosted runners are free/unlimited — monitors could be
  moved to `ubuntu-latest` to decouple monitoring from the box it watches.
- `egx_ingest_deadletter` accrues rows on data errors — triage periodically.
- Secret rotation for keys leaked while the repo was public is still owner-side (needs
  provider consoles + server `.env` access). See `docs/SECURITY.md`.
