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
#
# A 200 from startamarkets.com proves the SITE is up, not that THIS commit
# shipped: when a Vercel build fails, production keeps serving the last good
# deploy and every health check still passes. Three builds failed that way while
# this script printed "Live and healthy". So verify the DEPLOYMENT first, and
# only then the page contents.
verify_deployment_state() {
  command -v npx >/dev/null 2>&1 || { warn "npx not found — cannot confirm deployment state"; return 0; }
  local line status age
  line="$(npx --yes vercel ls --prod 2>/dev/null | grep -m1 'Production' || true)"
  status="$(printf '%s' "$line" | grep -o 'Error\|Ready\|Building\|Queued' | head -1)"

  # The Git integration sometimes silently does NOT fire: the commit reaches
  # origin/main and no build is ever created, so the newest deployment is the
  # PREVIOUS one and every health check still passes. If the newest production
  # deployment predates this push, the change is not live.
  age="$(printf '%s' "$line" | awk '{print $1}')"
  case "$age" in
    *m) [ "${age%m}" -gt 6 ] 2>/dev/null && {
          warn "newest production deployment is ${age} old — the Git integration may not have fired for $SHA."
          warn "  Re-trigger with:  git commit --allow-empty -m 'chore: re-trigger build' && git push origin main"
          warn "  (never 'vercel --prod' — a CLI deploy races the Git build)"
        } ;;
    *h|*d) warn "newest production deployment is ${age} old — this push almost certainly did not build." ;;
  esac
  case "$status" in
    Ready)    ok "Vercel production deployment is Ready." ;;
    Error)    die "Vercel production build FAILED — your change is NOT live (prod is serving the previous deploy).
     Inspect it:  npx vercel inspect --logs \$(npx vercel ls --prod | grep -m1 -o 'https://[^ ]*')" ;;
    Building|Queued) warn "Vercel build still $status — re-run './ship.sh --verify' shortly to confirm." ;;
    *)        warn "could not read the Vercel deployment state; check the dashboard (finhub)." ;;
  esac
}

if [ "$VERIFY" = 1 ]; then
  say "  → Waiting ~90s for the Vercel build, then verifying…"
  sleep 90
  verify_deployment_state
  ./scripts/deploy-web.sh || warn "web health check reported an issue — check the Vercel dashboard (finhub)"
  if [ "$DO_BACKEND" = 1 ] && command -v gh >/dev/null 2>&1; then
    RID="$(gh run list --workflow=backend-deploy.yml -L1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
    [ -n "$RID" ] && { say "  → Watching backend deploy $RID…"; gh run watch "$RID" --exit-status || warn "backend deploy failed (it auto-rolled back)"; }
  fi
fi

ok "Ship complete — $SHA live path: main → Vercel$([ "$DO_BACKEND" = 1 ] && echo ' + backend')."
