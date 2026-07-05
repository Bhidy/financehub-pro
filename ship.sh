#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
# ship — one-command production deploy for startamarkets.com
#
#   ./ship.sh "your message"
#
# Commits everything and pushes straight to main. Vercel auto-deploys in the
# background (~1–2 min) — fire-and-forget, no PR, no CI wait, no polling.
#
# SAFETY: if the Vercel build fails, production keeps serving the LAST GOOD
# deploy — a bad push can never take the site down. So this is fast AND safe.
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"

msg="${1:-chore: quick update}"

if [ -z "$(git status --porcelain)" ]; then
    echo "Nothing to commit — working tree clean."
    exit 0
fi

git add -A
git commit -m "$msg" -q
git push origin main -q

sha="$(git rev-parse --short HEAD)"
echo "✓ Pushed $sha to main — Vercel is auto-deploying now (~1–2 min)."
echo "  Fire-and-forget: nothing to wait for. If the build fails, prod stays on the last good deploy."
