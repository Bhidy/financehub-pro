#!/bin/bash

# API Endpoint
API_URL="https://bhidy-financehub-api.hf.space/api/v1/ai/chat"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================================"
echo "   CHIEF EXPERT VERIFICATION PROTOCOL (PHASE 9)      "
echo "========================================================"
echo "Target: $API_URL"
echo ""

verify_question() {
    local query="$1"
    local expected_intent="$2" # Optional check
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing: '$query' ... "
    
    # Run curl, capture output and http code
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"message\": \"$query\", \"history\": [], \"market\": \"EGX\"}")
    
    http_code=$(echo "$response" | tail -n1)
    json_body=$(echo "$response" | sed '$d')
    
    # Check if cards > 0
    card_count=$(echo "$json_body" | grep -o '"cards":\[[^]]*\]' | grep -o '{' | wc -l)
    error_check=$(echo "$json_body" | grep -o '"intent":"ERROR"')
    
    if [[ "$http_code" == "200" && $card_count -gt 0 && -z "$error_check" ]]; then
        echo -e "${GREEN}PASS${NC} (Cards: $card_count)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}FAIL${NC}"
        echo "  HTTP: $http_code"
        echo "  Body: $(echo "$json_body" | cut -c 1-200)..."
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    sleep 1 # mild rate limit
}

# --- 1. Popular / Market ---
echo "--- Sector 1: Popular / Market ---"
verify_question "Show me the safest stocks in EGX"
verify_question "Top 5 dividend stocks in Egypt"
verify_question "Which stocks are undervalued?"
verify_question "Market summary"

# --- 2. Valuation ---
echo "--- Sector 2: Valuation ---"
verify_question "Is CIB overvalued?"
verify_question "PE ratio for SWDY"
verify_question "Show PEG Ratio for COMI"
verify_question "Compare CIB vs SWDY"

# --- 3. Health ---
echo "--- Sector 3: Health ---"
verify_question "Financial health of CIB"
verify_question "Show ADIB efficiency metrics"
verify_question "SWDY Debt to Equity"
verify_question "ROE for CIB"

# --- 4. Growth ---
echo "--- Sector 4: Growth ---"
verify_question "Compare COMI vs EKHO growth"
verify_question "What's the CAGR for EFIH?"
verify_question "COMI profit margin"
verify_question "Earnings trend CIB"

# --- 5. Dividends ---
echo "--- Sector 5: Dividends ---"
verify_question "Dividend history CIB"
verify_question "Dividend yield SWDY"
verify_question "COMI payout ratio"

# --- 6. Ownership ---
echo "--- Sector 6: Ownership ---"
verify_question "Who owns CIB?"
verify_question "Insider trading SWDY"
verify_question "COMI shareholders"

echo ""
echo "========================================================"
echo "   SUMMARY: $PASSED_TESTS / $TOTAL_TESTS PASSED"
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}   RESULT: 100% ROBUST (ALL GREEN)${NC}"
else
    echo -e "${RED}   RESULT: FAILED ($FAILED_TESTS Failures)${NC}"
fi
echo "========================================================"
