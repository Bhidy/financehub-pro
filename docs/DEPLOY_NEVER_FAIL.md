# Deploy Runbook — Never-Fail Data-Platform Hardening

> **Read `docs/DEPLOY_RUNBOOK.md` FIRST** (it is the master deploy SSOT — web =
> merge to `main`, iOS = `./scripts/ship-ios.sh`, backend =
> `./scripts/deploy_backend_key.sh`). THIS file is the **one-time, ordered
> rollout** for the "never-fail" fix-set only. It does not replace the master
> runbook; it adds the steps unique to shipping this batch safely.

This fix-set closes the silent-failure classes the audit found (C1/C2/H1–H4) by
adding **defense-in-depth across three independent layers**:

| Layer | Lives on | What it catches | Files in this batch |
|---|---|---|---|
| **L1** on-box watchdog (KEEP) | Hetzner runner | per-dataset freshness SLAs, dead crons, self-heal | `scripts/pipeline_watchdog.py` (hardened), the `*-freshness-monitor` + `pipeline-watchdog` workflows |
| **L2** OFF-box freshness (NEW — the central fix) | **Vercel → Supabase** | a **total Hetzner outage** L1 structurally cannot report | `frontend/app/api/v1/health/freshness/route.ts` |
| **L3** verified alerting (NEW) | runner + Vercel | a **dead/403 Discord webhook** silently swallowing alerts | `scripts/notify.py` (verified Discord); backstop = **GitHub mobile push** on the watchdog's red run + **UptimeRobot** |
| **H4** hidden-expiry (NEW) | **Vercel cron** | a **TLS cert expiring unnoticed** (it once expired 53 days) | `frontend/app/api/cron/cert-check/route.ts` + `frontend/vercel.json` |

**Golden rule preserved:** every GitHub Actions job stays on
`runs-on: [self-hosted, linux, x64, hetzner]` (the owner never pays GitHub). The
off-box redundancy runs on **Vercel (free)** + **UptimeRobot (free)**, never on a
GitHub-hosted runner. No step here uses `sudo` or `docker`.

---

## ⚠️ Pre-flight: do these BEFORE you touch git (steps 1 is a hard blocker)

The three workflow fixes (C2) **replace** broken `sudo apt-get install …` steps
with a **fail-loud `command -v …` guard**. They no longer install anything — they
*assume the tool is already on the runner host* and turn the job **red** if it is
missing. So if `jq` / `pg_dump` are not pre-installed, those jobs go from
"silently broken" to "loudly broken" the moment they next run. **Install them
first (Step 1)** so the very first post-deploy run is green, not red.

---

## STEP 1 — Pre-install the CLI tools on the runner host (as root)

> **Why the Hetzner web console, not SSH:** the deploy SSH key
> (`~/.ssh/starta_deploy`) is currently **rejected** by the host, and in any case
> the runner user `github-runner` has **no passwordless sudo**. These packages
> must be installed by **root**. Use the **Hetzner Cloud Console → the VPS →
> "Console"** button (browser KVM) and log in as `root` there.

In the Hetzner root console, run **exactly**:

```bash
# As ROOT on the Hetzner runner host (Hetzner Cloud Console → Console).
apt-get update -y
apt-get install -y jq postgresql-client-16
```

> If your base image's APT repos don't carry `postgresql-client-16`, add the PGDG
> repo first (still as root), then re-run the install:
> ```bash
> # ROOT only — PGDG repo for postgresql-client-16 if the default repo lacks it.
> install -d /usr/share/postgresql-common/pgdg
> curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
>   -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
> echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
> https://apt.postgresql.org/pub/repos/apt $(. /etc/os-release && echo $VERSION_CODENAME)-pgdg main" \
>   > /etc/apt/sources.list.d/pgdg.list
> apt-get update -y && apt-get install -y postgresql-client-16
> ```

**Verify both tools are visible to the runner user** (the jobs run as
`github-runner`, so check on its `PATH`, not just root's):

```bash
# ROOT console — prove the runner user can see them.
sudo -u github-runner bash -lc 'command -v jq && jq --version'
sudo -u github-runner bash -lc 'command -v pg_dump && pg_dump --version'
```

Both must print a path and a version. `pg_dump --version` should report **16.x**
to match the Supabase server major and avoid a version-mismatch dump error.

If either prints nothing, the corresponding workflow (`enterprise-data-update`,
`data-freshness-monitor`, `db-backup`) will fail with a clear
`::error:: … missing on runner host` — that is by design; fix the install and
re-verify before moving on.

---

## STEP 2 — Confirm GitHub Actions secrets (no new secrets required)

This batch introduces **no new GitHub secret**. It relies on ones that already
exist. Confirm at **GitHub → repo → Settings → Secrets and variables → Actions**
that these are present (they already drive the current jobs):

- `DATABASE_URL` — watchdog freshness queries
- `DISCORD_WEBHOOK_URL` — L1/L3 primary alert channel
- `SUPABASE_DIRECT_URL` — **`db-backup.yml`** uses this (session-mode :5432 string);
  pg_dump cannot use the pooled `DATABASE_URL`
- `WATCHDOG_DISPATCH_TOKEN` — watchdog self-heal dispatch (fine-grained PAT,
  `actions:write`)
> **No email fallback is configured — by owner choice.** The owner already gets
> **GitHub mobile push**, which fires on the watchdog's **honest RED run** (an
> unhealed problem now exits non-zero). So a dead/403 Discord webhook is still
> surfaced (red run → GitHub push), and a *total* outage where no run happens at all
> is caught by **UptimeRobot** (Step 5, its own email/SMS). `scripts/notify.py` keeps
> an **optional, dormant** SMTP path — it emails ONLY if a workflow exports
> `NOTIFICATION_EMAIL` + `SMTP_PASSWORD` to its `env:`, which this batch deliberately
> does **not** do. **No email secrets to set.**

---

## STEP 3 — Commit ONLY the fix-set files to git (push to `main` is non-destructive)

> **Critical hygiene (this exact trap bit us before):** the working tree carries
> **unrelated WIP** — notably the untracked **`calculators/`** directory
> (Investment Calculator files). **Never `git add -A`.** Stage *only* the files
> below, or you will ship someone's half-finished work.

**The files in this batch (and nothing else):**

```bash
# From the repo root. Stage ONLY these — review `git status` after to confirm
# `calculators/` and any other WIP are NOT staged.
git checkout -b fix/never-fail-data-platform

git add \
  .github/workflows/db-backup.yml \
  .github/workflows/enterprise-data-update.yml \
  .github/workflows/data-freshness-monitor.yml \
  .github/workflows/production_watchdog.yml \
  .github/workflows/symbol-data-quality.yml \
  .github/workflows/pipeline-watchdog.yml \
  scripts/pipeline_watchdog.py \
  scripts/notify.py \
  frontend/app/api/v1/health/freshness/route.ts \
  frontend/app/api/cron/cert-check/route.ts \
  frontend/app/api/v1/watchdog/ping/route.ts \
  frontend/vercel.json \
  docs/NEVER_FAIL_PLAN.md \
  docs/DEPLOY_NEVER_FAIL.md

git status        # MUST show only the 14 paths above as staged; calculators/ stays untracked
```

> **New (untracked):** `scripts/notify.py`, the two new route files
> (`health/freshness/route.ts`, `cron/cert-check/route.ts`), and both `docs/*.md`.
> **Edits to already-tracked files:** `pipeline-watchdog.yml`, `pipeline_watchdog.py`,
> the `watchdog/ping/route.ts` (H3), and the four other workflows. Double-check **all
> 14** appear under "Changes to be committed" — or the watchdog's L3 import fails on
> the runner, the L2/cert routes 404 on Vercel, and the `pipeline-watchdog.yml`
> env-var + comment fixes never ship.

**What pushing `main` triggers — nothing destructive:**

- **Workflows:** merging these `.github/workflows/*.yml` edits does **not** run any
  of them immediately on push. They are `schedule` / `workflow_dispatch` jobs
  (plus `symbol-data-quality.yml`, which already had `push: branches:[main]` — its
  only change is an **added Saturday cron line**; the push trigger and weekday
  schedule are byte-for-byte unchanged, so the push merely runs the *existing*
  data-quality gate it always ran on a `main` push). No new
  destructive behavior. The C2 edits only swap a broken install step for a guard.
- **`scripts/*`:** plain Python files; merging them runs nothing. They execute only
  when `pipeline-watchdog.yml` next fires on its cadence.
- **Frontend (`route.ts`, `vercel.json`):** the merge to `main` is what deploys the
  web (see Step 4).

```bash
git commit -m "ops: never-fail data-platform hardening (L2 off-box freshness, L3 verified alerts, cert cron, C2 runner guards)"
# Author email MUST be mohamedbhidy@gmail.com or Vercel will refuse the build and
# the pre-push hook will block the push. Fix with:
#   git commit --amend --reset-author --no-edit
git push -u origin fix/never-fail-data-platform
gh pr create --base main --fill
gh pr merge --squash --delete-branch          # THE MERGE IS THE WEB DEPLOY
```

---

## STEP 4 — Web deploy (the new Vercel routes + the cert cron)

There is **exactly one** way to deploy the web, and Step 3's merge already did it:
**Vercel's Git Integration (project `finhub`) auto-builds the `main` commit and
`startamarkets.com` auto-follows.** Do **NOT** run `vercel`, `vercel --prod`, or
`vercel alias` — that re-introduces the split-brain race documented in
`docs/DEPLOY_RUNBOOK.md`.

This merge ships four web changes:

1. `GET /api/v1/health/freshness` — the **L2 off-box** route (Vercel → Supabase).
2. `GET /api/cron/cert-check` — the **TLS-expiry** check.
3. `frontend/vercel.json` — adds the `/api/cron/cert-check` entry to `crons`
   (daily `0 6 * * *`). Vercel Hobby crons are **daily-only**, which is fine for a
   cert check. (The existing `/api/v1/watchdog/ping` daily cron is unchanged.)
4. `GET /api/v1/watchdog/ping` — **H3 hardening** (no cron change): `postDiscord`
   now returns a boolean, checks the webhook HTTP status, logs a non-2xx, and the
   route surfaces `discord_alerted` in its JSON, so a dead/403 webhook can no longer
   swallow the "watchdog silent" alert unnoticed.

> **Vercel reads `crons` from `frontend/vercel.json` on the production build.** The
> new cert-check cron only registers once this build is promoted to production. No
> manual cron setup in the Vercel dashboard is needed — it is declared in the file.

Give it ~1–2 minutes, then **verify the live site** (verify-only — does **not**
deploy):

```bash
./scripts/deploy-web.sh
```

`DATABASE_URL` and `DISCORD_WEBHOOK_URL` already exist on the Vercel `finhub`
project, so both new routes have what they need. **No Vercel env change is
required** for this batch. (Optional: set `CRON_SECRET` on Vercel to reject
non-Vercel callers of `/api/cron/cert-check` and `/api/v1/watchdog/ping`; both
routes already honor it when present and skip the check when it is absent.)

---

## STEP 5 — Set up the external uptime monitor for the L2 route (HUMAN — required)

This is the layer that catches a **total Hetzner outage** L1 cannot. The high
-frequency poll is **UptimeRobot hitting the route**, not a Vercel cron. **You must
do this by hand** — it cannot be scripted from the repo.

1. Sign in to **https://uptimerobot.com** (free tier).
2. **+ New monitor** → **Monitor Type: `Keyword`** (keyword monitors can alert on
   either the status code **or** a keyword — belt-and-suspenders).
3. **URL (or IP):** `https://startamarkets.com/api/v1/health/freshness`
4. **Keyword type: `exists`** · **Keyword value: `DATA_STALE`**
   - The route returns **HTTP 200** with no `DATA_STALE` when the **critical**
     feeds (prices, charts) are fresh, and **HTTP 503** with `"DATA_STALE"` in the
     body when a critical feed is stale. So "keyword *exists*" fires exactly when a
     critical feed is stale. (Non-critical feeds — news/funds/technicals — report
     `stale` per-dataset in the JSON but never trip the monitor, so a late funds
     NAV won't page you.)
5. **Monitoring interval: `5 minutes`.**
6. **Assigned alert contacts:** your email (and optionally a second channel). Add
   the contact under **My Settings → Alert Contacts** first if needed.
7. Save. Open the route once in a browser to confirm it currently returns
   `{"ok":true,...}` / 200 (outside market hours the intraday SLA is relaxed, so it
   should be 200/healthy).

> **Recommended second UptimeRobot monitor (watch-the-watchman):** also add a
> Keyword monitor on `https://startamarkets.com/api/v1/watchdog/status` with
> keyword **`"alive":true`**, **keyword type `not exists`** (alert when the
> liveness keyword is MISSING), interval 5 min. That catches the on-box watchdog
> (L1) going silent — e.g. GitHub Actions billing/outage — independently of L2.

---

## STEP 6 — Post-deploy verification (run AFTER Steps 1–5)

Order matters: tools first (Step 1) → merged (Step 3/4) → then dispatch the changed
workflows so their **first** run is green.

### 6a. The two new Vercel routes return JSON + the right status

```bash
# L2 freshness — expect HTTP 200 + {"ok":true,...} when critical feeds are fresh.
# (During a closed session this should be healthy; intraday SLA only bites when open.)
curl -s -o /dev/null -w '%{http_code}\n' https://startamarkets.com/api/v1/health/freshness
curl -s https://startamarkets.com/api/v1/health/freshness | jq '{ok, stale, datasets: (.datasets|keys)}'

# Cert check — expect HTTP 200 + {"ok":true,"status":"ok","days_remaining":N}. A
# low days_remaining (<14) returns 503 and fires a Discord alert by design.
curl -s -o /dev/null -w '%{http_code}\n' https://startamarkets.com/api/cron/cert-check
curl -s https://startamarkets.com/api/cron/cert-check | jq '{ok, status, days_remaining, valid_to, discord_alerted}'
```

A `200` + `"ok":true` from each proves Vercel→Supabase and Vercel→backend-:443
both work with zero Hetzner dependency. A `500` + `CHECK_FAILED` on the freshness
route means the DB is unreachable from Vercel (check `DATABASE_URL` on `finhub`).

### 6b. Dispatch each CHANGED workflow once and confirm it is GREEN

Run each manually (they all have `workflow_dispatch`) so the C2 guard is exercised
*now*, not at 3am. Each must finish **green** — a red run means `jq`/`pg_dump` is
still missing (go back to Step 1):

```bash
gh workflow run data-freshness-monitor.yml
gh workflow run enterprise-data-update.yml
gh workflow run db-backup.yml          # exercises the pg_dump guard + a real off-site dump
gh workflow run symbol-data-quality.yml
gh workflow run pipeline-watchdog.yml  # exercises the hardened watchdog (L1) + notify.py (L3)

# Watch them:
gh run list --limit 8
gh run watch                           # pick the run, confirm conclusion=success
```

> `production_watchdog.yml`'s only change is a **comment** (a doc note pointing to
> the L2 route); nothing to dispatch, but a manual run still passes.
> `db-backup.yml` is the one to watch most closely — it both exercises the
> `command -v pg_dump` guard **and** produces a real verified off-site artifact;
> confirm the run uploaded a `financehub-<stamp>.sql.gz` artifact > 100KB.

### 6c. Confirm the alert path (verified Discord + the GitHub-mobile backstop) — L3

`scripts/notify.py` verifies Discord delivery (checks the webhook's HTTP status).
Exercise it from the Hetzner root console (or any shell with `DISCORD_WEBHOOK_URL`
exported):

```bash
python3 /opt/starta/scripts/notify.py "Never-Fail deploy test" "If you see this in Discord, L3 alerting works."
# Prints e.g. {"discord":"ok","email":"not_attempted","delivered":true}.
# "discord":"http 403" / "error"  =>  the webhook is dead — rotate DISCORD_WEBHOOK_URL.
```

**The backstop (no email):** when Discord is dead/403, the watchdog's **honest RED
exit** turns the run red → your **GitHub mobile push** fires; and if the runner /
GitHub Actions is fully down (no run at all), **UptimeRobot** (Step 5) pages you
off-box. So a dead webhook is never silent — email is not needed. Verify the push
path once: confirm GitHub mobile notifications for **Actions workflow failures** are
enabled (GitHub app → Settings → Notifications).

> You do not normally invoke `notify.py` directly in production — the hardened
> `pipeline_watchdog.py` calls `send_alert(...)` automatically (verified Discord),
> and the Vercel cert-check route checks its own Discord POST status code. The CLI
> above is just the one-shot proof that the Discord path is wired; the GitHub-mobile
> push + UptimeRobot backstops cover a dead webhook, with no app-email involved.

---

## STEP 7 — Calendar the things that EXPIRE (HUMAN — required, do not skip)

These have no auto-renewal and were the root of the "53-day silent cert" class.
Put them on a real calendar:

- **`WATCHDOG_DISPATCH_TOKEN` (GitHub fine-grained PAT) renewal.** Fine-grained PATs
  expire (max 1 year). If it lapses, the watchdog can still detect + alert but
  **cannot self-heal** (dispatch is denied). Set a calendar reminder ~2 weeks
  before its expiry to regenerate it (scope: `actions:write` on the repo) and
  update the secret.
- **Backend TLS cert.** The new `cert-check` cron now warns **14 days** out via
  Discord, but keep a backstop reminder for the renewal procedure on
  `starta.46-224-223-172.sslip.io`.
- **EGX holiday lists (yearly).** Both `scripts/pipeline_watchdog.py` (`EGX_HOLIDAYS`)
  and `frontend/app/api/v1/health/freshness/route.ts` (`EGX_HOLIDAYS`) carry a 2026
  list that must be kept **in lockstep** and refreshed each year — a missing
  holiday at worst causes one benign extra alert on a closed day.
- **Email is OFF by choice — nothing to maintain here.** App-email is not wired into
  any workflow (the owner uses GitHub mobile push). `notify.py` keeps an optional,
  dormant SMTP path; only if you ever enable it would a Gmail App Password need
  maintaining. Until then there is no `SMTP_PASSWORD`/email dependency to renew.

---

## Rollback (if anything misbehaves)

- **A changed workflow goes red on the guard** → it means the tool truly is missing
  on the runner. That is the guard working. Fix Step 1 (install `jq`/`pg_dump` as
  root), re-verify, re-dispatch. Do **not** revert the guard back to `sudo apt-get`
  — that step never worked (no sudo) and only *looked* green by failing silently
  elsewhere.
- **The L2/cert route 404s** → the new `route.ts` files were not staged/merged. Re
  -check Step 3 (`scripts/notify.py` and both `route.ts` were untracked and easy to
  miss), re-commit, re-merge.
- **Full web revert** → revert the squash-merge commit on `main`
  (`git revert <sha>` → PR → merge). The web auto-follows `main`, so the prior
  build returns within ~1–2 min. The workflow/script files are inert until their
  schedule fires, so reverting them is low-risk and immediate.

---

## What this batch deliberately does NOT change

- **No GitHub-hosted runners.** Every job stays on
  `runs-on: [self-hosted, linux, x64, hetzner]`. The off-box redundancy is on
  Vercel + UptimeRobot (both free).
- **No `sudo` / `docker` in any workflow step.** The C2 fix removes the only
  `sudo apt-get` calls and replaces them with non-privileged `command -v` guards.
- **No backend (Hetzner FastAPI) redeploy required.** Nothing in this batch touches
  the backend app code; `cert-check` only *reads* the backend's TLS cert from the
  outside. (If you separately need to deploy the backend, that is the unrelated
  `./scripts/deploy_backend_key.sh` path in the master runbook.)
- **L1 is untouched in behavior except hardening** — the watchdog still alerts +
  self-heals; the only changes are an honest non-zero exit on **unhealed** problems,
  treating a long-`queued`/`in_progress` run as "runner down" (not "live"), and the
  L3 verified-delivery alert path.
