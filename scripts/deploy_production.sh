#!/bin/bash
set -e

# ==============================================================================
# FinanceHub Pro - Strict Production Deployment Script
# ==============================================================================
# This script enforces all Critical Rules from GEMINI.md to prevent deployment failures.
# 
# Usage: ./scripts/deploy_production.sh [all|frontend|backend]
# Default: all
# ==============================================================================

# 1. ENFORCE ROOT DIRECTORY EXECUTION
# ------------------------------------------------------------------------------
# We must be at the project root. Check for key files.
if [[ ! -f "GEMINI.md" || ! -d "backend-core" || ! -d "frontend" ]]; then
    echo "❌ ERROR: You must run this script from the PROJECT ROOT."
    echo "Correct usage: ./scripts/deploy_production.sh"
    exit 1
fi

MODE=${1:-all}

echo "🚀 Starting FinanceHub Pro Deployment ($MODE)..."

# 2. BACKEND DEPLOYMENT (Hetzner via Git)
# ------------------------------------------------------------------------------
if [[ "$MODE" == "all" || "$MODE" == "backend" ]]; then
    # Check for NUCLEAR strategy flag
    STRATEGY=${2:-standard} # Second argument: 'standard' (default) or 'nuclear'

    echo "----------------------------------------------------------------"
    if [[ "$STRATEGY" == "nuclear" ]]; then
        echo "☢️  NUCLEAR DEPLOYMENT SELECTED (Immediate Consistency)"
        echo "   1. Push Code -> GitHub"
        echo "   2. SSH -> Stop, Prune, Rebuild, Start"
    elif [[ "$STRATEGY" == "smart" ]]; then
        echo "⚡ SMART DEPLOYMENT SELECTED (Fast Hot-Swap)"
        echo "   1. Push Code -> GitHub"
        echo "   2. SSH -> Git Reset & Rolling Update (No Prune)"
    else
        echo "📦 Deploying Backend to Hetzner (Standard Git Push)..."
    fi
    echo "----------------------------------------------------------------"
    
    # Check if we have uncommitted changes
    if [[ -n $(git status -s) ]]; then
        echo "⚠️  You have uncommitted changes."
        read -p "Do you want to commit and push them now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Enter commit message: " COMMIT_MSG
            git add .
            git commit -m "$COMMIT_MSG"
            git push origin main
            echo "✅ Backend code pushed to GitHub."
        else
            echo "⛔ Backend deployment aborted (Changes must be pushed for Coolify)."
            exit 1
        fi
    else
        echo "✅ No local changes. Pushing current main..."
        git push origin main
    fi

    # EXECUTE DEPLOYMENT STRATEGY
    if [[ "$STRATEGY" == "nuclear" ]]; then
        echo "----------------------------------------------------------------"
        echo "🔥 EXECUTING NUCLEAR REBUILD ON SERVER..."
        echo "----------------------------------------------------------------"
        # Verify expect script exists
        if [[ ! -f "scripts/restore_production.exp" ]]; then
            echo "❌ ERROR: scripts/restore_production.exp not found!"
            exit 1
        fi
        
        # Execute the restore script
        # Hardcoded IP from context/memory
        HOST="46.224.223.172"
        
        echo "Enter Server Password for $HOST (Input Hidden):"
        read -s SERVER_PASSWORD
        
        ./scripts/restore_production.exp "$HOST" "$SERVER_PASSWORD"
        
        if [[ $? -eq 0 ]]; then
             echo "✅ Nuclear Deployment Successful."
        else
             echo "❌ Nuclear Deployment Failed."
             exit 1
        fi
        
    elif [[ "$STRATEGY" == "smart" ]]; then
        echo "----------------------------------------------------------------"
        echo "⚡ EXECUTING SMART HOT-SWAP ON SERVER..."
        echo "----------------------------------------------------------------"
        # Verify expect script exists
        if [[ ! -f "scripts/smart_deploy.exp" ]]; then
            echo "❌ ERROR: scripts/smart_deploy.exp not found!"
            exit 1
        fi
        
        HOST="46.224.223.172"
        
        echo "Enter Server Password for $HOST (Input Hidden):"
        # Reuse existing var if set, else prompt (though flow above ensures we'd prompt if we merged logic, but here we are clean)
        read -s SERVER_PASSWORD
        
        ./scripts/smart_deploy.exp "$HOST" "$SERVER_PASSWORD"
        
        if [[ $? -eq 0 ]]; then
             echo "✅ Smart Deployment Successful."
        else
             echo "❌ Smart Deployment Failed."
             exit 1
        fi
    fi
fi

# 3. FRONTEND DEPLOYMENT — REMOVED (single-deploy-path policy, root-caused 2026-06)
# ------------------------------------------------------------------------------
# This script NO LONGER deploys the frontend. The ONLY way the frontend reaches
# production is by landing code on `main`: Vercel's Git Integration (project
# `finhub`) auto-builds it and the apex (startamarkets.com) auto-follows.
#
# The old `npx vercel --prod` here was a SECOND, competing production build that
# raced the automatic git build for the domain — the root cause of every
# "changes-not-live / wrong-url" incident. It is deleted, not worked around.
# (It also referenced a long-dead project root, "mubasher-deep-extract".)
if [[ "$MODE" == "frontend" ]]; then
    echo "❌ This script no longer deploys the frontend."
    echo "   Deploy = merge your PR to 'main'. Vercel builds it; startamarkets.com follows."
    echo "   Verify after merge:  ./scripts/deploy-web.sh   (verify-only)"
    echo "   Authoritative procedure:  docs/DEPLOY_RUNBOOK.md"
    exit 1
fi
# (MODE=all falls through to backend-only below; frontend is intentionally skipped.)

echo "----------------------------------------------------------------"
echo "✅ Deployment Process Complete."
echo "----------------------------------------------------------------"
