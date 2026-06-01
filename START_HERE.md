# START HERE — Read this before touching anything

> Single source of truth for what this repository is, where it deploys, and what is NOT part of it.
> If you are an AI agent or a new contributor, read this file first.

## What this is

This repository is **ONE product with three names**. They all refer to the same system:

| Label you will see | What it means |
| --- | --- |
| **Starta Markets** | The public brand |
| **`startamarkets.com`** | The public production domain |
| **FinanceHub Pro** | The internal / engineering name |
| **`finhub`** | The Vercel project name (`projectId prj_EYpG42djOp1vEYI5BTadOreRFWC0`) |

There is **no separate "finhub" product**. "finhub" is just the Vercel project that serves `startamarkets.com`. Do not look for a second finhub app — it does not exist.

It is a bilingual (Arabic/English) financial intelligence platform for the Egyptian market (EGX): real-time stock data, mutual fund NAV/performance, market news, an educational "Learn" academy, portfolios, and an AI chatbot.

## Canonical location

```
~/Documents/startamarkets        ← THIS repository (the only source of truth)
```

This folder was previously named `Info Site/mubasher-deep-extract`. The old name was misleading: "Mubasher" is only a *data source*, not the product. It was renamed and lifted out of the `Info Site` container during the June 2026 restructure.

## Production architecture

| Layer | Tech | Hosting |
| --- | --- | --- |
| Frontend | Next.js (App Router) + static public HTML | **Vercel** (project `finhub`) |
| Backend | FastAPI + Docker (`backend-core/`) | **Hetzner VPS** (`starta.46-224-223-172.sslip.io`) |
| Database | PostgreSQL | **Supabase** (managed) |
| Automation | GitHub Actions watchdog + APScheduler | Cloud-only |

**The public site (`/`, `/Funds`, `/Learn`, `/News`, `/Market-Pulse`) is mostly static HTML in `frontend/public/`, served via Next.js rewrites — NOT the React App Router screens under `frontend/app/`.** See `docs/STARTAMARKETS_PUBLIC_SITE.md` before editing any public page.

## How it deploys (do not improvise)

- **Frontend:** `git push origin main` triggers the Vercel production build. After deploy you MUST alias the new URL to `startamarkets.com` (see `docs/STARTAMARKETS_PUBLIC_SITE.md` → "MANDATORY POST-DEPLOY ALIAS STEP"). Deploy from the **repo root**, never from `frontend/`.
- **Backend:** git push; the Hetzner VPS rebuilds the Docker container.
- **Never** run automated extraction scripts locally — cloud-only (risk of IP bans / data conflicts).

## Authoritative deeper docs

- `docs/STARTAMARKETS_PUBLIC_SITE.md` — public site source tree, routing, theme/language, deployment + alias protocol.
- `docs/SYSTEM_ARCHITECTURE_ANALYSIS.md` — full architecture, DB schema, AI chatbot pipeline.
- `docs/DEPLOYMENT_REFERENCE.md` — deployment reference.

## What is NOT part of this repo (do not confuse)

During the June 2026 restructure, several things that used to sit beside this repo in the old `Info Site` folder were separated out:

- **`finhub-pro/` (QUARANTINED)** — an older, git-less, **divergent duplicate** of this same product. It was the #1 cause of wrong-file edits. It now lives in `~/Documents/_Info-Site-QUARANTINE/finhub-pro/`. **Do not edit it. Do not deploy it.** Its only unique content was a legacy `scraping/` and a legacy `startamarkets/` Next.js tree — preserved in quarantine if ever needed.
- **`stock-market-mcp-server/`, `antigravity-pulse/`** — genuinely independent tools, lifted out to their own folders under `~/Documents/`.
- Other unrelated apps (`mubasherfi`, `mubashermf`, `mubasher-capital-holding`, `zeedfunds`, etc.) live elsewhere under `~/Documents/` and were never part of this repo.

## Golden rules

1. This repo at `~/Documents/startamarkets` is the **only** source of truth for `startamarkets.com`.
2. Public-page changes go in `frontend/public/`, not React components.
3. Never commit/deploy the decoy in quarantine.
4. After any frontend deploy, run the Vercel alias step or the live domain silently serves stale content.

## Governance — rules to keep this clean (added after the 2026-06 cleanup)

- **One of everything.** One repo, one Vercel project (`finhub` → startamarkets.com), one domain. Never create extra Vercel projects or `vercel deploy` from copies — that's how 5 duplicate public clones of the site appeared. If `vercel project ls` ever shows a Starta clone, delete it.
- **Never run `vercel` from inside `frontend/`.** It auto-creates a stray project + `.vercel` link. Always run Vercel commands from the **repo root** (the project's Root Directory setting is `frontend`).
- **Never commit secrets.** No `.env`, API keys, tokens, passwords, `*.exp`, or key-bearing docs. `.gitignore` enforces this — do not override it. Secrets live only in Hetzner backend `.env`, Vercel env vars, and your local `.env` (all gitignored). If a secret ever lands in a commit, it is compromised: rotate it and purge history.
- **Keep the repo lean.** Ship only the app: `frontend/`, `backend-core/{app,scripts,data_pipeline}`, `docs/`, deploy configs, `index.html`. No scratch scripts, debug dumps, backups, `__pycache__`, archives, agent tooling (`.agent/`), or DB dumps.
- **Don't duplicate the folder to "try something."** Branch in git. Drifted folder copies were the root of the entire mess.
- **The AI chatbot lives in `backend-core/app/chat/`** and is protected — never bulk-edit or delete it. Backend deploys from `backend-core/{app,scripts,data_pipeline}` (see `Dockerfile`).
- Full audit + secret-rotation runbook: `~/Documents/STARTAMARKETS_AUDIT_2026-06.md`.
