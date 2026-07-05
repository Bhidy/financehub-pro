#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  ship — ONE-COMMAND DIRECT PRODUCTION DEPLOY for startamarkets.com
#  ────────────────────────────────────────────────────────────────────────────
#  Fast, direct, no PR, no review wait. Deploys the web AND (when needed) the
#  backend from a single command.
#
#    ./ship.sh "your message"            deploy whatever changed (web + backend)
#    ./ship.sh "msg" --verify            …then wait and confirm it's live
#    ./ship.sh "msg" --no-backend        web only (skip backend even if changed)
#    ./ship.sh "msg" --backend           force a backend deploy too
#    ./ship.sh --verify                  re-verify the current live prod (no commit)
#
#  HOW IT DEPLOYS
#    • Web     → commits + pushes to `main`; Vercel's Git integration (project
#                finhub) auto-builds and startamarkets.com follows it. This is the
#                ONE and ONLY web-deploy path.
#    • Backend → if backend-core/ changed (or --backend), dispatches the
#                "Backend Deploy" GitHub Action, which git-syncs + rebuilds on the
#                Hetzner VPS runner, health-gates, and AUTO-ROLLS-BACK on failure.
#
#  WHY IT'S SAFE
#    • A failed Vercel build never takes the site down — prod keeps serving the
#      last good deploy.
#    • The backend action rolls back automatically if the health gate fails.
#    • Guards below refuse to push from the wrong branch or a wrong author email
#      (Vercel silently refuses to build commits not authored by the account).
#
#  HARD RULE: never runs `vercel` / `vercel --prod` / `vercel alias` — a manual
#  CLI deploy races the Git-integration build and causes split-brain outages.
#  The deploy trigger is a push to `main`. Period. (See docs/DEPLOY_RUNBOOK.md.)
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"

REQUIRED_EMAIL="mohamedbhidy@gmail.com"

# ── parse args ────────────────────────────────────────────────────────────────
MSG=""; VERIFY=0; FORCE_BACKEND=0; SKIP_BACKEND=0
for a in "$@"; do
  case "$a" in
    --verify)     VERIFY=1 ;;
    --backend)    FORCE_BACKEND=1 ;;
    --no-backend) SKIP_BACKEND=1 ;;
    --*)          echo "✗ unknown flag: $a"; exit 2 ;;
    *)            MSG="$a" ;;
  esac
done

say()  { printf '%s\n' "$*"; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ── verify-only mode (no message, --verify) : just re-check live prod ──────────
verify_live() {
  say "▶ Verifying live production…"
  ./scripts/deploy-web.sh || warn "web health check reported an issue"
}

if [ -z "$MSG" ] && [ "$VERIFY" = 1 ]; then verify_live; exit 0; fi
MSG="${MSG:-chore: quick update}"

# ── guards ────────────────────────────────────────────────────────────────────
BR="$(git rev-parse --abbrev-ref HEAD)"
[ "$BR" = "main" ] || die "on branch '$BR' — direct deploy pushes main only. Run: git checkout main"
EMAIL="$(git config user.email || true)"
[ "$EMAIL" = "$REQUIRED_EMAIL" ] || die "git user.email is '$EMAIL' — must be $REQUIRED_EMAIL (Vercel won't build otherwise). Fix: git config user.email $REQUIRED_EMAIL"

if [ -z "$(git status --porcelain)" ]; then
  say "Working tree clean — nothing to deploy."
  [ "$VERIFY" = 1 ] && verify_live
  exit 0
fi

# ── stage + detect what changed ───────────────────────────────────────────────
git add -A
STAGED="$(git diff --cached --name-only)"
[ -z "$STAGED" ] && die "nothing staged after 'git add -A' (all changes gitignored?)"

BACKEND_CHANGED=0; WEB_CHANGED=0
grep -qE '^backend-core/'  <<<"$STAGED" && BACKEND_CHANGED=1
grep -qvE '^backend-core/' <<<"$STAGED" && WEB_CHANGED=1

say "▶ Deploying $(wc -l <<<"$STAGED" | tr -d ' ') file(s):"
head -20 <<<"$STAGED" | sed 's/^/    /'
[ "$(grep -c '' <<<"$STAGED")" -gt 20 ] && say "    … more"

# ── commit + push to main (web auto-deploys) ──────────────────────────────────
git commit -q -m "$MSG"
SHA="$(git rev-parse --short HEAD)"
git push -q origin main
ok "Pushed $SHA to main."
[ "$WEB_CHANGED" = 1 ] && say "  → Vercel is auto-deploying the web (~1–2 min). Prod stays on last-good if the build fails."

# ── backend deploy when needed ────────────────────────────────────────────────
DO_BACKEND=0
if [ "$SKIP_BACKEND" = 0 ] && { [ "$BACKEND_CHANGED" = 1 ] || [ "$FORCE_BACKEND" = 1 ]; }; then DO_BACKEND=1; fi
if [ "$DO_BACKEND" = 1 ]; then
  if command -v gh >/dev/null 2>&1; then
    gh workflow run backend-deploy.yml -f reason="ship: $MSG ($SHA)" >/dev/null \
      && ok "Backend deploy dispatched (VPS: git-sync → rebuild → health-gate → auto-rollback on fail)." \
      || warn "could not dispatch backend-deploy.yml (run it manually: gh workflow run backend-deploy.yml)"
  else
    warn "gh CLI not found — backend changed but not deployed. Run: gh workflow run backend-deploy.yml"
  fi
fi

# ── optional verify ───────────────────────────────────────────────────────────
if [ "$VERIFY" = 1 ]; then
  say "  → Waiting ~90s for the Vercel build, then verifying…"
  sleep 90
  ./scripts/deploy-web.sh || warn "web health check reported an issue — check the Vercel dashboard (finhub)"
  if [ "$DO_BACKEND" = 1 ] && command -v gh >/dev/null 2>&1; then
    RID="$(gh run list --workflow=backend-deploy.yml -L1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
    [ -n "$RID" ] && { say "  → Watching backend deploy $RID…"; gh run watch "$RID" --exit-status || warn "backend deploy failed (it auto-rolled back)"; }
  fi
fi

ok "Ship complete — $SHA live path: main → Vercel$([ "$DO_BACKEND" = 1 ] && echo ' + backend')."
