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

    # EXECUTE NUCLEAR OPTION IF REQUESTED
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
        # Note: We assume SSH key access is configured or password will be prompted by expect if needed.
        # However, restore_production.exp takes arguments: [host] [password]
        # We need to retrieve these safely.
        
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
    fi
fi

# 3. FRONTEND DEPLOYMENT (Vercel)
# ------------------------------------------------------------------------------
if [[ "$MODE" == "all" || "$MODE" == "frontend" ]]; then
    echo "----------------------------------------------------------------"
    echo "🎨 Deploying Frontend to Vercel..."
    echo "----------------------------------------------------------------"
    
    # CRITICAL RULE ENFORCEMENT:
    # Run from ROOT, but target the Vercel project correctly.
    # We do NOT cd into frontend/. We run `vercel --prod` from root which picks up 
    # the project configuration or user must ensure vercel.json is correct.
    # WAIT - The user rule says: "Always deploy frontend manually using `npx vercel --prod` from the PROJECT ROOT (`mubasher-deep-extract/`). NEVER run it from inside `frontend/`"
    
    # Let's verify we are NOT in frontend/ (already checked above, but double check pwd)
    CURRENT_DIR=$(pwd)
    if [[ "$CURRENT_DIR" == *"frontend"* ]]; then
         echo "❌ CRITICAL ERROR: Detected execution inside 'frontend' directory."
         echo "This violates Deployment Protocol #2."
         exit 1
    fi

    echo "✅ Directory Context Verified: $CURRENT_DIR (Project Root)"
    
    # Execute Vercel Deployment
    # We use 'npx vercel --prod' and let interactive mode handle it or use pre-configured settings
    echo "🚀 Executing: npx vercel --prod"
    npx vercel --prod
fi

echo "----------------------------------------------------------------"
echo "✅ Deployment Process Complete."
echo "----------------------------------------------------------------"
