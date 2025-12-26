#!/bin/bash
# ============================================================
# FinanceHub Pro - Stop All Services
# ============================================================

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🛑 Stopping FinanceHub Pro services..."

# Kill by PID files if they exist
if [ -f "$PROJECT_DIR/.backend.pid" ]; then
    kill $(cat "$PROJECT_DIR/.backend.pid") 2>/dev/null || true
    rm "$PROJECT_DIR/.backend.pid"
    echo "✓ Backend stopped"
fi

if [ -f "$PROJECT_DIR/.frontend.pid" ]; then
    kill $(cat "$PROJECT_DIR/.frontend.pid") 2>/dev/null || true
    rm "$PROJECT_DIR/.frontend.pid"
    echo "✓ Frontend stopped"
fi

if [ -f "$PROJECT_DIR/.scheduler.pid" ]; then
    kill $(cat "$PROJECT_DIR/.scheduler.pid") 2>/dev/null || true
    rm "$PROJECT_DIR/.scheduler.pid"
    echo "✓ Scheduler stopped"
fi

# Also kill by port and process name as fallback
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
pkill -f "scheduler.py" 2>/dev/null || true

echo "✅ All services stopped"
