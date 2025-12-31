#!/bin/bash
# ============================================================
# FinanceHub Pro - Data Update System Activation Script
# ============================================================
# This script activates the automatic data update system.
# Run this ONCE to set everything up.
# ============================================================

set -e

echo "🚀 =============================================="
echo "   FinanceHub Pro - Data Update Activation"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================================
# Step 1: Check if we're in the right directory
# ============================================================
if [ ! -f "scheduler.py" ]; then
    log_error "Please run this script from the project root directory!"
    echo "cd /Users/home/Documents/Info\ Site/mubasher-deep-extract"
    exit 1
fi

log_success "Running from correct directory"

# ============================================================
# Step 2: Push workflows to GitHub
# ============================================================
log_info "Pushing data update workflows to GitHub..."

git add .github/workflows/
git add scripts/
git add DATA_UPDATE_MASTERPLAN.md

git commit -m "🚀 Activate Enterprise Data Update System with Email Notifications

- Added enterprise-data-update.yml workflow
- Live stock prices every 15 min during market hours
- Daily OHLC updates at 9 PM Saudi Time
- Fund NAV updates daily
- Email notifications on ANY failure
- Daily success summary emails
- Test email command available" || echo "No changes to commit"

git push origin main

log_success "Workflows pushed to GitHub!"

# ============================================================
# Step 3: Remind user to configure secrets
# ============================================================
echo ""
echo "=============================================="
echo -e "${YELLOW}⚠️  IMPORTANT: Configure GitHub Secrets${NC}"
echo "=============================================="
echo ""
echo "Go to: https://github.com/Bhidy/financehub-pro/settings/secrets/actions"
echo ""
echo "Add these secrets:"
echo ""
echo "  1. DATABASE_URL"
echo "     Value: postgresql://postgres.kgjpkphfjmmiyjsgsaup:3pmFAnJfL22nJwQO@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"
echo ""
echo "  2. NOTIFICATION_EMAIL"
echo "     Value: Your Gmail address (e.g., your.email@gmail.com)"
echo ""
echo "  3. SMTP_PASSWORD"
echo "     Value: Your Gmail App Password (get from https://myaccount.google.com/apppasswords)"
echo ""
echo "=============================================="
echo ""

# ============================================================
# Step 4: Test the workflow
# ============================================================
echo "Do you want to open GitHub Actions to manually test? (y/N)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    open "https://github.com/Bhidy/financehub-pro/actions/workflows/enterprise-data-update.yml"
    echo ""
    log_info "Opened GitHub Actions in your browser."
    echo ""
    echo "To test:"
    echo "  1. Click 'Run workflow'"
    echo "  2. Select 'test_email' from the dropdown"
    echo "  3. Click 'Run workflow'"
    echo "  4. Check your email!"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}🎉 DATA UPDATE SYSTEM ACTIVATED!${NC}"
echo "=============================================="
echo ""
echo "What happens now:"
echo "  ✅ Stock prices update every 15 min (market hours)"
echo "  ✅ OHLC data saves daily at 9 PM Saudi Time"
echo "  ✅ Fund NAVs update daily at 7 PM"
echo "  ✅ You'll get email alerts on ANY failure"
echo "  ✅ Daily success summary emails"
echo ""
echo "Monitor at: https://github.com/Bhidy/financehub-pro/actions"
echo ""
