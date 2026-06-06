#!/bin/bash
set -euo pipefail
# ==============================================================================
# DEPRECATED — kept only as a redirect to the canonical, single deploy paths.
# ==============================================================================
# This script used to deploy both surfaces via `vercel --prod` (frontend) and
# password-authenticated `expect` scripts (backend). Both were root causes of the
# 2026-06 deploy mess and a leaked SSH password committed to git. They are gone.
#
#   • WEB     → deploy = merge a PR to `main` (Vercel Git Integration auto-builds;
#               startamarkets.com auto-follows). See docs/DEPLOY_RUNBOOK.md.
#   • BACKEND → ./scripts/deploy_backend_key.sh   (key auth, no password)
#
# SSH password authentication is DISABLED on the server (key-only) as of 2026-06,
# so the old `scripts/*.exp` password helpers were deleted and cannot work.
# ==============================================================================

MODE="${1:-all}"

case "$MODE" in
  backend|all)
    echo "▶ Backend deploys via the key-based script (no password):"
    echo "    ./scripts/deploy_backend_key.sh"
    HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [[ -x "$HERE/deploy_backend_key.sh" ]]; then
      read -r -p "Run ./scripts/deploy_backend_key.sh now? (y/N) " ans
      [[ "$ans" =~ ^[Yy]$ ]] && exec "$HERE/deploy_backend_key.sh"
    fi
    [[ "$MODE" == "backend" ]] && exit 0
    ;;&
  frontend|all)
    echo "▶ The frontend has NO deploy command. Deploy = merge your PR to 'main'."
    echo "    Vercel builds it; startamarkets.com auto-follows. Verify: ./scripts/deploy-web.sh"
    echo "    Authoritative procedure: docs/DEPLOY_RUNBOOK.md"
    ;;
  *)
    echo "Usage: $0 [all|frontend|backend]  (deprecated redirect — see docs/DEPLOY_RUNBOOK.md)"
    exit 1
    ;;
esac
