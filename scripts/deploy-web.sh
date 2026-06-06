#!/usr/bin/env bash
# =============================================================================
# Starta Markets — WEB deploy verification.   (NOT a deployer. See below.)
#
#   ./scripts/deploy-web.sh            # verify the LIVE site (pages + API)
#   ./scripts/deploy-web.sh verify     # same thing (explicit)
#
# ─ HOW THE WEB DEPLOYS (the ONLY way) ────────────────────────────────────────
# There is ONE deploy path and it is fully automatic:
#
#     land code on `main`  →  Vercel Git Integration (project `finhub`)
#                             builds it  →  startamarkets.com auto-follows.
#
# That's it. No CLI deploy. No `vercel --prod`. No `vercel alias`. Nothing here
# pushes a build. This script only PROVES the live site is healthy afterwards.
#
# ─ WHY THIS SCRIPT NO LONGER DEPLOYS (root-caused 2026-06) ───────────────────
# It used to run `vercel --prod` + `vercel alias set`. That created a SECOND,
# competing production build for every change and transiently forced the domain
# onto it — racing the automatic git build. That race was the root cause of
# EVERY "my changes aren't live / wrong url / pinned domain / split-brain"
# incident. The fix was to DELETE the second path, not work around it. The git
# integration already deploys `main` and the apex already auto-follows it, so a
# manual deploy was always redundant — and harmful. It is gone for good.
#
# To ship: open a PR, merge it to `main`, then run this to confirm it went live.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FE="$ROOT/frontend"
APEX="startamarkets.com"

red(){ printf '\033[31m%s\033[0m\n' "$*"; }
grn(){ printf '\033[32m%s\033[0m\n' "$*"; }
ylw(){ printf '\033[33m%s\033[0m\n' "$*"; }
die(){ red "✗ $*"; exit 1; }

MODE="${1:-verify}"

# Guard kept on purpose: a stray frontend/.vercel link is how the duplicate
# "frontend" Vercel project was born. If it ever reappears, fail loudly.
[ ! -e "$FE/.vercel" ] || die "STRAY link at frontend/.vercel — delete it: rm -rf '$FE/.vercel'
   (the canonical link is root/.vercel → project 'finhub'; never run 'vercel' inside frontend/)."

if [ "$MODE" != "verify" ]; then
  ylw "Note: '$MODE' is ignored — this script does not deploy."
  ylw "      Deploy = merge to 'main' (Vercel builds it automatically). See docs/DEPLOY_RUNBOOK.md."
fi

echo "▶ Verifying https://$APEX (live pages + live API)…"
fail=0
for p in / /mobile /AiChat; do
  c=$(curl -s -m 20 -o /dev/null -w '%{http_code}' "https://$APEX$p" || echo 000)
  printf '   %-9s %s\n' "$p" "$c"; [ "$c" = 200 ] || fail=1
done
api=$(curl -s -m 25 "https://$APEX/api/v1/market-summary" || true)
if echo "$api" | grep -q '"market_code"'; then
  grn "   /api/v1/market-summary  OK (live data)"
else
  red "   /api/v1/market-summary  NO DATA"; fail=1
fi

[ "$fail" = 0 ] || die "LIVE verification FAILED — investigate (recent merge may still be building, or a build errored)."
grn "✅ Live and healthy: https://$APEX"
