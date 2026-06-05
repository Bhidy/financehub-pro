# 🚀 Starta Markets — Deploy Runbook (READ THIS FIRST)

> **Any AI agent or human deploying Starta MUST read this file before running a
> single deploy command.** It is the single source of truth. If another doc, a
> memory note, or your own instinct disagrees with this file, **this file wins.**
> Older notes that say "deploy from `frontend/`" or "project is `frontend`" are
> WRONG and caused real outages — see _Why this exists_ at the bottom.

There are **two surfaces**, deployed independently. Use the scripts. Don't improvise.

| Surface | What it is | Command | Time |
|---|---|---|---|
| **Web** | `startamarkets.com` (Next.js on Vercel) | `./scripts/deploy-web.sh` | ~2 min |
| **iOS** | The Capacitor app (TestFlight) | `./scripts/ship-ios.sh` | ~6–10 min |
| Backend | FastAPI on Hetzner (separate) | `./scripts/deploy_production.sh backend smart` | — |

---

## ✅ The ONLY correct way to deploy WEB

```bash
# 1. Land your code on main the normal way (review + history):
git add <only-your-files>            # surgical — NEVER `git add -A` (tree has unrelated WIP)
git commit -m "…"
git push -u origin <branch>
gh pr create --base main --fill && gh pr merge --merge

# 2. Ship it (from anywhere in the repo). One command. Deploys + aliases + verifies:
./scripts/deploy-web.sh
```

That's it. The script targets the **`finhub`** Vercel project from the repo **root**,
deploys, points `startamarkets.com` + `www` at the new build, and curl-verifies the
live pages **and** the live API before declaring success. Re-running is safe.

> **Even lazier (valid):** merging to `main` alone auto-deploys `finhub`, which
> **owns the domain and auto-aliases it**. But still run `./scripts/deploy-web.sh verify`
> afterwards to confirm — occasionally a build gets "pinned" and the domain needs the
> nudge the script gives.

### Non-negotiable WEB rules
1. **Project is `finhub`.** It owns `startamarkets.com` and auto-deploys `main`.
2. **Always run Vercel from the repo ROOT** (root `.vercel` → `finhub`).
   **NEVER run `vercel` inside `frontend/`** — it creates a *stray `frontend`
   project*, deploys there, and splits the domain. The script enforces this and
   aborts if it finds `frontend/.vercel`. If you see that file: `rm -rf frontend/.vercel`.
3. `.vercel` is **gitignored**, so a fresh clone has no link. One-time setup:
   `cd <repo-root> && ./frontend/node_modules/.bin/vercel link` → choose **finhub**.
4. **Verify the LIVE site, not just "deployment Ready."** The script checks
   `/`, `/mobile`, `/AiChat` = 200 **and** `/api/v1/market-summary` returns real data.
5. Changing a static asset in `frontend/public/assets/`? Bump its `?v=X.Y.Z` query in
   the HTML or the CDN serves the stale file.

---

## ✅ The ONLY correct way to ship iOS (TestFlight)

```bash
./scripts/ship-ios.sh         # build bundle → cap sync → bump → archive → upload
# on success it prints the bump-commit command; run it, then PR→merge it.
```

The script auto-bumps the build number to `max(current+1, todayYYYYMMDD)` so it is
**always** strictly increasing (TestFlight rejects equal/lower). It uploads via the
App Store Connect API key (no password, no Xcode GUI). After it succeeds, Apple
"processes" the build for ~5–15 min before it appears in TestFlight.

### Non-negotiable iOS rules
1. The iOS project lives under **`frontend/ios/`** (paths are `frontend`-relative).
2. The app calls the **prod** API directly (`https://startamarkets.com`); the bundle
   build bakes that in. No backend change needed to ship the app.
3. Commit the build-number bump **only after** the upload succeeds (the script
   prints the exact command), so the repo never claims a build that didn't ship.

---

## 🧯 If something looks wrong

| Symptom | Cause | Fix |
|---|---|---|
| "My changes aren't live" | Domain pinned to an old build, or you deployed the stray `frontend` project | `./scripts/deploy-web.sh` (re-deploys finhub + re-aliases) |
| Script aborts: "STRAY link at frontend/.vercel" | A `vercel` command was run inside `frontend/` | `rm -rf frontend/.vercel`, then re-run |
| `vercel link`/deploy asks to create a project | No root `.vercel` link | Link to the **existing `finhub`** project, never create a new one |
| Live pages 200 but data missing | Deployed a project without env vars | Deploy `finhub` (it has `DATABASE_URL`, `NEXT_PUBLIC_API_URL`); re-run the script |
| TestFlight "build number already used" | Bump wasn't strictly increasing | `ship-ios.sh` handles this automatically — just re-run |

---

## Why this exists (the recurring mess, root-caused 2026-06)

The org has **two** Vercel projects: **`finhub`** (canonical — owns the domain,
auto-deploys `main`, has the env vars) and a **stray `frontend`** project created by
running `vercel` from inside `frontend/`. Past memory notes said to "deploy from
`frontend/` and manually alias" — that deploys to the **stray** project, which does
**not** own the domain, so the site appeared to need a fragile manual alias every time
and would silently drift (split-brain). Deploying **`finhub` from the root** makes the
domain follow automatically. These two scripts encode the correct path so nobody has
to rediscover it. **Use them.**
