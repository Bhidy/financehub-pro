# Starta Markets — Deployment
*Verified against the actual scripts/workflows, 2026-06.*

Two independently-deployed pieces: **frontend → Vercel**, **backend → Hetzner**. The DB (Supabase) is managed and not deployed.

---

## Frontend → Vercel (project `finhub`)

**Trigger:** push to `main` (Vercel GitHub integration builds automatically), or `vercel deploy --prod` from the **repo root**.

> **Root-directory rule:** Vercel's project Root Directory is `frontend`. **Never run `vercel` from inside `frontend/`** — it creates a stray project + `.vercel` link. Always run from the repo root.

### ⚠️ MANDATORY post-deploy step — alias the domain
A `git push` does **not** automatically point `startamarkets.com` at the new build (the custom domain can stay stuck on an old deployment — this is the #1 "my changes aren't showing" cause). After every deploy:

```bash
# 1. Get the newest deployment URL (from repo root)
./frontend/node_modules/.bin/vercel ls --yes | grep finhub | head -3

# 2. Point both domains at it
./frontend/node_modules/.bin/vercel alias set <new-deploy-url> startamarkets.com
./frontend/node_modules/.bin/vercel alias set <new-deploy-url> www.startamarkets.com
```

Verify: `curl -s -o /dev/null -w '%{http_code}' https://startamarkets.com/` → `200`.

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
