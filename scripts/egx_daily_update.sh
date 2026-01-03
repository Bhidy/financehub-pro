#!/bin/bash
# EGX Daily Data Update Script
# Run this via cron: 0 5 * * * /path/to/egx_daily_update.sh
# Runs at 5 AM Egypt time (after market close)

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment
source "$PROJECT_ROOT/.env"

# Activate virtual environment
source "$PROJECT_ROOT/backend/venv/bin/activate"

# Log file with date
LOG_FILE="$PROJECT_ROOT/logs/egx_daily_$(date +%Y%m%d).log"

echo "========================================" >> "$LOG_FILE"
echo "EGX Daily Update - $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Run the extractor
cd "$PROJECT_ROOT"
python -u scripts/egx_enterprise_extractor.py >> "$LOG_FILE" 2>&1

echo "Update completed at $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
