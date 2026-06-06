# Starta Markets — Production Deployment Reference

> **Any AI agent or human deploying this project must read [`DEPLOY_RUNBOOK.md`](./DEPLOY_RUNBOOK.md)
> first.** It is the single authoritative deploy procedure. This file provides background detail
> and a troubleshooting reference. The runbook supersedes any conflicting instructions here or
> in any older doc/memory note.

> For branded public pages (`/`, `/Funds`, `/Learn`, `/News`, `/Market-Pulse`, theme, language),
> also read [`STARTAMARKETS_PUBLIC_SITE.md`](./STARTAMARKETS_PUBLIC_SITE.md).

---

## Quick reference

| Surface | Command | Time |
|---------|---------|------|
| **Web (startamarkets.com)** | merge a PR to `main` (auto-deploys; domain auto-follows) | ~1–2 min |
| **Web — verify live** | `./scripts/deploy-web.sh` (verify-only, does NOT deploy) | 10 s |
| **iOS (TestFlight)** | `./scripts/ship-ios.sh` | ~6–10 min |
| **Backend (Hetzner)** | `./scripts/deploy_backend_key.sh` | ~3 min |

---

## Vercel project facts

| Setting | Value |
|---------|-------|
| **Project name** | `finhub` |
| **Project ID** | `prj_EYpG42djOp1vEYI5BTadOreRFWC0` |
| **Org ID** | `team_Gqpf3K97tjrOCyIlEnGjWCOE` |
| **Production domain** | `startamarkets.com` + `www.startamarkets.com` |
| **Root Directory (Vercel setting)** | `frontend` |
| **GitHub integration** | Auto-deploys `main`; `startamarkets.com` auto-follows production (the ONLY deploy path) |
| **Environment vars** | `DATABASE_URL`, `NEXT_PUBLIC_API_URL` (set in Vercel Dashboard) |

### Two-project history (important background)
A stray Vercel project named **`frontend`** existed alongside `finhub`. It was created by
accidentally running `vercel` inside the `frontend/` directory. It had no env vars and did
not own the domain — deploying to it caused every "changes aren't showing" incident.

**Status:** permanently deleted 2026-06-06 via Vercel API. Prevention:
- All `.vercel` directories are **gitignored**; the canonical link is `root/.vercel → finhub`
  (one-time `vercel link` on a fresh clone). Never run `vercel` inside `frontend/`.
- `deploy-web.sh` aborts if it detects a stray `frontend/.vercel` link.
- If `vercel project ls` ever shows an unexpected Starta project, delete it immediately.

---

## How the web deploy works (background)

Merging to `main` triggers the GitHub→Vercel integration which:
1. Builds `finhub` from the `frontend/` root directory.
2. `startamarkets.com` + `www` **auto-follow** the new production deployment.

That is the entire deploy. `./scripts/deploy-web.sh` does **not** deploy — it is a
verify-only health check (curl the live pages + API).

**Never hand-run `vercel --prod` or `vercel alias`.** A manual CLI deploy creates a
second production build that races the git build for the domain — the verified root
cause of the recurring "changes aren't showing" mess (removed 2026-06). Merging to
`main` is the only sanctioned path.

---

## iOS / TestFlight facts

| Setting | Value |
|---------|-------|
| App ID | `com.mubasher.startamarkets` |
| Signing | Automatic (Distribution cert, already provisioned) |
| API key | `~/.appstoreconnect/private_keys/AuthKey_53QD83W9UK.p8` |
| Key ID | `53QD83W9UK` |
| Issuer ID | `a3879256-fee1-4421-8369-9206ad76ee1c` |
| Upload plist | `frontend/ios/UploadOptions.plist` (`destination=upload`) |
| Build # scheme | `max(current+1, YYYYMMDD)` — always strictly increasing |
| Encryption | `ITSAppUsesNonExemptEncryption=false` → no compliance hold |

`./scripts/ship-ios.sh` handles all steps: `build:mobile` → `cap sync` → bump build# →
`xcodebuild archive` → `xcodebuild -exportArchive` (upload). Commit the build-number bump
**only after** a confirmed upload (the script prints the exact commit command).

---

## Backend facts

| Setting | Value |
|---------|-------|
| Host | Hetzner VPS `root@46.224.223.172` |
| SSH key | `~/.ssh/starta_deploy` (no password) |
| Deploy | `./scripts/deploy_backend_key.sh` (key-based) |
| (deprecated) | `./scripts/deploy_production.sh` now just redirects to the key script |
| Runtime | FastAPI in Docker, port 7860, behind Caddy |

> ✅ 2026-06: the `scripts/*.exp` password helpers were **deleted** and SSH **password
> authentication is disabled** on the server (key-only). Deploy via
> `./scripts/deploy_backend_key.sh`. The stale `deploy-backend.yml` Action was removed too.

---

## Vercel git-author guard

On the Hobby plan, Vercel only builds commits whose **author email** is linked to the
GitHub account (`mohamedbhidy@gmail.com` / `Bhidy`). A commit from an unlinked email is
blocked silently. The repo has a pre-push hook that prevents this:

```bash
git config core.hooksPath scripts/git-hooks   # run once per fresh clone
```

Pre-deploy checklist:
- [ ] `git config user.email` → `mohamedbhidy@gmail.com`
- [ ] `git status --short` — only intended files staged (never `git add -A`)
- [ ] `npm run verify:routes` passes (built into `deploy-web.sh`)
- [ ] `./scripts/deploy-web.sh` — deploys + aliases + verifies in one step

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Changes not live" | Domain pinned to old build, or wrong project | `./scripts/deploy-web.sh` (re-deploys + re-aliases) |
| Script aborts "STRAY link" | `frontend/.vercel` exists with wrong project | `rm -rf frontend/.vercel`, re-run |
| `vercel` asks to create new project | Root `.vercel` missing | `cd <repo-root> && ./frontend/node_modules/.bin/vercel link` → pick **finhub** |
| Live pages 200 but API returns nothing | Deployed a project without env vars | Run `./scripts/deploy-web.sh` to target `finhub` (has the env) |
| Vercel build BLOCKED | Commit author email not linked | Fix: `git config user.email "mohamedbhidy@gmail.com"` |
| TestFlight "build number already used" | Duplicate bump | `ship-ios.sh` auto-handles (`max(cur+1, today)`) |
| iOS archive fails | Xcode not found / cert expired | `xcode-select --print-path`; renew cert in Apple Developer portal |

---

## Document history

| Date | Change |
|------|--------|
| 2026-06-03 | Added Vercel git-author block fix |
| 2026-06-06 | **Full rewrite** — one-command scripts, stray project deleted, runbook as primary reference |
