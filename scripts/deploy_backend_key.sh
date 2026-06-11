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
echo '--- ENV GUARD (config.py fail-fasts without SECRET_KEY; /refresh/* are fail-closed without ADMIN_API_TOKEN) ---'
if ! grep -q '^SECRET_KEY=..*' .env || grep -q '^SECRET_KEY=placeholder' .env; then
  KEY=\$(python3 -c "import secrets;print(secrets.token_urlsafe(64))")
  grep -v '^SECRET_KEY=' .env > .env.tmp || true; printf 'SECRET_KEY=%s\n' "\$KEY" >> .env.tmp; mv .env.tmp .env
  echo 'SECRET_KEY: generated (missing/placeholder before)'
fi
if ! grep -q '^ADMIN_API_TOKEN=..*' .env; then
  echo 'WARNING: ADMIN_API_TOKEN missing from .env — /refresh/* will be 503 (fail-closed) and every data cron will go red.'
  echo '         Sync it from the GitHub secret (the Backend Deploy workflow does this automatically).'
fi
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
