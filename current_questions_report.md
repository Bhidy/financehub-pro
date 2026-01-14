# FinanceHub Pro - Current Chatbot Questions & Actions Report

## 1. Executive Summary
This report lists all **currently available** predefined questions in the Mobile System (`useAISuggestions.tsx`) and the **Response Action Buttons** returned by the backend handlers (`handlers/*.py`).

## 2. Predefined Questions (Mobile Suggestions)
These are the questions users can tap on the "Welcome" screen.

### 2.1 Tab: 🔥 Popular (Hot)
| Question Text | Intent Triggered |
|---------------|------------------|
| "Show me the safest stocks in EGX" | `SCREENER_SAFETY` |
| "Top 5 dividend stocks in Egypt" | `SCREENER_INCOME` |
| "Which stocks are undervalued?" | `SCREENER_VALUE` |
| "Market summary" | `MARKET_SUMMARY` |

### 2.2 Tab: 💎 Valuation
| Question Text | Intent Triggered |
|---------------|------------------|
| "Is [Stock] overvalued?" | `DEEP_VALUATION` |
| "PE ratio for [Stock]" | `STOCK_STAT` |
| "Show PEG Ratio for [Stock]" | `DEEP_GROWTH` |
| "Compare [Stock] vs [Stock]" | `COMPARE_STOCKS` |

### 2.3 Tab: 🏥 Health
| Question Text | Intent Triggered |
|---------------|------------------|
| "Financial health of [Stock]" | `FINANCIAL_HEALTH` |
| "Show [Stock] efficiency metrics" | `DEEP_EFFICIENCY` |
| "[Stock] Debt to Equity" | `FIN_DEBT` |
| "Show me the safest stocks in EGX" | `SCREENER_SAFETY` |

### 2.4 Tab: 🚀 Growth
| Question Text | Intent Triggered |
|---------------|------------------|
| "Compare [Stock] vs [Stock] growth" | `COMPARE_STOCKS` |
| "What's the CAGR for [Stock]?" | `DEEP_GROWTH` |
| "[Stock] profit margin" | `FIN_MARGINS` |
| "Earnings trend [Stock]" | `REVENUE_TREND` |

### 2.5 Tab: 💵 Dividends
| Question Text | Intent Triggered |
|---------------|------------------|
| "Dividend history [Stock]" | `DIVIDENDS` |
| "Dividend yield [Stock]" | `DIVIDENDS` |
| "Top 5 dividend stocks in Egypt" | `SCREENER_INCOME` |
| "[Stock] payout ratio" | `DIVIDENDS` |

### 2.6 Tab: 🤝 Ownership
| Question Text | Intent Triggered |
|---------------|------------------|
| "Who owns [Stock]?" | `OWNERSHIP` |
| "Insider trading [Stock]" | `OWNERSHIP` |
| "[Stock] shareholders" | `OWNERSHIP` |

## 3. Response Action Buttons
These are the floating buttons that appear **after** the chatbot answers a question, guiding the user to the next step.

### 3.1 Standard Actions (For Price/Info Queries)
Returned by `price_handler.py`:
1.  **📊 View Chart** (`Chart [Symbol]`)
2.  **💰 Financials** (`[Symbol] financials`)
3.  **💵 Dividends** (`[Symbol] dividends`)

### 3.2 Analysis Actions (For Technicals/Health Queries)
Returned by `analysis_handler.py`:
1.  **📈 Chart** (`Chart [Symbol]`)
2.  **💰 Financials** (`[Symbol] financials`)
3.  **👥 Shareholders** (`[Symbol] shareholders`)
4.  **⚙️ Technicals** (`[Symbol] technicals`)

### 3.3 Financial Deep Dive Actions
Returned by `financials_handler.py` (Revenue Trend/Explorer):
1.  **📊 Price Chart** (`Chart [Symbol]`)
2.  **💰 Dividends** (`Dividends [Symbol]`)
3.  **👥 Shareholders** (`[Symbol] shareholders`) _(EGX Only)_
4.  **⚙️ Technicals** (`[Symbol] technicals`) _(EGX Only)_

## 4. Observations & Recommendations
1.  **Redundancy:** "Show me the safest stocks" appears in both "Popular" and "Health".
2.  **Missing Actions:** The "Deep Dive" handlers (Valuation/Safety) currently return generic actions. We should update them to suggest relevant follow-ups (e.g., if asking about Safety, suggest "Who owns it?").
