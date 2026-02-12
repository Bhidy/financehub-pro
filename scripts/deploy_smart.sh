#!/bin/bash
set -e

# ==============================================================================
# FinanceHub Pro - SMART Deployment Script (Fast Iteration)
# ==============================================================================
# This script performs a "Surgical" update:
# 1. Pushes code to GitHub
# 2. SSHs into server
# 3. Pulls latest code
# 4. Builds ONLY changed layers (Uses Docker Cache)
# 5. Restarts ONLY the backend service (Rolling Update)
# 6. Does NOT prune all images (Preserves Cache)
# ==============================================================================

# 1. ENFORCE ROOT DIRECTORY EXECUTION
if [[ ! -f "GEMINI.md" || ! -d "backend-core" ]]; then
    echo "❌ ERROR: You must run this script from the PROJECT ROOT."
    exit 1
fi

echo "⚡ Starting FinanceHub Pro SMART Deployment..."

# 2. GIT SYNC
echo "----------------------------------------------------------------"
echo "📦 Syncing with GitHub..."
if [[ -n $(git status -s) ]]; then
    echo "⚠️  You have uncommitted changes."
    read -p "Do you want to commit and push them now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message: " COMMIT_MSG
        git add .
        git commit -m "$COMMIT_MSG"
        git push origin main
    else
        echo "❌ Deployment aborted. Please commit or stash changes."
        exit 1
    fi
else
    git push origin main
fi
echo "✅ Code pushed to GitHub."

# 3. SERVER EXECUTION
echo "----------------------------------------------------------------"
echo "🔥 EXECUTING SMART UPDATE ON SERVER..."
echo "----------------------------------------------------------------"

# The Command
# 1. cd /opt/starta
# 2. git fetch && git reset --hard origin/main (Update Code)
# 3. docker compose build starta-backend (Build with CACHE)
# 4. docker compose up -d --no-deps --force-recreate starta-backend (Restart only backend)
# 5. docker image prune -f (Clean only dangling/overwritten layers)

ssh -o StrictHostKeyChecking=no root@46.224.223.172 "
    cd /opt/starta && \
    echo '--- 1. PULLING LATEST CODE ---' && \
    git fetch origin && \
    git reset --hard origin/main && \
    echo '--- 2. BUILDING (WITH CACHE) ---' && \
    docker compose -f docker-compose.prod.yml build backend && \
    echo '--- 3. RESTARTING BACKEND ---' && \
    docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend && \
    echo '--- 4. CLEANING DANGLING LAYERS ---' && \
    docker image prune -f && \
    echo '--- 5. HEALTH CHECK ---' && \
    sleep 5 && \
    docker ps && \
    echo '✅ SMART DEPLOY COMPLETE'
"
