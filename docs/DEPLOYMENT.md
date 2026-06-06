# Starta Markets — Deployment
*Verified against the actual scripts/workflows, 2026-06.*

> ⚠️ **To actually deploy, follow [`DEPLOY_RUNBOOK.md`](./DEPLOY_RUNBOOK.md) and run the
> one-command scripts `scripts/deploy-web.sh` / `scripts/ship-ios.sh`.** That runbook is
> the procedure (and resolves the `finhub`-vs-stray-`frontend` project trap that has
> repeatedly broken deploys). This file is reference background. **Do not hand-run `vercel`.**

Two independently-deployed pieces: **frontend → Vercel**, **backend → Hetzner**. The DB (Supabase) is managed and not deployed.

---

## Frontend → Vercel (project `finhub`)

**Trigger:** **merge a PR to `main`.** That is the ONLY web deploy. Vercel's Git
Integration (project `finhub`, production branch `main`) builds the commit
automatically and `startamarkets.com` + `www` **auto-follow** it. There is no CLI
deploy and no alias step.

> **Root-directory rule:** Vercel's project Root Directory is `frontend`. **Never run
> `vercel` from inside `frontend/`** — it creates a stray project + `.vercel` link.
> The canonical link is `root/.vercel → finhub`.

### ✅ Deploy = merge to `main`; then verify
```bash
# (the deploy happens automatically the moment your PR merges to main)
./scripts/deploy-web.sh            # verify-only: checks live pages + API (does NOT deploy)
```

> **Do NOT hand-run `vercel --prod` or `vercel alias`.** They create a SECOND
> production build that races the automatic git build for the domain — the verified
> root cause of every "my changes aren't showing / pinned domain" incident (root-caused
> 2026-06). The domain is a project production domain that auto-follows `main`; if a
> merge built but isn't live, look in the Vercel dashboard (a failed or still-building
> deployment), never re-alias by hand. See `DEPLOY_RUNBOOK.md`.

**Cache-busting:** when you change a static asset under `frontend/public/assets/`, bump its `?v=X.X.X` query in the referencing HTML, or the CDN serves the old file. (See `STARTAMARKETS_PUBLIC_SITE.md`.)

---

## Backend → Hetzner VPS (`root@46.224.223.172`, Docker + Caddy)

The live backend is a **Docker container** (FastAPI `app.main:app`, port `7860`) behind **Caddy** (SSL/reverse-proxy) on the Hetzner VPS. Frontend reaches it via `NEXT_PUBLIC_API_URL` (the `/api/:path*` rewrite) + same-origin Next.js routes.

**Deploy via the key-based script (run from the repo root):**
```bash
./scripts/deploy_backend_key.sh        # SSH key auth (no password): git reset → rebuild → hot-swap
```
It SSHes (key `~/.ssh/starta_deploy`) to the VPS, pulls `main`, rebuilds the backend Docker layer, and hot-swaps the container. Backend env lives at **`/opt/starta/.env`** on the server. (`scripts/deploy_production.sh` is now a deprecated redirect to this script.)

> ✅ 2026-06: the `scripts/*.exp` password helpers were **deleted** and SSH **password authentication is disabled** on the server (key-only). The stale `deploy-backend.yml` GitHub Action was also removed. See `SECURITY.md`.

---

## Data refresh (cloud-only — never run extraction locally)

GitHub Actions drive all data ingestion (IP-ban/conflict risk if run locally):

| Workflow | Schedule | Purpose |
|---|---|---|
| `enterprise-data-update.yml` | `*/5 6-13 * * 0-4` | prices every 5 min during EGX market hours |
| `data_sync.yml` | every 4 h | OHLC / funds sync |
| `production_watchdog.yml` | every 6 h | health checks |
| `morning_brief.yml` | scheduled | newsletter / morning brief |

---

## Pre-deploy checklist
1. `cd frontend && npm run verify:routes && npm run build` (route guard + build).
2. `git status` — deploy only intended changes (this worktree often has unrelated WIP).
3. Frontend: branch → PR → **merge to `main`** → Vercel auto-builds + domain auto-follows → `./scripts/deploy-web.sh` verifies `200`.
4. Backend: `./scripts/deploy_backend_key.sh` → check `https://startamarkets.com/api/v1/market-summary` → `200`.
