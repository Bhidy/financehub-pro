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
5. Surgical `git add` only: never `git add -A` — the tree always has unrelated WIP
   (`calculators/`, `Dockerfile.coolify`, etc.).
