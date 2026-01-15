#!/bin/bash

# ==============================================================================
# 🚀 Starta (FinanceHub Pro) - Hetzner Auto-Setup Script
# ==============================================================================
# This script turns a fresh Hetzner Ubuntu server into a Production Host.
# Features:
# 1. Installs Docker & Docker Compose
# 2. Clones/Updates the Repository
# 3. Sets up Caddy for Auto-HTTPS (SSL)
# 4. Configures Production Environment
# ==============================================================================

set -e # Exit on error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}       Starta - Production Deployment Setup                 ${NC}"
echo -e "${BLUE}============================================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (use sudo)${NC}"
  exit 1
fi

# 1. System Update
echo -e "${GREEN}--> Updating System Packages...${NC}"
apt-get update && apt-get upgrade -y
apt-get install -y git curl ufw debian-keyring debian-archive-keyring apt-transport-https

# 2. Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "${GREEN}--> Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo -e "${BLUE}--> Docker already installed.${NC}"
fi

# 3. Setup Project Directory
APP_DIR="/opt/starta"
echo -e "${GREEN}--> Setting up App Directory at ${APP_DIR}...${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

# 4. Clone/Pull Repo (Public Read-Only)
REPO_URL="https://github.com/Bhidy/financehub-pro.git"
if [ -d ".git" ]; then
    echo -e "${BLUE}--> Updating existing repository...${NC}"
    git pull origin main
else
    echo -e "${GREEN}--> Cloning repository...${NC}"
    git clone $REPO_URL .
fi

# 5. Environment Configuration
ENV_FILE="backend-core/.env"
echo -e "${GREEN}--> Configuring Environment...${NC}"

# Define defaults (non-sensitive)
DEFAULT_REDIRECT="https://finhub-pro.vercel.app/api/auth/google/callback"

# Use injected values or defaults
GOOGLE_REDIRECT_URI="${GOOGLE_REDIRECT_URI:-$DEFAULT_REDIRECT}"

# Check required vars
if [ -z "$DATABASE_URL" ]; then
    if [ -f "$ENV_FILE" ]; then
         # Try to preserve existing DB URL if not passed
         DATABASE_URL=$(grep DATABASE_URL "$ENV_FILE" | cut -d '"' -f 2)
    fi
    # If still empty, prompt
    if [ -z "$DATABASE_URL" ]; then
        echo -e "Please paste your ${RED}DATABASE_URL${NC} (Supabase):"
        read -r DATABASE_URL
    fi
fi

if [ -z "$SECRET_KEY" ]; then
    echo -e "Generating secure SECRET_KEY..."
    SECRET_KEY=$(openssl rand -hex 32)
fi

echo -e "${BLUE}--> Updating .env file...${NC}"
cat > $ENV_FILE <<EOF
# Database
DATABASE_URL="${DATABASE_URL}"

# Auth
SECRET_KEY="${SECRET_KEY}"

# AI Services
GROQ_API_KEY="${GROQ_API_KEY}"

# Email
RESEND_API_KEY="re_iiYtzFAq_Lu28D9jvXrhGymrvQx8i5Uhj"
FROM_EMAIL="onboarding@resend.dev"

# Google OAuth
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET}"
GOOGLE_REDIRECT_URI="${GOOGLE_REDIRECT_URI}"

# Data Sources
DECYPHA_USERNAME="m.mostafa@mubasher.net"
DECYPHA_PASSWORD="bhidy1234"

# Environment
IS_PRODUCTION="true"
EOF

# 6. Caddyfile Setup (Reverse Proxy)
# We use a simple Caddyfile for auto-https
cat > Caddyfile <<EOF
{
    email admin@finhub.pro
}

:80 {
    reverse_proxy backend:7860
}

:443 {
    reverse_proxy backend:7860
}
EOF

# 7. Create Docker Compose Overrides for Production
cat > docker-compose.prod.yml <<EOF
version: '3.8'

services:
  backend:
    build: 
      context: ./backend-core
      dockerfile: Dockerfile
    restart: always
    ports:
      - "7860:7860"
    env_file:
      - ./backend-core/.env
    volumes:
      - ./logs:/app/logs
      - ./cache:/app/yahoo_cache
    networks:
      - finhub-net

  caddy:
    image: caddy:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - finhub-net

networks:
  finhub-net:

volumes:
  caddy_data:
  caddy_config:
EOF

# 8. Firewall Setup
echo -e "${GREEN}--> Configuring Firewall (UFW)...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 7860/tcp
ufw --force enable

# 9. Launch
echo -e "${GREEN}--> Launching Containers...${NC}"
docker compose -f docker-compose.prod.yml up -d --build

echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}       ✅ DEPLOYMENT COMPLETE!                              ${NC}"
echo -e "${BLUE}============================================================${NC}"
echo -e "Your API is running at: http://$(curl -s ifconfig.me)/api/v1"
echo -e "Next Steps:"
echo -e "1. Test the API URL above."
echo -e "2. Update your Vercel Frontend 'NEXT_PUBLIC_API_URL' to this IP."
echo -e "3. Enjoy 24/7 Uptime!"
