#!/usr/bin/env bash
#
# Autonomous key-based backend deploy (NO password).
# Replicates scripts/smart_deploy.exp but authenticates with an SSH key, so it can
# run unattended (CI / agent) and never handles the server password.
#
# One-time setup (done by the human, once):
#   ssh-copy-id -i ~/.ssh/starta_deploy.pub root@46.224.223.172
#
# Then deploy any time with:
#   ./scripts/deploy_backend_key.sh
#
set -euo pipefail

HOST="${STARTA_HOST:-46.224.223.172}"
KEY="${STARTA_DEPLOY_KEY:-$HOME/.ssh/starta_deploy}"
APP_DIR="${STARTA_APP_DIR:-/opt/starta}"
COMPOSE="${STARTA_COMPOSE:-docker-compose.prod.yml}"
TS="$(date +%s)"

if [[ ! -f "$KEY" ]]; then
  echo "❌ Deploy key not found at $KEY"
  echo "   Run once:  ssh-copy-id -i ${KEY}.pub root@${HOST}"
  exit 1
fi

echo "🚀 Deploying backend to ${HOST}:${APP_DIR} via SSH key (no password)…"

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15 \
    "root@${HOST}" bash -s <<REMOTE
set -e
cd "${APP_DIR}"
echo '--- PULL ---'
git fetch origin
git reset --hard origin/main
echo '--- BUILD (backend layer only, deps cached) ---'
docker compose -f "${COMPOSE}" build --build-arg CACHEBUST="${TS}" backend
echo '--- RESTART (hot swap) ---'
docker compose -f "${COMPOSE}" up -d --force-recreate backend
echo '--- STATUS ---'
sleep 5
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -i -E 'backend|starta' || docker ps
echo '--- DONE ---'
REMOTE

echo "✅ Backend deploy complete."
