# Starta Markets — Deployment
*Verified against the actual scripts/workflows, 2026-06.*

> ⚠️ **To actually deploy, follow [`DEPLOY_RUNBOOK.md`](./DEPLOY_RUNBOOK.md) and run the
> one-command scripts `scripts/deploy-web.sh` / `scripts/ship-ios.sh`.** That runbook is
> the procedure (and resolves the `finhub`-vs-stray-`frontend` project trap that has
> repeatedly broken deploys). This file is reference background. **Do not hand-run `vercel`.**

Two independently-deployed pieces: **frontend → Vercel**, **backend → Hetzner**. The DB (Supabase) is managed and not deployed.

---

## Frontend → Vercel (project `finhub`)

**Trigger:** push to `main` (Vercel GitHub integration builds automatically), or `vercel deploy --prod` from the **repo root**.

> **Root-directory rule:** Vercel's project Root Directory is `frontend`. **Never run `vercel` from inside `frontend/`** — it creates a stray project + `.vercel` link. Always run from the repo root.

### ✅ Just run the script — it deploys + aliases + verifies
```bash
./scripts/deploy-web.sh            # deploy current commit → alias domain → verify live
./scripts/deploy-web.sh verify     # only re-check the live site + API (no deploy)
```

> **Why the alias step matters:** a `git push` — or a deploy to the *wrong* project —
> does **not** reliably point `startamarkets.com` at the new build (the domain can stay
> stuck on an old deployment: the #1 "my changes aren't showing" cause). `deploy-web.sh`
> re-aliases `startamarkets.com` + `www` on every run, so this can't bite you. If you
> ever must do it by hand, run vercel **from the repo ROOT** (never from `frontend/` —
> that creates a stray project): `./frontend/node_modules/.bin/vercel --prod` then
> `./frontend/node_modules/.bin/vercel alias set <url> startamarkets.com`.

**Cache-busting:** when you change a static asset under `frontend/public/assets/`, bump its `?v=X.X.X` query in the referencing HTML, or the CDN serves the old file. (See `STARTAMARKETS_PUBLIC_SITE.md`.)

---

## Backend → Hetzner VPS (`root@46.224.223.172`, Docker + Caddy)

The live backend is a **Docker container** (FastAPI `app.main:app`, port `7860`) behind **Caddy** (SSL/reverse-proxy) on the Hetzner VPS. Frontend reaches it via `NEXT_PUBLIC_API_URL` (the `/api/:path*` rewrite) + same-origin Next.js routes.

**Deploy via the script (run from the repo root):**
```bash
./scripts/deploy_production.sh backend            # standard
./scripts/deploy_production.sh backend smart      # fast hot-swap (git reset + rolling restart)
./scripts/deploy_production.sh backend nuclear    # stop, prune, full rebuild (use when in doubt)
./scripts/deploy_production.sh all                # frontend + backend
```
It pushes code to GitHub, then SSHes to the VPS to rebuild/restart the container. Backend env lives at **`/opt/starta/.env`** on the server.

> **`deploy-backend.yml` (GitHub Action) is STALE — do not rely on it.** It targets **Railway** (`railway up`), filters on `backend/**` (the path is `backend-core/`, so it never fires), and `cd backend` (doesn't exist). Recommend deleting it to avoid confusion. The real backend host is Hetzner, deployed by the script above.

> The `scripts/*.exp` (expect) helpers automate the SSH steps but **hardcode the server password** — see `SECURITY.md`. Treat them as compromised until the password is rotated.

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
3. Frontend: push → **alias step** → verify `200`.
4. Backend: `./scripts/deploy_production.sh backend smart` → check `https://startamarkets.com/api/v1/market-summary` → `200`.
