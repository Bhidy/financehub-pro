#!/bin/bash
# FinanceHub Pro - Production Health Check Script
# Run: ./scripts/health-check.sh

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "       FINANCEHUB PRO - PRODUCTION HEALTH CHECK"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URLs
FRONTEND_URL="https://finhub-pro.vercel.app"
BACKEND_URL="https://starta.46-224-223-172.sslip.io"

# Check Frontend
echo -n "🌐 Frontend (Vercel)............ "
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ ONLINE (HTTP $FRONTEND_STATUS)${NC}"
else
    echo -e "${RED}❌ OFFLINE (HTTP $FRONTEND_STATUS)${NC}"
fi

# Check Backend Health
echo -n "🔌 Backend API (Hetzner VPS).... "
BACKEND_HEALTH=$(curl -s "$BACKEND_URL/health" 2>/dev/null || echo '{"status":"error"}')
if echo "$BACKEND_HEALTH" | grep -q '"healthy"'; then
    echo -e "${GREEN}✅ HEALTHY${NC}"
else
    echo -e "${RED}❌ UNHEALTHY${NC}"
    echo "   Response: $BACKEND_HEALTH"
fi

# Check Database Connection
echo -n "🗄️  Database Connection......... "
DB_STATUS=$(curl -s "$BACKEND_URL/api/v1/stats" 2>/dev/null || echo '{"error":"failed"}')
if echo "$DB_STATUS" | grep -q 'total'; then
    TOTAL=$(echo "$DB_STATUS" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✅ CONNECTED ($TOTAL tickers)${NC}"
else
    echo -e "${RED}❌ DISCONNECTED${NC}"
fi

# Check Dashboard Summary
echo -n "📊 Dashboard Data............... "
SUMMARY=$(curl -s "$BACKEND_URL/api/v1/dashboard/summary" 2>/dev/null || echo '{}')
if echo "$SUMMARY" | grep -q 'stocks'; then
    STOCKS=$(echo "$SUMMARY" | grep -o '"stocks":[0-9]*' | cut -d':' -f2)
    FUNDS=$(echo "$SUMMARY" | grep -o '"funds":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✅ $STOCKS stocks, $FUNDS funds${NC}"
else
    echo -e "${RED}❌ NO DATA${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📍 Frontend: $FRONTEND_URL"
echo "📍 Backend:  $BACKEND_URL"
echo "📍 API Docs: $BACKEND_URL/docs"
echo "═══════════════════════════════════════════════════════════════"
