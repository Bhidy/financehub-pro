#!/bin/bash
# ============================================================
# FinanceHub Pro - Unified Startup Script
# Starts all required services with health checks
# ============================================================

set -e

echo "🚀 =============================================="
echo "   FinanceHub Pro - Enterprise Startup"
echo "   Made with ❤️ by Bhidy"
echo "=============================================="
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================================
# 1. Check Prerequisites
# ============================================================
log_info "Checking prerequisites..."

# Check PostgreSQL
if ! pg_isready -q; then
    log_error "PostgreSQL is not running! Please start it first."
    exit 1
fi
log_success "PostgreSQL is running"

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed!"
    exit 1
fi
log_success "Node.js found: $(node --version)"

# Check Python
if ! command -v python3 &> /dev/null; then
    log_error "Python3 is not installed!"
    exit 1
fi
log_success "Python3 found: $(python3 --version)"

# ============================================================
# 2. Kill Any Existing Processes
# ============================================================
log_info "Cleaning up previous sessions..."

# Kill any existing processes on our ports
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

sleep 2
log_success "Ports 3000 and 8000 cleared"

# ============================================================
# 3. Start Backend API
# ============================================================
log_info "Starting Backend API on port 8000..."

cd "$PROJECT_DIR/backend"
python3 -m uvicorn api:app --host 0.0.0.0 --port 8000 > "$PROJECT_DIR/logs/api.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PROJECT_DIR/.backend.pid"

# Wait for backend to be ready
sleep 3
if curl -s http://localhost:8000/ > /dev/null; then
    log_success "Backend API started (PID: $BACKEND_PID)"
else
    log_error "Backend API failed to start! Check logs/api.log"
    exit 1
fi

# ============================================================
# 4. Start Frontend
# ============================================================
log_info "Starting Frontend on port 3000..."

cd "$PROJECT_DIR/frontend"
npm run dev > "$PROJECT_DIR/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PROJECT_DIR/.frontend.pid"

# Wait for frontend to be ready
sleep 5
if curl -s http://localhost:3000/ > /dev/null; then
    log_success "Frontend started (PID: $FRONTEND_PID)"
else
    log_warning "Frontend may still be starting... Check logs/frontend.log"
fi

# ============================================================
# 5. Display Status
# ============================================================
echo ""
echo "=============================================="
echo -e "${GREEN}🎉 FinanceHub Pro is RUNNING!${NC}"
echo "=============================================="
echo ""
echo "📊 Services:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   Command:   http://localhost:3000/command-center"
echo ""
echo "📁 Logs:"
echo "   Backend:   $PROJECT_DIR/logs/api.log"
echo "   Frontend:  $PROJECT_DIR/logs/frontend.log"
echo ""

# ============================================================
# 6. Optional: Start Auto-Update Scheduler
# ============================================================
echo "🔄 Auto-Update Scheduler"
echo "   Start scheduler for automatic data updates? (y/N)"
read -r start_scheduler

if [[ "$start_scheduler" =~ ^[Yy]$ ]]; then
    log_info "Starting Auto-Update Scheduler..."
    cd "$PROJECT_DIR"
    nohup python3 scheduler.py > logs/scheduler.log 2>&1 &
    SCHEDULER_PID=$!
    echo $SCHEDULER_PID > "$PROJECT_DIR/.scheduler.pid"
    log_success "Scheduler started (PID: $SCHEDULER_PID)"
    echo "   Scheduler logs: $PROJECT_DIR/logs/scheduler.log"
fi

echo ""
echo "🛑 To stop all services, run: ./stop_all.sh"
echo "=============================================="
