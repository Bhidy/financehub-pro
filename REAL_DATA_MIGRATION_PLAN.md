# Real Data Migration Plan (100% Zero-Simulation)

## Executive Summary
This plan outlines the technical strategy to replace all simulated data generators (Mutual Funds, Insider Trading, Analyst Ratings) with real-time extraction from authoritative sources. The goal is to achieve 100% data authenticity across the Mubasher Pro platform.

## Current State Analysis
| Domain | Current Status | Source | Authenticity |
|--------|----------------|--------|--------------|
| **Stocks** | ✅ Real | Yahoo Finance / Mubasher | 100% Real |
| **Economics**| ⚠️ Hybrid | ExchangeRateAPI + Static | Spot Real / History Simulated |
| **Funds** | ❌ Simulated | `phase3_mutual_funds.py` | Metadata Real / NAV Simulated |
| **Inside** | ❌ Simulated | `phase3_insider.py` | Simulated Patterns |
| **Analyst**| ❌ Simulated | `phase3_analyst.py` | Simulated Ratings |

## Migration Strategy

### Phase A: Mutual Funds Real Data (High Feasibility)
**Target Source:** `mubasher.info/funds` or `tadawul.com.sa`
**Technique:** Playwright API Interception.
**Plan:**
1.  Use Playwright to navigate to `https://www.mubasher.info/countries/sa/funds`.
2.  Intercept the XHR/Fetch request that populates the table (likely `/api/1/funds` or similar).
3.  For each fund, intercept the chart data request to get historical NAV.
4.  **Action:** Create `backend/extractors/real_fund_extractor.py`.

### Phase B: Insider Trading Real Data (Medium Feasibility)
**Target Source:** `tadawul.com.sa` (Announcements) or `Marketaux` (News API).
**Technique:** NLP extraction from Regulatory Announcements.
**Plan:**
1.  Insider transactions in Saudi Arabia are published as "Regulatory Announcements" on Tadawul.
2.  We cannot find a direct structured CSV.
3.  **Solution:** Scrape the "Announcements" feed filtered by "Director Dealing" or "Insider".
4.  Use LLM (Gemini/GPT) to parse the text: "Director X bought Y shares at Z price".
5.  **Action:** Create `backend/extractors/insider_news_parser.py`.

### Phase C: Analyst Ratings (High Difficulty)
**Target Source:** `Argaam.com` or `TradingView`.
**Technique:** Visual Scraping or Widget Reverse Engineering.
**Plan:**
1.  Argaam is the primary source but has strict scraping protection.
2.  **Alternative:** Scrape `mubasher.info` "Research/Reports" section.
3.  **Alternative 2:** Use `TradingView` Technical Ratings (Strong Buy/Sell) which are computed from real price action, as a proxy for "Analyst Ratings" if broker reports are unavailable.
4.  **Action:** Create `backend/extractors/analyst_scraper.py`.

## Implementation Roadmap

### Step 1: Investigation (Immediate)
- Run `backend/discover_apis.py` specifically targeting the Funds and News sections to capture valid cURL requests.
- Verify if `mubasher.info` exposes a hidden `insider-trades` endpoint.

### Step 2: Extractor Development (Days 1-2)
- Build `RealFundExtractor`: Replaces `backend/phase3_mutual_funds.py`.
- Build `InsiderNewsExtractor`: Replaces `backend/phase3_insider.py` (feeds from `market_news` table).

### Step 3: Database Migration (Day 3)
- Truncate simulated tables: `mutual_funds`, `insider_trading`, `analyst_ratings`.
- Run new extractors to populate with real data.
- Verify frontend matches authoritative sources.

## Recommendation
We should proceed immediately with **Phase A (Mutual Funds)** as it is the most structured data. For **Phase B (Insider)**, we will switch to a "News-Based" display (Real News) rather than a "Transaction Table" (Simulated) if we cannot parsing the text perfectly, ensuring 0% fake data.
