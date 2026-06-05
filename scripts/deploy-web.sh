#!/usr/bin/env bash
# =============================================================================
# Starta Markets — WEB deploy (Vercel).  ONE command, foolproof, idempotent.
#
#   ./scripts/deploy-web.sh            # deploy current commit + alias + verify
#   ./scripts/deploy-web.sh verify     # only verify the live site (no deploy)
#
# Run it from ANYWHERE inside the repo. After your PR is merged to `main`,
# `finhub` already auto-deploys — but running this guarantees the domain
# points at a known-good build and proves it live. Safe to re-run.
#
# WHY THIS EXISTS (read once): this org has TWO Vercel projects —
#   • finhub   = CANONICAL. Owns startamarkets.com, auto-deploys `main`.   ✅
#   • frontend = STRAY. Created by accidentally running `vercel` inside
#                frontend/. Deploying to it + manual aliasing is the cause
#                of every "my changes aren't live / split-brain" incident. ❌
# This script ALWAYS targets finhub from the repo ROOT (root/.vercel) and
# refuses to run if a stray frontend/.vercel link exists. Never run `vercel`
# by hand — use this script.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FE="$ROOT/frontend"
VERCEL="$FE/node_modules/.bin/vercel"
APEX="startamarkets.com"
WWW="www.startamarkets.com"
MODE="${1:-deploy}"

red(){ printf '\033[31m%s\033[0m\n' "$*"; }
grn(){ printf '\033[32m%s\033[0m\n' "$*"; }
ylw(){ printf '\033[33m%s\033[0m\n' "$*"; }
die(){ red "✗ $*"; exit 1; }

verify_live() {
  local fail=0 c api
  echo "▶ Verifying https://$APEX (pages + live API)…"
  for p in / /mobile /AiChat; do
    c=$(curl -s -m 20 -o /dev/null -w '%{http_code}' "https://$APEX$p" || echo 000)
    printf '   %-9s %s\n' "$p" "$c"; [ "$c" = 200 ] || fail=1
  done
  api=$(curl -s -m 25 "https://$APEX/api/v1/market-summary" || true)
  if echo "$api" | grep -q '"market_code"'; then grn "   /api/v1/market-summary  OK (live data)"; else red "   /api/v1/market-summary  NO DATA"; fail=1; fi
  [ "$fail" = 0 ] || die "LIVE verification FAILED — do not declare done; investigate."
  grn "✅ Live and healthy: https://$APEX"
}

# --- preflight ---------------------------------------------------------------
[ -x "$VERCEL" ] || die "vercel CLI missing at $VERCEL — run 'npm install' in frontend/."
if [ "$MODE" = "verify" ]; then verify_live; exit 0; fi

[ -f "$ROOT/.vercel/project.json" ] || die "Repo ROOT is not linked to Vercel.
   One-time fix:  cd '$ROOT' && '$VERCEL' link   →  choose the existing 'finhub' project."
PROJ="$(grep -o '"projectName":"[^"]*"' "$ROOT/.vercel/project.json" | cut -d'"' -f4 || true)"
[ "$PROJ" = "finhub" ] || die "Root .vercel is linked to '$PROJ' (expected 'finhub').
   Fix:  rm -rf '$ROOT/.vercel' && '$VERCEL' link  →  choose 'finhub'."
[ ! -e "$FE/.vercel" ] || die "STRAY link at frontend/.vercel — this is the split-brain cause.
   Remove it:  rm -rf '$FE/.vercel'   (the canonical link is root/.vercel → finhub)."

cd "$ROOT"
echo "▶ Repo:    $ROOT"
echo "▶ Commit:  $(git rev-parse --short HEAD)  ($(git branch --show-current))"
echo "▶ Target:  Vercel project 'finhub'  →  https://$APEX"
[ "$(git branch --show-current)" = "main" ] || ylw "⚠ Not on 'main' — deploying THIS commit anyway."
git diff --quiet || ylw "⚠ Uncommitted tracked changes will be included in the build."

# --- gate (fast) -------------------------------------------------------------
echo "▶ Gate: route-alias guard…"
( cd "$FE" && npm run --silent verify:routes ) || die "verify:routes failed — fix before deploying."

# --- deploy to finhub (root cwd → uses root/.vercel) -------------------------
echo "▶ Deploying to finhub (production)… (~1–2 min)"
RAW="$("$VERCEL" --prod --yes 2>/tmp/starta-web-deploy.log)" || { tail -30 /tmp/starta-web-deploy.log; die "vercel deploy failed."; }
URL="$(printf '%s\n' "$RAW" | grep -Eo 'https://[a-z0-9-]+\.vercel\.app' | tail -1)"
[ -n "$URL" ] || { tail -30 /tmp/starta-web-deploy.log; die "could not parse deployment URL."; }
grn "  deployed: $URL"

# --- alias domain (idempotent; cures the 'pinned domain' gotcha) -------------
echo "▶ Aliasing $APEX + $WWW → new build…"
"$VERCEL" alias set "$URL" "$APEX" >/dev/null 2>&1 || die "alias $APEX failed."
"$VERCEL" alias set "$URL" "$WWW"  >/dev/null 2>&1 || die "alias $WWW failed."

# --- verify live -------------------------------------------------------------
verify_live
grn "✅ WEB DEPLOYED: https://$APEX  (finhub · $URL)"
