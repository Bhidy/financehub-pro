# 🚀 Starta Markets — Deploy Runbook (READ THIS FIRST)

> **Any AI agent or human deploying Starta MUST read this file first.** It is the
> single source of truth. If another doc, a memory note, an old script comment,
> or your own instinct disagrees with this file, **this file wins.** Older notes
> that say "deploy from `frontend/`", "project is `frontend`", "run `vercel
> --prod`", or "alias the domain manually" are **WRONG** and caused real
> outages — see _Why this exists_ at the bottom.

There are **three surfaces**, deployed independently:

| Surface | What it is | How it deploys |
|---|---|---|
| **Web** | `startamarkets.com` (Next.js on Vercel, project `finhub`) | **Merge to `main`.** That's the whole deploy. |
| **iOS** | The Capacitor app (TestFlight) | `./scripts/ship-ios.sh` |
| **Backend** | FastAPI on Hetzner | `gh workflow run backend-deploy.yml` (fallback: `./scripts/deploy_backend_key.sh`) |

---

## ✅ WEB — there is exactly ONE way, and it is automatic

**Deploying the web = landing code on `main`. Nothing else. No script deploys it.**

```bash
# 1. Branch (never commit straight to main).
git checkout -b fix/my-change

# 2. Stage ONLY your files — never `git add -A` (the tree carries unrelated WIP).
git add <only-your-files>
git commit -m "fix: my change"           # author MUST be mohamedbhidy@gmail.com (see below)
git push -u origin fix/my-change

# 3. Open a PR. THE MERGE (step 4) IS THE DEPLOY.
gh pr create --base main --fill

# 4. WAIT FOR THE CODEX REVIEW BEFORE MERGING (~1-3 min). The repo has the
#    ChatGPT Codex reviewer app installed; it reviews every opened PR. Merging
#    before it finishes means its findings land AFTER the code is live (this
#    happened on PR#72 and PR#75 — both reviews found real bugs post-deploy).
#    Poll until the review appears, address findings (or justify), THEN merge:
#      gh pr view --json reviews   # wait for chatgpt-codex-connector[bot]
gh pr merge --squash --delete-branch

# 5. Confirm it went live (verify-only — does NOT deploy):
./scripts/deploy-web.sh
```

When the PR merges to `main`, **Vercel's Git Integration (project `finhub`) builds
the commit automatically and `startamarkets.com` + `www` auto-follow that build.**
There is no second step, no CLI deploy, no domain aliasing. Give it ~1–2 minutes,
then run `./scripts/deploy-web.sh` to prove the live pages **and** the live API
are healthy.

### Non-negotiable WEB rules
1. **The deploy trigger is a merge to `main`.** Period. Do **not** run `vercel`,
   `vercel --prod`, `vercel alias`, `vercel deploy`, or any script that does — by
   hand or in CI. There is no longer any script that deploys the web, on purpose.
2. **One Vercel project: `finhub`.** It owns `startamarkets.com`, is git-connected
   to `Bhidy/financehub-pro` with production branch `main`, and has the env vars.
   Never create a second project. Never run `vercel` inside `frontend/` (that is
   how the old stray `frontend` project — now deleted — was born). `.vercel` is
   gitignored; on a fresh clone, the one-time link is
   `cd <repo-root> && ./frontend/node_modules/.bin/vercel link` → choose **finhub**.
3. **Commit author email must be `mohamedbhidy@gmail.com`.** Vercel (Hobby) silently
   refuses to build commits whose author email is not account-linked, so the site
   would keep serving the old build. The `pre-push` hook
   (`core.hooksPath=scripts/git-hooks`) blocks the push if any commit on `main` has
   a different author. Fix: `git commit --amend --reset-author --no-edit`.
4. **Verify the LIVE site, not just "deployment Ready."** `./scripts/deploy-web.sh`
   checks `/`, `/mobile`, `/AiChat` = 200 **and** `/api/v1/market-summary` returns
   real data.
5. Changing a static asset in `frontend/public/assets/`? Bump its `?v=X.Y.Z` query
   in the HTML or the CDN serves the stale file.

### ⚡ Owner express-lane (fast path) — `./ship.sh "msg"`

The account owner is a repo **admin** and branch protection has `enforce_admins:false`,
so the owner may **push straight to `main`** — which triggers the same one-and-only
Vercel Git-Integration deploy. This is the fast path for solo owner changes:

```bash
./ship.sh "fix: my change"     # commits + pushes to main in ~2s. Fire-and-forget.
```

`ship.sh` commits with the local `git user.email` (which is `mohamedbhidy@gmail.com`
— **correct**, unlike a `gh pr merge --squash` commit, which GitHub authors with the
`…@users.noreply.github.com` email) and pushes to `main`. Vercel auto-deploys in
~1–2 min. **It runs NO `vercel` command** — it fully respects rule #1.

- **Prod-safe:** if the build fails, Vercel keeps serving the **last good deploy** —
  a bad push can never take the site down.
- **What it trades away vs the PR flow above:** the ChatGPT-Codex PR review and the
  CI checks (which mirror the Vercel build) run only on PRs — the express-lane skips
  them. Use the PR flow for risky/large changes; the express-lane for small, verified
  owner edits. Either way, the deploy mechanism is identical: **code on `main`.**
- **Never** substitute a `vercel deploy` here to "make it faster/live" — that is the
  forbidden race (see _Why this exists_). If a push isn't live, the answer is in the
  Vercel dashboard, not the CLI.

---

## ✅ iOS (TestFlight)

```bash
./scripts/ship-ios.sh         # build bundle → cap sync → bump build# → archive → upload
# on success it prints the bump-commit command; run it, then PR→merge it.
```

Auto-bumps the build number to `max(current+1, todayYYYYMMDD)` (TestFlight rejects
equal/lower). Uploads via the App Store Connect API key (no password, no Xcode GUI).
Apple "processes" the build ~5–15 min before it appears. The iOS app calls the
**prod** API directly (`https://startamarkets.com`) — baked into the bundle; no
backend change needed to ship the app.

---

## ✅ Backend (Hetzner)

**Primary path (works even when SSH is blocked): the "Backend Deploy" GitHub
Action.** SSH from the Mac to the VPS is blocked pre-auth at the network edge
(verified 2026-06), but the GitHub Actions runner lives ON the VPS itself — so
the workflow does the same git-sync + compose rebuild locally, no SSH at all.

```bash
gh workflow run backend-deploy.yml -f reason="why you are deploying"
gh run watch          # preflight → env provisioning → build → health gate
```

It provisions required env (SECRET_KEY, ADMIN_API_TOKEN) into `/opt/starta/.env`
before restarting, health-checks after, and **auto-rolls-back to the previous
commit if the health gate fails** (plus files a GitHub-issue alert).

Fallback when SSH works (e.g. from another network):

```bash
./scripts/deploy_backend_key.sh        # SSH-key deploy to root@…/opt/starta
```

`scripts/deploy_production.sh` is legacy; its **frontend** path has been removed
(it used to run `vercel --prod` and was part of the deploy mess).

---

## 🧯 If something looks wrong

| Symptom | Cause | Fix |
|---|---|---|
| "My changes aren't live" | The merge hasn't finished building, or a build errored | Wait ~2 min; check the finhub deployment list in the Vercel dashboard; re-run `./scripts/deploy-web.sh` to verify |
| Push rejected by pre-push hook | A commit author email ≠ `mohamedbhidy@gmail.com` | `git config user.email mohamedbhidy@gmail.com` then `git commit --amend --reset-author --no-edit` |
| `frontend/.vercel` exists | Someone ran `vercel` inside `frontend/` | `rm -rf frontend/.vercel` (canonical link is root/.vercel → finhub) |
| Live pages 200 but data missing | Backend/API issue | Check the Hetzner backend + `/api/v1/market-summary` |

**Never "fix" a web deploy by running `vercel --prod` or aliasing the domain.**
That re-introduces the exact race this runbook exists to prevent. If a merge built
but isn't live, the answer is in the Vercel dashboard (a failed build or a still-
building deployment), not a manual CLI deploy.

---

## Why this exists (root-caused 2026-06)

The web used to have **four** ways to deploy, layered up over time as each "fix"
added another path instead of removing one:

1. ✅ Vercel **Git Integration** (finhub ← `main`) — correct, automatic.
2. ❌ `deploy-web.sh` running `vercel --prod` + `vercel alias set` — a CLI deploy.
3. 💣 a dormant `frontend/.github/workflows/deploy-frontend.yml` — another CLI deploy.
4. 💣 `deploy_production.sh` running `npx vercel --prod` — a fossil from a dead project.

Paths #1 and #2 **both ran on every change**, producing two competing production
builds that raced for the domain; the manual `vercel alias set` transiently forced
the apex onto the CLI build, so the next git build "wasn't live" until you re-ran
the script — a self-perpetuating loop. That race was the root cause of every
"changes-not-live / wrong-url / pinned-domain / split-brain / deployed-the-wrong-
branch" incident.

**The fix was subtraction, not another script:** paths #2, #3, and #4 were
deleted. Web deploys now have a single source of truth — a merge to `main` — and
the domain auto-follows. `deploy-web.sh` was kept only as a **verify-only**
health-check. Do not re-add a manual deploy path.
