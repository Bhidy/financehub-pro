# Starta Markets — Never-Fail Data-Platform Reliability Plan

> **Purpose.** Make *silent staleness* — a feed, cron, certificate, or alert
> channel quietly dying while every dashboard stays green — structurally
> impossible to go undetected. This document is the single source of truth for
> **how we know the data platform is healthy, how we find out the instant it is
> not, and what a human must still do by hand.**
>
> **Status:** the three layers below are implemented in code in this repo
> (see _File map_). What remains is **owner setup** (UptimeRobot account, a PAT
> renewal calendar, pre-installing `jq`/`postgresql-client` on the runner host,
> and ensuring **GitHub mobile** push is on for Actions-failure notifications).
> Those are in
> _Residual risks_ at the bottom; nothing in this list can be automated away.
>
> **Cost target:** $0/month. GitHub Actions runs on a self-hosted Hetzner runner
> (no GitHub-hosted billing). Off-box redundancy runs on **Vercel (free)** +
> **UptimeRobot (free)**. Alerting is **Discord** (free) + **GitHub mobile push**
> (on the watchdog's red runs) + **UptimeRobot** (off-box, its own notification).

---

## 0. The failure this plan exists to kill

The platform had **green-on-broken** blind spots. Documented incidents:

- **Prices froze for hours** during the June-2026 market session while
  `production_watchdog.yml` stayed green — because it only checks
  *"is the API process up"* (`200 /health`), never *"is the DATA fresh"*.
- **A TLS certificate expired and went unnoticed for 53 days** — nothing watched
  expiry (the "hidden-expiry" class, H4).
- **Three scheduled workflows silently never ran** (0 runs) — a dead cron looks
  identical to a healthy one if nobody checks *that it actually fired*.
- The TV harvester **prices cycle silently failed 100%** (schema drift) while the
  job itself reported success.

Every one of these was *invisible* because the only signals were either
**on the same box that was failing** or **checking liveness instead of
freshness**. The fix is **defense-in-depth with INDEPENDENT layers**: at least
one detector for each failure must live somewhere the failure cannot reach.

---

## 1. The three-layer architecture

```
                         ┌──────────────────────────────────────────────────────┐
                         │                    SUPABASE (Postgres)                 │
                         │   market_tickers.last_updated   ohlc_data.date         │
                         │   egx_news.created_at   mutual_funds.updated_at  …     │
                         │   pipeline_heartbeat  ← written by L1 every run        │
                         └───────▲───────────────────────────────▲────────────────┘
                                 │ (1) writes data + heartbeat    │ (2) reads max(ts) DIRECTLY
                                 │                                │      ZERO Hetzner dependency
   ┌─────────────────────────────┴───────────┐      ┌────────────┴───────────────────────────┐
   │  L1 — ON-BOX  (Hetzner self-hosted)      │      │  L2 — OFF-BOX  (Vercel, free)           │
   │  runs-on: [self-hosted,linux,x64,hetzner]│      │  Next.js App Router API routes          │
   │                                          │      │                                         │
   │  scripts/pipeline_watchdog.py  (--heal)  │      │  GET /api/v1/health/freshness           │
   │   • per-dataset freshness vs SLA         │      │    → 200 ok | 503 + "DATA_STALE"        │
   │   • schedule-liveness (did cron fire?)   │      │  GET /api/v1/watchdog/status            │
   │   • runner-disk check                    │      │    → "alive":true|false (L1 heartbeat)  │
   │   • self-heal: dispatch corrective wf    │      │  GET /api/cron/cert-check  (Vercel cron)│
   │   • HONEST exit code (red on unhealed)    │      │    → TLS expiry / :443 reachability     │
   │  + *-freshness-monitor.yml (prices/funds)│      │                                         │
   │  + the data-update / harvest workflows   │      │  (queries Supabase Vercel→DB directly)  │
   └───────────────▲──────────────────────────┘      └───────────────▲─────────────────────────┘
                   │ L1 alerts                                        │ polled every ~5 min
                   │                                                  │
   ┌───────────────┴──────────────────────────────────────────────────┴─────────────────────────┐
   │  L3 — ALERTING (verified, with fallback)                                                     │
   │   • Discord  = PRIMARY. cert-check VERIFIES delivery (checks webhook HTTP status; 403 ≠ ok). │
   │   • UptimeRobot (free, external) polls L2 → catches a TOTAL Hetzner / GitHub outage that     │
   │     L1 structurally cannot report (because L1 lives on the box that died).                   │
   │   • GitHub mobile push (red runs) + UptimeRobot = a dead webhook/outage is never silent.      │
   └─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Why three layers, not one

| | Lives on | Detects | Blind to |
|---|---|---|---|
| **L1** on-box | the Hetzner runner | stale data, dead crons, runner disk; **auto-heals** | *its own box dying* (power/network/runner-process death) — it can't report what it can't run |
| **L2** off-box | Vercel + Supabase | the same staleness **plus** a total Hetzner/GitHub outage | a Vercel **+** Supabase **simultaneous** outage (different vendor, uncorrelated) |
| **L3** alerting | Discord + GitHub mobile + UptimeRobot | whether a human is actually *told* | only as good as the channels — hence **two** channels + **delivery verification** |

The cardinal rule: **no layer shares fate with what it watches.** L2 must never
call the Hetzner box; it asks Supabase directly. UptimeRobot must never run on a
GitHub-hosted runner; it is a separate vendor entirely.

### L1 — on-box (already in production; KEEP, do not weaken)

- **`scripts/pipeline_watchdog.py`** — the dead-man's-switch. Two independent
  checks every run: (1) **DATA FRESHNESS** — each dataset's newest row vs a
  trading-calendar-aware SLA (the `DATASETS` table); (2) **SCHEDULE LIVENESS**
  via `gh run list` — did each scheduled workflow actually fire in its window
  (catches "cron never ran"), and it treats a run stuck `queued`/`in_progress`
  past its window as **overdue** (the single-runner-down case), not "live".
  Plus a **runner-disk** check (warn 85 % / critical 92 %). With `--heal` it
  dispatches the corrective workflow (cooldown-guarded, 45 min) and posts to
  Discord. It writes `pipeline_heartbeat` so L2 can confirm L1 is alive
  ("who watches the watchman"). **Signal hygiene:** stale *data* keeps the run
  green (it alerted/healed); the run only goes **red** when a problem is left
  **unhealed** (no corrective, `--heal` off, dispatch failed, or a human-only
  issue like disk) — so red is always honest.
- **`.github/workflows/pipeline-watchdog.yml`** — runs the above every 30 min
  during the EGX session and every 2 h off-hours (smart cadence; saves
  ~350 Actions-min/month). Self-heal needs `actions:write`; uses
  `WATCHDOG_DISPATCH_TOKEN` (a free fine-grained PAT) if present, else
  `GITHUB_TOKEN`.
- **`.github/workflows/data-freshness-monitor.yml`** — every 15 min during the
  session, probes *real* price age + chart (`ohlc_data`) freshness through the
  public API and pages Discord on staleness while staying green itself.
- **`.github/workflows/{stocks,funds}-freshness-monitor.yml`**, the
  data-update / harvester / backup workflows — all on the Hetzner runner.

### L2 — off-box (the central new fix)

- **`frontend/app/api/v1/health/freshness/route.ts`** — *the centerpiece.* Runs
  on Vercel, queries Supabase **directly** (zero Hetzner dependency), computes
  real per-dataset freshness against the **same SLAs and EGX calendar** as
  `pipeline_watchdog.py` (ported verbatim so the two agree on "stale"), and
  returns machine-readable JSON **plus** an HTTP status a monitor can alert on:
  - `200` + `ok:true` — all **critical** datasets fresh.
  - `503` + body contains **`DATA_STALE`** — a critical dataset (prices, charts)
    is stale.
  - `500` + body contains **`CHECK_FAILED`** — the probe itself failed (DB
    unreachable), reported *distinctly* from stale data.
  Non-critical datasets (news, funds, technicals) still report per-dataset
  `stale` in the JSON but **do not** trip the 503, so a late funds NAV never
  flaps the pager. One bad table's query failure is contained (that dataset is
  marked stale; the others still report).
- **`frontend/app/api/v1/watchdog/status/route.ts`** — public read-only twin of
  L1's heartbeat. Returns `alive:true/false` (heartbeat age vs a 150-min
  threshold = the 120-min overnight cadence + buffer). Always HTTP 200 so a
  **keyword** monitor can alert on `"alive":false`. This is what catches
  *"GitHub Actions went dark / billing hit $0 / L1 stopped firing."*
- **`frontend/app/api/v1/watchdog/ping/route.ts`** — the **write-side** twin,
  invoked by a Vercel cron; if the heartbeat is stale it posts the Discord alert
  itself (so even without UptimeRobot, Vercel nudges once/day).
- **`frontend/app/api/cron/cert-check/route.ts`** — closes **H4 (hidden
  expiry)**. A real `tls.connect` (Node runtime, SNI) to the backend `:443`,
  reads the peer cert `valid_to`, alerts (Discord, **delivery-verified**) and
  returns 503 when < 14 days remain **or** when the handshake fails/times out
  (an unreachable `:443` is itself a signal). Runs as a daily Vercel cron.
- **`frontend/vercel.json`** — registers the two daily Vercel crons
  (`/api/v1/watchdog/ping`, `/api/cron/cert-check`). Vercel Hobby crons are
  **daily-only**, which is fine for the cert check; the **high-frequency** poll
  is UptimeRobot hitting `/api/v1/health/freshness`, **not** a Vercel cron.

### L3 — verified alerting with fallback

- **Discord = primary.** Used by L1 and all L2 routes. The cert-check route
  **verifies** delivery (checks the webhook's HTTP response; a 403/`!2xx` is
  treated as a failed send and logged), so a dead webhook is itself surfaced
  rather than silently swallowing alerts.
- **UptimeRobot (free, external) = the independent eyes.** Polls L2 every
  ~5 min. This is the only thing that fires during a **total Hetzner outage**
  (L1 is down with the box) **or** a **GitHub Actions billing/outage** (L1 can't
  run). Setup is **manual, owner-only** — see _Residual risks_.
- **Two independent backstops so a dead/403 Discord webhook never means silence —
  no app-email needed.** (1) **GitHub mobile push:** the watchdog exits with an
  **honest RED** code on any unhealed problem, so a real issue turns the run red and
  GitHub pushes the owner's phone even when Discord is dead. (2) **UptimeRobot**
  (off-box, its own email/SMS) covers the one case GitHub push cannot — when **no
  run happens at all** (runner down / Actions billing-capped). `scripts/notify.py`
  verifies the Discord HTTP status (so a dead webhook is *recorded*, e.g.
  `discord_alerted:false`) and keeps an **optional, dormant** SMTP path that fires
  only if a workflow exports `NOTIFICATION_EMAIL` + `SMTP_PASSWORD` — which, by owner
  choice, none do.

---

## 2. Failure-mode → detection → recovery matrix

Audit findings **C1–C2, H1–H4, M1–M4**. "TTD" = max time-to-detect. Every row
has at least one detector that does **not** share fate with the failure.

| # | Failure mode | Primary detector (layer) | TTD | Secondary / independent detector | Recovery |
|---|---|---|---|---|---|
| **C1** | **Self-hosted runner misses scheduled runs** (~85 % missed; queued jobs looked "live") | L1 schedule-liveness in `pipeline_watchdog.py` (`_workflow_overdue` now flags a run stuck `queued`/`in_progress` past its window as *runner-down*, not "live") | ≤ 30 min in session / ≤ 2 h off-hours | **L2** `/api/v1/watchdog/status` → `alive:false` when L1's own heartbeat stops; UptimeRobot pages | Restart the runner service on the Hetzner VPS; re-register if needed (see `docs` runner guide). Auto-heal re-dispatches the missed corrective workflow once the runner is back. |
| **C2** | **`sudo apt-get` breaks tooling** on a no-sudo runner (`db-backup.yml` pg_dump, `enterprise-data-update.yml` jq, `data-freshness-monitor.yml` jq) — used to fail/hang 100 % | L1: each workflow now has a **fail-LOUD guard** (`command -v <tool> … || { echo "::error::…"; exit 1; }`) → instant visible red instead of silent empty output | ≤ 1 run | The red run itself + Discord failure alert | **Human, root, one-time:** pre-install `jq` and `postgresql-client-16` on the runner host. No workflow may use `sudo`/`docker`. (Owner action — _Residual risks_.) |
| **H1** | **Single runner = SPOF** (one box runs every job) | L2 `/api/v1/health/freshness` (Vercel→Supabase) reports stale data even with the **entire** runner down; L2 `/watchdog/status` reports L1 silent | ≤ 5 min (UptimeRobot poll) | UptimeRobot (separate vendor) + cert-check (separate Vercel path) | Bring the runner back (above). **Structural mitigation:** add a 2nd self-hosted runner with the same labels (owner action). Until then, L2 guarantees the *outage is visible* even though throughput is not redundant. |
| **H2** | **Watchdog stays green on a real problem** (`pipeline_watchdog.py` never exited non-zero on unhealed issues) | L1: **HONEST exit code** — `unhealed` counts problems with no corrective / `--heal` off / dispatch failed / human-only (disk), and the run `sys.exit(...)` **red** at the end (after heartbeat, alert, and heal so none are skipped) | same run | GitHub Actions run status + Discord | Read the red run / Discord, act on the named dataset or workflow. A problem that *was* dispatched-for-heal stays green by design (the heal is the response). |
| **H3** | **Discord is the only alert channel** (a dead/403 webhook = total silence) | L3: cert-check **verifies** the webhook HTTP status and surfaces `discord_alerted:false` in JSON | per alert | the watchdog's **honest RED run → GitHub mobile push** (fires even if Discord is dead) + **UptimeRobot's** own email/SMS (off-box; catches the no-run-at-all case) | Fix/rotate the Discord webhook URL; confirm `discord_alerted:true` returns. UptimeRobot alerts independently meanwhile. |
| **H4** | **Hidden expiry** — TLS cert expired 53 days unnoticed | L2 `/api/cron/cert-check` (daily Vercel cron): alerts < 14 days **or** on a failed/timed-out `:443` handshake; returns 503 | ≤ 24 h | UptimeRobot can also monitor the cert-check route's 503 | Renew the backend TLS certificate (Hetzner). Put cert renewal on the owner's calendar (_Residual risks_). |
| **M1** | **Total GitHub Actions outage / billing → $0 cap hit** (all L1 monitoring dark) | L2 `/api/v1/watchdog/status` → `alive:false` (heartbeat stops advancing) | ≤ 5 min | `/api/v1/watchdog/ping` (Vercel cron) posts the "GitHub Actions may be down" Discord alert; UptimeRobot pages | Check **github.com/settings/billing** (spend cap, payment method) or GitHub status; resume Actions. L2 stays up the whole time because it is on Vercel. |
| **M2** | **Stale-data-but-job-green** (job ran, produced stale/no data — e.g. harvester schema drift, the 100 %-silent-fail class) | L1 freshness check (outcome-based, not "did the job run") | ≤ 30 min in session | **L2** `/api/v1/health/freshness` → 503 + `DATA_STALE`, polled by UptimeRobot | Auto-heal dispatches the corrective harvester cycle; if it can't self-heal, the named dataset in Discord/JSON tells the human exactly which writer to fix. |
| **M3** | **Off-site backup silently fails / produces an empty dump** | L1 `db-backup.yml`: `gzip -t` integrity test + a **< 100 KB → fail** size gate + core-table presence check; Discord on `failure()` | ≤ 1 week (weekly cron) | The uploaded artifact is versioned (30-day retention) so a missing/short artifact is visible in the Actions UI | Re-run `db-backup.yml`; verify `SUPABASE_DIRECT_URL` (session-mode `:5432`, **not** the pooled `:6543`) is set. |
| **M4** | **L1 itself dies, but nothing notices** ("who watches the watchman") | L1 inverse mode (`--check-watchdog`) + the **`pipeline_heartbeat`** row | ≤ 150 min | **L2** `/api/v1/watchdog/status` (`alive:false`) **and** `/api/v1/watchdog/ping`, both off-box on Vercel | Restart the runner / re-dispatch `pipeline-watchdog.yml`; L2 confirms recovery when `alive` flips back to true. |

**Severity → response time (target).**

- **Critical (prices/charts stale during the session, total outage):** page on
  Discord **and** UptimeRobot; human ack within minutes; auto-heal already
  in-flight.
- **High (cert < 14 days, a dead cron, runner disk ≥ 92 %, backup failed):**
  Discord page; human action same business day.
- **Medium/Low (a single non-critical dataset late, disk ≥ 85 %):** Discord
  amber; no 503; triage next session.

---

## 3. Operational runbook — how to read the signals

**Three independent dashboards; learn what each one *means*.**

### A. UptimeRobot (the off-box truth — check this FIRST in an incident)
Two monitors (owner sets these up — see _Residual risks_):

1. **Data-freshness monitor** → `https://startamarkets.com/api/v1/health/freshness`
   - **Keyword `DATA_STALE` present, or HTTP ≠ 200 → critical data is stale.**
     Open the JSON: the `stale` array and each dataset's `detail` name exactly
     what is stale and why (e.g. `prices: age 47m (SLA 25m, market open)`).
   - **HTTP 500 / keyword `CHECK_FAILED` → the probe couldn't reach Supabase.**
     This is *infrastructure*, not stale data — check Supabase status / the
     `DATABASE_URL` env on Vercel.
   - **Green → the live-trading core (prices + charts) is genuinely fresh,
     verified from off-box.** This is the strongest single "we're fine" signal.
2. **Watchdog-liveness monitor** → `https://startamarkets.com/api/v1/watchdog/status`
   - **Keyword `"alive":false` → L1 (the on-box watchdog) has gone silent.**
     Almost always means *the Hetzner runner is down* or *GitHub Actions is
     dark* (billing/outage). The on-box monitors are **not running** right now;
     trust only UptimeRobot + L2 until L1 is back.

> Mental model: **L2/UptimeRobot answers "is the DATA fresh and is L1 alive?"
> from outside the blast radius.** If UptimeRobot is green, the platform is fine
> even if a single GitHub run is red. If UptimeRobot is red, it is real.

### B. Discord (the human-facing pager)
- **`🟠 DATA PIPELINE — issues detected` (from L1):** one or more datasets/crons
  are stale/overdue. If it says **`(auto-heal triggered)`**, L1 already
  dispatched the fix — watch for recovery on the next cycle before intervening.
- **`🚨 PIPELINE WATCHDOG SILENT` (from L2 `/watchdog/ping`):** GitHub Actions
  may be down/billing-capped. Go to **github.com/settings/billing**.
- **`🚨 BACKEND TLS …` / `⚠️ … EXPIRING SOON` (from cert-check):** renew the
  backend certificate. `BACKEND TLS UNREACHABLE` additionally means `:443` is
  down — check the Hetzner host.
- **`🔴 DB BACKUP FAILED`:** no fresh off-site backup; re-run `db-backup.yml`.
- **`🔴 runner disk … full`:** free space on the VPS (human-only; not
  auto-healed by design).
- **If Discord goes quiet during a known-bad window**, do not assume health —
  check UptimeRobot and the cert-check JSON `discord_alerted` field; a `false`
  there means the **webhook** is broken (H3), not that all is well.

### C. GitHub Actions (the on-box detail + heal log)
- **`pipeline-watchdog.yml` red →** the watchdog left a problem **unhealed**
  (honest exit code). Open the log: it prints every dataset (`✅/🟠/🔴`), every
  workflow's liveness (`✅/⏰`), the disk line, and any `↻ heal` dispatches.
- **Any data-update / freshness-monitor red →** the **monitor itself** broke
  (API unreachable, missing `jq`/`pg_dump`), *not* merely stale data — stale
  data is designed to keep these green and page via Discord instead.
- **A workflow with literally 0 runs →** the dead-cron class; L1 schedule
  -liveness reports it as `NEVER RAN`.

### Daily / weekly human glance
- **Daily:** is UptimeRobot green? Did the morning Discord traffic look normal?
- **Weekly:** did `db-backup.yml` produce a fresh, ≥ 100 KB artifact? Any
  `runner disk` warnings trending up? Cert `days_remaining` still comfortable in
  the cert-check JSON?

---

## 4. File map (what implements each layer)

| Layer | File | Role |
|---|---|---|
| L1 | `scripts/pipeline_watchdog.py` | freshness + schedule-liveness + disk + self-heal + honest exit + heartbeat |
| L1 | `.github/workflows/pipeline-watchdog.yml` | runs the watchdog (smart cadence; `actions:write` for heal) |
| L1 | `.github/workflows/data-freshness-monitor.yml` | 15-min in-session price+chart freshness probe (fail-loud `jq` guard) |
| L1 | `.github/workflows/db-backup.yml` | weekly off-site `pg_dump` → verify → versioned artifact (fail-loud `pg_dump` guard) |
| L1 | `.github/workflows/enterprise-data-update.yml` | price/daily/funds/ingestion refresh (fail-loud `jq` guard) |
| L1 | `.github/workflows/{stocks,funds}-freshness-monitor.yml`, `symbol-data-quality.yml`, `tv-egx-harvester.yml`, `production_watchdog.yml` | per-dataset monitors + ingestion + API-liveness |
| L2 | `frontend/app/api/v1/health/freshness/route.ts` | **off-box** freshness (Vercel→Supabase); 200/503+`DATA_STALE`/500+`CHECK_FAILED` |
| L2 | `frontend/app/api/v1/watchdog/status/route.ts` | off-box read of L1 heartbeat → `alive:true/false` |
| L2 | `frontend/app/api/v1/watchdog/ping/route.ts` | Vercel-cron write-side; alerts if heartbeat stale |
| L2 | `frontend/app/api/cron/cert-check/route.ts` | daily TLS-expiry / `:443`-reachability check (H4) |
| L2 | `frontend/vercel.json` | registers the two **daily** Vercel crons |
| L3 | Discord webhook (`DISCORD_WEBHOOK_URL`) | primary channel; **delivery-verified** in cert-check |
| L3 | `scripts/notify.py` | **verified Discord** delivery (`send_alert` checks the webhook HTTP status; optional SMTP path is env-gated + dormant by choice) |
| L3 | **GitHub mobile push** | the owner's primary pager — fires on the watchdog's honest RED run (a dead Discord webhook still surfaces) |
| L3 | UptimeRobot (external, free) | 5-min poll of the L2 routes; independent notification |

**Ground-truth freshness SLAs** (single source = `pipeline_watchdog.py`
`DATASETS`; L2 mirrors these): prices `market_tickers.last_updated`
(`market_code='EGX'`) — **25 min** while the session is open; charts
`ohlc_data.date` — **≥ last completed EGX session**; technicals
`egx_technicals.updated_at` — **< 2 trading sessions**; news
`egx_news.created_at` — **7 days**; funds `mutual_funds.updated_at` —
**5 days**. **EGX calendar:** trades **Sun–Thu**, closed Fri/Sat, session
window kept wide **06:00–13:15 UTC**; intraday SLAs only apply while the market
is open, so weekends/holidays never false-trip.

---

## 5. Residual risks + owner actions (CANNOT be automated)

These require a human with credentials/root/calendar access. **None of them is
optional** — the layered design assumes they are done.

1. **Pre-install runner tooling (root, one-time, blocks C2 fixes).** On the
   Hetzner runner host, as root: install **`jq`** and **`postgresql-client-16`**
   (provides `pg_dump`). The fail-loud guards now make a missing tool an
   immediate visible red, but they **cannot install** it (no sudo on the runner
   user). Without this, `db-backup.yml` and two data workflows will (correctly,
   loudly) fail.
2. **Create the two UptimeRobot monitors (owner account, blocks L2 paging).**
   Free UptimeRobot account → two **Keyword** monitors, 5-min interval:
   - `https://startamarkets.com/api/v1/health/freshness` — alert when keyword
     **`DATA_STALE`** exists **or** status ≠ 200.
   - `https://startamarkets.com/api/v1/watchdog/status` — alert when keyword
     **`"alive":false`** exists.
   Add the owner's email/phone as the UptimeRobot alert contact. **This is the
   only detector for a total Hetzner/GitHub outage; the L2 code is inert until
   these monitors exist.**
3. **PAT renewal calendar (blocks silent self-heal death).** `WATCHDOG_DISPATCH_TOKEN`
   (fine-grained PAT, `actions:write`) expires. Put its expiry on a calendar and
   rotate it in the repo secrets before then. If it lapses, **detection +
   alerting still work**, but **auto-heal** stops (GitHub's recursion guard may
   block the default token from dispatching) — so problems would alert but not
   self-repair.
4. **TLS certificate renewal calendar (H4 belt-and-suspenders).** cert-check
   *warns* at 14 days, but a human must actually **renew** the backend cert on
   the Hetzner host. Put renewal on the calendar; treat the 14-day Discord alert
   as the backstop, not the plan.
5. **Turn on GitHub mobile notifications for Actions failures (the owner's chosen
   channel — replaces app-email).** In the GitHub mobile app → Settings →
   Notifications, ensure **workflow-run failures** push to the phone. That is what
   surfaces a dead/403 Discord webhook: the watchdog's honest RED exit on an unhealed
   problem turns the run red → GitHub pushes you. App-email is intentionally **off**
   (no SMTP secrets are exported to any workflow `env:`); `scripts/notify.py` keeps a
   dormant SMTP path you could enable later, but the owner uses GitHub push instead.
   UptimeRobot (#2) covers the only gap GitHub push cannot — when no run happens.
6. **Second self-hosted runner (mitigates H1 SPOF — optional but recommended).**
   Register a 2nd runner with the same labels
   (`[self-hosted, linux, x64, hetzner]`). Today a single-runner outage is
   *fully visible* via L2, but **throughput** is not redundant; a second runner
   removes the single point of failure for *execution*, not just detection.
7. **Maintain the EGX holiday list yearly.** `EGX_HOLIDAYS` appears in **both**
   `pipeline_watchdog.py` **and** `frontend/app/api/v1/health/freshness/route.ts`
   — update **both**, in lockstep, from the official EGX calendar each year. A
   missing holiday at worst causes one benign extra alert on a closed day
   (schedule-liveness, not data freshness, is the primary dead-cron catch).
8. **Keep L1 on the self-hosted runner.** Never switch any workflow to
   `ubuntu-latest`/GitHub-hosted runners — that bills on this private repo. The
   off-box redundancy belongs on **Vercel + UptimeRobot (free)**, never on a
   GitHub-hosted runner.

> **Bottom line.** With L1 + L2 + L3 in code and the eight owner actions above
> done, every documented silent-failure class has **at least one detector that
> does not share fate with the failure** — the on-box watchdog catches
> data/cron/disk problems and self-heals; the off-box Vercel routes + UptimeRobot
> catch a total box/Actions outage that the on-box layer structurally cannot;
> and verified Discord + GitHub mobile push (on red runs) + UptimeRobot's own notifications
> mean a single dead channel never equals silence.
