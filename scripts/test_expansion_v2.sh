#!/bin/bash
# =============================================================================
# Starta Chatbot Expansion Plan v2 — Comprehensive Test Script
# 80 questions covering ALL 12 new intents and 15+ card types
# =============================================================================
# Usage: bash scripts/test_expansion_v2.sh [base_url]
# Default: https://starta.46-224-223-172.sslip.io
# =============================================================================

BASE="${1:-https://starta.46-224-223-172.sslip.io}"
API="$BASE/api/v1/ai/chat"
SESSION="test_expansion_$(date +%s)"

PASS=0
FAIL=0
ERRORS=""
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

test_question() {
    local num="$1"
    local category="$2"
    local intent="$3"
    local expected_card="$4"
    local question="$5"
    
    TOTAL=$((TOTAL + 1))
    
    # Make the API call
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
        -H "Content-Type: application/json" \
        -H "X-Device-Fingerprint: test-expansion-v2" \
        -d "{\"message\": \"$question\", \"session_id\": \"$SESSION\"}" \
        --max-time 30 2>/dev/null)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    # Check HTTP status
    if [ "$HTTP_CODE" != "200" ]; then
        FAIL=$((FAIL + 1))
        ERRORS="$ERRORS\n${RED}#$num [$category/$intent] HTTP $HTTP_CODE: $question${NC}"
        printf "${RED}✗${NC} #%-3s [%-18s] HTTP %-3s | %s\n" "$num" "$intent" "$HTTP_CODE" "$question"
        return
    fi
    
    # Check for success field
    SUCCESS=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('success', d.get('response_status','')))" 2>/dev/null)
    
    # Check for cards
    CARD_COUNT=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('cards',[])))" 2>/dev/null)
    
    # Check if expected card type is in the response
    HAS_CARD=$(echo "$BODY" | python3 -c "
import json,sys
d=json.load(sys.stdin)
cards = d.get('cards', [])
types = [c.get('type','') for c in cards]
expected = '$expected_card'
if expected == 'any':
    print('YES' if len(cards) > 0 else 'NO')
elif '|' in expected:
    matches = expected.split('|')
    print('YES' if any(t in matches for t in types) else 'NO')
else:
    print('YES' if expected in types else 'NO')
" 2>/dev/null)
    
    # Get detected intent from meta
    DETECTED=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('meta',{}).get('intent','UNKNOWN'))" 2>/dev/null)
    
    if [ "$HAS_CARD" = "YES" ]; then
        PASS=$((PASS + 1))
        printf "${GREEN}✓${NC} #%-3s [%-18s→%-18s] Cards:%-2s | %s\n" "$num" "$intent" "$DETECTED" "$CARD_COUNT" "$question"
    else
        FAIL=$((FAIL + 1))
        ERRORS="$ERRORS\n${RED}#$num [$intent→$DETECTED] Expected '$expected_card', got cards=$CARD_COUNT: $question${NC}"
        printf "${RED}✗${NC} #%-3s [%-18s→%-18s] Cards:%-2s expected:%-20s | %s\n" "$num" "$intent" "$DETECTED" "$CARD_COUNT" "$expected_card" "$question"
    fi
    
    # Rate limit protection
    sleep 0.5
}

echo ""
echo "============================================================================="
echo -e "${BOLD}${CYAN}  STARTA CHATBOT EXPANSION v2 — FULL REGRESSION TEST${NC}"
echo -e "${BOLD}${CYAN}  80 Questions • 12 Intents • 15+ Card Types${NC}"
echo -e "  Target: $API"
echo -e "  Session: $SESSION"
echo "============================================================================="
echo ""

# =============================================================================
# CATEGORY A: INCOME STATEMENT EXPLORER (INCOME_EXPLORE + INCOME_TREND)
# =============================================================================
echo -e "${YELLOW}━━━ Category A: Income Statement Explorer (20 questions) ━━━${NC}"

test_question 1  "A" "INCOME_EXPLORE" "revenue_breakdown"      "Show me COMI revenue breakdown"
test_question 2  "A" "INCOME_EXPLORE" "revenue_breakdown"      "SWDY revenue breakdown analysis"
test_question 3  "A" "INCOME_EXPLORE" "cost_breakdown"          "What is COMI cost structure"
test_question 4  "A" "INCOME_EXPLORE" "ebitda_breakdown"        "COMI EBITDA breakdown"
test_question 5  "A" "INCOME_EXPLORE" "any"                     "Show COMI interest income vs expense"
test_question 6  "A" "INCOME_EXPLORE" "any"                     "COMI loan loss provisions"
test_question 7  "A" "INCOME_EXPLORE" "any"                     "SWDY research and development spending"
test_question 8  "A" "INCOME_EXPLORE" "any"                     "COMI earnings quality analysis"
test_question 9  "A" "INCOME_EXPLORE" "any"                     "SWDY tax analysis"
test_question 10 "A" "INCOME_EXPLORE" "any"                     "Show COMI operating expenses breakdown"
test_question 11 "A" "INCOME_TREND"   "growth_trend|any"        "COMI revenue growth trend over 5 years"
test_question 12 "A" "INCOME_TREND"   "any"                     "SWDY EPS growth trajectory"
test_question 13 "A" "INCOME_TREND"   "any"                     "COMI net income growth analysis"
test_question 14 "A" "INCOME_TREND"   "any"                     "HRHO revenue growth trend"
test_question 15 "A" "INCOME_TREND"   "any"                     "ETEL earnings per share trend"
test_question 16 "A" "INCOME_EXPLORE" "revenue_breakdown"       "TMGH revenue breakdown"
test_question 17 "A" "INCOME_EXPLORE" "any"                     "EFIH non-operating income details"
test_question 18 "A" "INCOME_EXPLORE" "any"                     "COMI shares outstanding over time"
test_question 19 "A" "INCOME_EXPLORE" "cost_breakdown"          "ABUK cost structure analysis"
test_question 20 "A" "INCOME_EXPLORE" "any"                     "ETEL minority interest earnings"

echo ""

# =============================================================================
# CATEGORY B: BALANCE SHEET EXPLORER (BALANCE_EXPLORE + BALANCE_TREND)
# =============================================================================
echo -e "${YELLOW}━━━ Category B: Balance Sheet Explorer (16 questions) ━━━${NC}"

test_question 21 "B" "BALANCE_EXPLORE" "debt_structure"          "SWDY debt structure"
test_question 22 "B" "BALANCE_EXPLORE" "debt_structure"          "COMI debt structure analysis"
test_question 23 "B" "BALANCE_EXPLORE" "assets_breakdown"        "COMI assets breakdown"
test_question 24 "B" "BALANCE_EXPLORE" "any"                     "What is SWDY working capital"
test_question 25 "B" "BALANCE_EXPLORE" "any"                     "COMI book value per share"
test_question 26 "B" "BALANCE_EXPLORE" "any"                     "How much goodwill does COMI have"
test_question 27 "B" "BALANCE_EXPLORE" "equity_breakdown"        "SWDY equity breakdown"
test_question 28 "B" "BALANCE_EXPLORE" "ppe_breakdown"           "COMI PP&E details fixed assets"
test_question 29 "B" "BALANCE_EXPLORE" "any"                     "SWDY receivables and inventory"
test_question 30 "B" "BALANCE_EXPLORE" "any"                     "COMI liabilities breakdown"
test_question 31 "B" "BALANCE_EXPLORE" "any"                     "HRHO net cash per share"
test_question 32 "B" "BALANCE_EXPLORE" "any"                     "COMI investment portfolio"
test_question 33 "B" "BALANCE_EXPLORE" "assets_breakdown"        "TMGH total assets analysis"
test_question 34 "B" "BALANCE_EXPLORE" "any"                     "ETEL retained earnings"
test_question 35 "B" "BALANCE_TREND"   "any"                     "COMI cash position trend"
test_question 36 "B" "BALANCE_TREND"   "any"                     "SWDY debt trend over time"

echo ""

# =============================================================================
# CATEGORY C: CASH FLOW EXPLORER (CASHFLOW_EXPLORE + CASHFLOW_TREND)
# =============================================================================
echo -e "${YELLOW}━━━ Category C: Cash Flow Explorer (14 questions) ━━━${NC}"

test_question 37 "C" "CASHFLOW_EXPLORE" "cashflow_waterfall"     "COMI cash flow waterfall"
test_question 38 "C" "CASHFLOW_EXPLORE" "cashflow_waterfall"     "Where does SWDY cash come from"
test_question 39 "C" "CASHFLOW_EXPLORE" "growth_trend"           "COMI capex spending trend"
test_question 40 "C" "CASHFLOW_EXPLORE" "debt_activity"          "SWDY debt issuance vs repayment"
test_question 41 "C" "CASHFLOW_EXPLORE" "any"                    "COMI share buybacks"
test_question 42 "C" "CASHFLOW_EXPLORE" "any"                    "SWDY dividends actually paid"
test_question 43 "C" "CASHFLOW_EXPLORE" "fcf_vs_income"          "COMI free cash flow vs net income"
test_question 44 "C" "CASHFLOW_EXPLORE" "cashflow_waterfall"     "HRHO cash flow breakdown"
test_question 45 "C" "CASHFLOW_EXPLORE" "any"                    "ETEL capital expenditure analysis"
test_question 46 "C" "CASHFLOW_EXPLORE" "any"                    "TMGH financing activity"
test_question 47 "C" "CASHFLOW_TREND"   "growth_trend"           "COMI FCF trend"
test_question 48 "C" "CASHFLOW_TREND"   "growth_trend"           "SWDY operating cash flow trend"
test_question 49 "C" "CASHFLOW_EXPLORE" "any"                    "COMI cash taxes paid"
test_question 50 "C" "CASHFLOW_EXPLORE" "fcf_vs_income"          "SWDY FCF analysis"

echo ""

# =============================================================================
# CATEGORY D: RATIO TRENDS (RATIO_TREND)
# =============================================================================
echo -e "${YELLOW}━━━ Category D: Historical Ratio Trends (10 questions) ━━━${NC}"

test_question 51 "D" "RATIO_TREND" "ratio_history_chart"        "COMI PE ratio history"
test_question 52 "D" "RATIO_TREND" "ratio_history_chart"        "SWDY ROE trend over 5 years"
test_question 53 "D" "RATIO_TREND" "ratio_history_chart"        "COMI debt to equity trend"
test_question 54 "D" "RATIO_TREND" "ratio_history_chart"        "COMI margin trends over time"
test_question 55 "D" "RATIO_TREND" "ratio_history_chart"        "SWDY valuation multiples history"
test_question 56 "D" "RATIO_TREND" "ratio_history_chart"        "COMI dividend yield history"
test_question 57 "D" "RATIO_TREND" "ratio_history_chart"        "SWDY turnover ratios trend"
test_question 58 "D" "RATIO_TREND" "ratio_history_chart"        "COMI enterprise value EV multiples"
test_question 59 "D" "RATIO_TREND" "ratio_history_chart"        "HRHO profitability ratios history"
test_question 60 "D" "RATIO_TREND" "ratio_history_chart"        "ETEL liquidity ratios trend"

echo ""

# =============================================================================
# CATEGORY E: ADVANCED STATS & DEEP METRICS
# =============================================================================
echo -e "${YELLOW}━━━ Category E: Advanced Stats & Deep Metrics (10 questions) ━━━${NC}"

test_question 61 "E" "ADVANCED_STATS"   "advanced_stats"         "COMI advanced statistics"
test_question 62 "E" "ADVANCED_STATS"   "advanced_stats"         "SWDY FCF yield vs earnings yield"
test_question 63 "E" "ADVANCED_STATS"   "advanced_stats"         "COMI price to tangible book"
test_question 64 "E" "OWNERSHIP_DETAIL" "ownership_structure"    "COMI insider vs institutional ownership"
test_question 65 "E" "OWNERSHIP_DETAIL" "ownership_structure"    "SWDY ownership structure"
test_question 66 "E" "EV_ANALYSIS"      "advanced_stats"         "COMI enterprise value breakdown"
test_question 67 "E" "SCORE_DETAIL"     "score_detail"           "COMI Altman Z-Score explained"
test_question 68 "E" "SCORE_DETAIL"     "score_detail"           "SWDY Piotroski F-Score breakdown"
test_question 69 "E" "ADVANCED_STATS"   "advanced_stats"         "COMI book value and net cash per share"
test_question 70 "E" "ADVANCED_STATS"   "advanced_stats"         "HRHO asset turnover and efficiency"

echo ""

# =============================================================================
# CATEGORY F: UNIVERSAL FINANCIAL (CATCH-ALL)
# =============================================================================
echo -e "${YELLOW}━━━ Category F: Universal Financial Catch-All (10 questions) ━━━${NC}"

test_question 71 "F" "UNIVERSAL_FINANCIAL" "dynamic_data_card"   "What is COMI depreciation expense"
test_question 72 "F" "UNIVERSAL_FINANCIAL" "dynamic_data_card"   "SWDY goodwill and intangible assets"
test_question 73 "F" "UNIVERSAL_FINANCIAL" "dynamic_data_card"   "COMI deferred tax liabilities"
test_question 74 "F" "UNIVERSAL_FINANCIAL" "dynamic_data_card"   "What is COMI minority interest"
test_question 75 "F" "UNIVERSAL_FINANCIAL" "dynamic_data_card"   "SWDY selling marketing expense"
test_question 76 "F" "UNIVERSAL_FINANCIAL" "dynamic_data_card"   "COMI treasury stock amount"
test_question 77 "F" "UNIVERSAL_FINANCIAL" "dynamic_data_card"   "SWDY accounts payable"
test_question 78 "F" "UNIVERSAL_FINANCIAL" "dynamic_data_card"   "COMI long term investments"
test_question 79 "F" "UNIVERSAL_FINANCIAL" "dynamic_data_card"   "ETEL prepaid expenses"
test_question 80 "F" "UNIVERSAL_FINANCIAL" "dynamic_data_card"   "HRHO FX gain loss"

echo ""
echo "============================================================================="
echo -e "${BOLD}  RESULTS SUMMARY${NC}"
echo "============================================================================="
echo -e "  Total Tests:  $TOTAL"
echo -e "  ${GREEN}Passed:       $PASS${NC}"
echo -e "  ${RED}Failed:       $FAIL${NC}"

if [ $TOTAL -gt 0 ]; then
    PCT=$((PASS * 100 / TOTAL))
    echo -e "  Pass Rate:    ${PCT}%"
fi

if [ -n "$ERRORS" ]; then
    echo ""
    echo -e "${RED}━━━ FAILURES ━━━${NC}"
    echo -e "$ERRORS"
fi

echo "============================================================================="
echo ""

# Exit with non-zero if any failures
[ $FAIL -eq 0 ] && exit 0 || exit 1
