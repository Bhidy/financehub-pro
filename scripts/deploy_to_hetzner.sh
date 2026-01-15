#!/bin/bash

# ==============================================================================
# 🚀 FinanceHub Pro - Local Deployment Trigger
# ==============================================================================
# Run this script ON YOUR LOCAL MAC.
# It will connect to your new Hetzner server and install everything automatically.
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}       FinanceHub Pro - Remote Deployment Tool              ${NC}"
echo -e "${BLUE}============================================================${NC}"

# 1. Server IP Selection
if [ -n "$1" ]; then
    SERVER_IP="$1"
    echo -e "Using detected IP: ${GREEN}$SERVER_IP${NC}"
else
    echo -e "Please enter your ${GREEN}Hetzner IP Address${NC}:"
    read -r SERVER_IP
fi

if [ -z "$SERVER_IP" ]; then
    echo "Error: IP Address is required."
    exit 1
fi

# 2. Load Environment Variables (Secrets)
echo -e "Loading configuration from ${BLUE}backend-core/.env.production${NC}..."
if [ -f "backend-core/.env.production" ]; then
    export $(grep -v '^#' backend-core/.env.production | xargs)
    echo -e "✅ Found DATABASE_URL and all secrets"
elif [ -f "backend-core/.env" ]; then
    export $(grep -v '^#' backend-core/.env | xargs)
    echo -e "✅ Found DATABASE_URL (from .env)"
else
    echo -e "⚠️  .env not found. Deployment will prompt for secrets."
fi

# 3. Generate Secret Key if missing
if [ -z "$SECRET_KEY" ]; then
    echo -e "Generating secure SECRET_KEY..."
    SECRET_KEY=$(openssl rand -hex 32)
fi

echo -e "Deploying to ${GREEN}root@$SERVER_IP${NC}..."
echo -e "You will be asked for the server password (from your email) shortly."
echo -e "------------------------------------------------------------"

# 4. Upload and Execute the Setup Script via SSH
# We inject the secrets as environment variables into the SSH session
ssh -o StrictHostKeyChecking=no "root@$SERVER_IP" "DATABASE_URL='$DATABASE_URL' SECRET_KEY='$SECRET_KEY' GOOGLE_CLIENT_ID='$GOOGLE_CLIENT_ID' GOOGLE_CLIENT_SECRET='$GOOGLE_CLIENT_SECRET' GROQ_API_KEY='$GROQ_API_KEY' bash -s" < scripts/setup_hetzner.sh

echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}       ✅ Remote Deployment Triggered!                      ${NC}"
echo -e "${BLUE}============================================================${NC}"
