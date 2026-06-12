# Starta Markets — Agent Instructions

For any request involving `https://startamarkets.com`, its public pages, light/dark theme,
Arabic/English content, Learn, Funds, News, Market Pulse, mobile app, or **production deployment**:

## ⚠️ DEPLOY — READ THIS BEFORE ANY DEPLOY ACTION

**Use the scripts. Never hand-run `vercel` or `xcodebuild`.** The one-command scripts
encode the only correct, verified flow and prevent every past failure mode:

```bash
# Web (startamarkets.com):
./scripts/deploy-web.sh            # deploy → alias → verify live
./scripts/deploy-web.sh verify     # health-check only (no deploy)

# iOS (TestFlight):
./scripts/ship-ios.sh              # build bundle → archive → upload
```

Full rules and troubleshooting: **[`docs/DEPLOY_RUNBOOK.md`](docs/DEPLOY_RUNBOOK.md)** — this
is the authoritative deploy reference. Read it once, follow it always.

**Critical facts that have caused repeated incidents:**
- Vercel project is **`finhub`** (project ID `prj_EYpG42djOp1vEYI5BTadOreRFWC0`). It owns
  `startamarkets.com` and **auto-deploys + auto-aliases on every `main` push**.
- `frontend/.vercel/project.json` is committed and pins that dir to `finhub` too.
  Running `vercel` from **anywhere** in the repo now targets `finhub`. A stray project
  can never be created. **Never run `vercel` by hand** — the script is 5 seconds.
- After merging to `main` you can just run `./scripts/deploy-web.sh verify` to confirm.

## Code guidelines

1. Read [`docs/DEPLOY_RUNBOOK.md`](docs/DEPLOY_RUNBOOK.md) before any deploy action.
2. Read [`docs/STARTAMARKETS_PUBLIC_SITE.md`](docs/STARTAMARKETS_PUBLIC_SITE.md) before
   changing public pages, theme, or language.
3. Source for branded public URLs: `frontend/public/` + `frontend/next.config.ts`.
4. Do not edit `~/Documents/_Info-Site-QUARANTINE/` — it is a quarantined old copy.
5. Surgical `git add` only: never `git add -A` — the tree can carry unrelated WIP
   (scratch scripts, local experiments, etc.).

## 🤖 AI merge & operations discipline (added 2026-06-12 after a noisy-failure day)

Every AI session working in this repo MUST follow this process. It exists because
on 2026-06-12 several PRs were merged without waiting for CI, producing a chain of
red workflow runs and GitHub failure notifications for the owner.

### Merging
1. **Never merge a PR before CI Guard is green.** Use auto-merge so the merge
   waits for checks instead of you:
   ```bash
   gh pr merge <N> --squash --auto --delete-branch
   gh pr checks <N> --watch        # then confirm it actually merged
   ```
2. **Any change to write SQL** (harvester, reservoir, loaders, admin upserts) is
   gated by the `QA write-contract` CI job, which dry-runs the exact statements
   against the live schema. If you widen a SQL statement, update its probe args
   in `qa/egx_audit.py` in the SAME commit.
3. One PR = one concern. Do not bundle backend SQL changes with frontend edits
   you can't verify together.

### Dispatching workflows
4. The Hetzner runner is a SINGLE self-hosted runner — dispatched runs queue
   serially. Do not dispatch `backend-deploy.yml` and other heavy workflows
   simultaneously and assume parallelism.
5. After any dispatch, WATCH it to conclusion (`gh run watch <id> --exit-status`)
   and read the failure log before dispatching anything else. A failed run pages
   the owner — never leave one undiagnosed.
6. Data repairs: always run the repair workflow with `dry_run=true` first and
   read the before-counts; only then run live.

### Backend deploys
7. `gh workflow run backend-deploy.yml -f reason="..."` is the only backend
   deploy path (health-gated, auto-rollback). The git-sync step authenticates
   with the workflow token over HTTPS — do not switch /opt/starta back to an
   SSH remote.
8. If a deploy fails, fix root cause and close the auto-filed
   "Pipeline alert" issue with a one-line explanation so the owner's
   notifications resolve, not accumulate.

### Data-source invariants (June-2026 audit)
9. Yahoo EGX quotes froze 2024-07-23. NEVER source price-derived EGX fields
   from `yahoo_cache`. TradingView is primary; `ohlc_data` + `market_tickers`
   are the platform's own truth.
10. `ohlc_data` bar ownership: `source='tradingview'` bars are never overwritten
    by Yahoo/StockAnalysis writers. All writers normalize OHLC invariants and
    skip flat zero-volume bars — keep it that way.
