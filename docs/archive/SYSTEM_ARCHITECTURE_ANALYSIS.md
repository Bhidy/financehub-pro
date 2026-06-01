# FinanceHub Pro - Complete System Architecture Analysis
## Enterprise-Grade Financial Intelligence Platform

**Date:** January 23, 2026  
**Author:** Bhidy  
**Status:** Production (Hetzner VPS)  
**Version:** 4.4.0-STARTA-STRUCTURE

---

## 📊 Executive Summary

FinanceHub Pro (branded as **Starta**) is an enterprise-grade financial intelligence platform for MENA markets (Saudi Arabia, Egypt, GCC). The system extracts, processes, and visualizes stock market data with an AI-powered chatbot interface.

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FINANCEHUB PRO ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    HTTPS     ┌──────────────────────────────────────────┐ │
│  │   FRONTEND      │◄────────────►│           BACKEND (Hetzner VPS)          │ │
│  │   (Vercel)      │              │     starta.46-224-223-172.sslip.io       │ │
│  │                 │              │                                          │ │
│  │ • Next.js 16    │              │  ┌────────────────────────────────────┐  │ │
│  │ • React 19      │              │  │         FastAPI Server             │  │ │
│  │ • TailwindCSS   │              │  │  • Python 3.11 + Uvicorn           │  │ │
│  │ • TypeScript 5  │              │  │  • Docker Container                │  │ │
│  │ • Framer Motion │              │  │  • Port 7860                       │  │ │
│  └─────────────────┘              │  └────────────────────────────────────┘  │ │
│                                   │                    │                      │ │
│                                   │                    ▼                      │ │
│  ┌─────────────────┐              │  ┌────────────────────────────────────┐  │ │
│  │  GitHub Actions │──Trigger────►│  │       AI Chat Engine               │  │ │
│  │  (Watchdog)     │              │  │  • Intent Router (Rule-Based)      │  │ │
│  │  • Data Sync    │              │  │  • Multi-LLM Fallback              │  │ │
│  │  • Price Update │              │  │    (Groq → Cerebras → Mistral)     │  │ │
│  │  • AI Ingestion │              │  │  • Symbol Resolver                 │  │ │
│  └─────────────────┘              │  │  • 15+ Intent Handlers             │  │ │
│                                   │  └────────────────────────────────────┘  │ │
│                                   │                    │                      │ │
│                                   │                    ▼                      │ │
│                                   │  ┌────────────────────────────────────┐  │ │
│                                   │  │         DATABASE                   │  │ │
│                                   │  │      (Supabase PostgreSQL)         │  │ │
│                                   │  │  • 19.2M+ Data Points              │  │ │
│                                   │  │  • 210+ Stock Tickers              │  │ │
│                                   │  │  • User Portfolios                 │  │ │
│                                   │  └────────────────────────────────────┘  │ │
│                                   └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technology Stack

### Frontend (`/frontend`)
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js (App Router) | 16.1.1 |
| UI Library | React | 19.2.3 |
| Styling | Tailwind CSS | v4 |
| Animation | Framer Motion | Latest |
| Charts | ApexCharts, Recharts, Lightweight Charts | - |
| State Management | TanStack Query (React Query) | - |
| Language | TypeScript | 5 |

### Backend (`/backend-core`)
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | FastAPI | Latest |
| Runtime | Python | 3.11 |
| Server | Uvicorn | - |
| Container | Docker | - |
| Scheduler | APScheduler | - |
| ORM | asyncpg (raw SQL) | - |

### Infrastructure
| Component | Service | Details |
|-----------|---------|---------|
| Frontend Hosting | Vercel | CDN + Edge |
| Backend Hosting | Hetzner VPS | Docker |
| Database | Supabase PostgreSQL | Managed |
| SSL/Proxy | Caddy | Auto ACME |
| CI/CD | GitHub Actions | Watchdog |

---

## 📁 Directory Structure

```
startamarkets/
├── frontend/                    # Next.js Application (Vercel)
│   ├── app/                     # App Router Pages
│   │   ├── AiChat/              # Canonical AI Chat
│   │   ├── portfolio/           # Portfolio Management
│   │   ├── screener/            # Stock Screener
│   │   ├── api/                 # Next.js API Routes
│   │   └── ...                  # 28+ pages
│   ├── components/              # 41+ Reusable Components
│   ├── hooks/                   # Custom React Hooks
│   ├── lib/                     # API Client & Utilities
│   │   ├── api.ts               # Backend API Client
│   │   ├── ai-service.ts        # AI Service Integration
│   │   └── auth.ts              # Authentication
│   └── contexts/                # React Contexts
│
├── backend-core/                # FastAPI Application (Hetzner)
│   ├── app/
│   │   ├── main.py              # Application Entry Point
│   │   ├── api/v1/              # API Endpoints
│   │   │   ├── endpoints/       # 14 Endpoint Modules
│   │   │   └── router.py        # Route Registration
│   │   ├── chat/                # AI Chat Engine (Core)
│   │   │   ├── chat_service.py  # Main Orchestrator
│   │   │   ├── intent_router.py # Intent Classification
│   │   │   ├── symbol_resolver.py # Ticker Resolution
│   │   │   ├── llm_clients.py   # Multi-LLM Provider
│   │   │   ├── handlers/        # 15 Intent Handlers
│   │   │   └── ...
│   │   ├── services/            # Business Logic
│   │   │   ├── scheduler.py     # Background Jobs
│   │   │   └── ai_service.py    # Legacy AI Service
│   │   ├── db/                  # Database Schemas
│   │   └── core/                # Configuration
│   ├── scripts/                 # Data Extraction Scripts
│   └── Dockerfile               # Container Definition
│
├── scripts/                     # Deployment & Utility Scripts
│   ├── deploy_production.sh     # Unified Deployment
│   └── restore_production.exp   # Nuclear Recovery
│
├── .github/workflows/           # CI/CD Pipelines
│   └── enterprise-data-update.yml
│
└── .agent/workflows/            # Agent Automation Workflows
```

---

## 🗄️ Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ENTERPRISE DATABASE SCHEMA                               │
│                         ~19.2 Million Data Points                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐        ┌─────────────────────┐                        │
│  │   market_tickers    │◄──────►│    company_profiles │                        │
│  │   (Core Stock List) │        │   (Company Details) │                        │
│  │ • symbol (PK)       │        │ • sector, industry  │                        │
│  │ • name_en/ar        │        │ • description, CEO  │                        │
│  │ • last_price        │        │ • employees, HQ     │                        │
│  │ • market_cap        │        └─────────────────────┘                        │
│  │ • pe_ratio, beta    │                                                       │
│  └──────────┬──────────┘                                                       │
│             │                                                                   │
│             ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         PRICE DATA TABLES                               │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ ohlc_data      │ Daily OHLC (10,577 pts/stock)                          │   │
│  │ intraday_1m    │ 1-Minute (7 days history)                              │   │
│  │ intraday_5m    │ 5-Minute (60 days, 25,186 pts)                         │   │
│  │ intraday_1h    │ 1-Hour (2 years, 25,494 pts)                           │   │
│  │ weekly_ohlc    │ Weekly aggregates                                      │   │
│  │ monthly_ohlc   │ Monthly aggregates                                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       FINANCIAL DATA TABLES                             │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ financial_history  │ Income/Balance/CashFlow (3000+ pts/stock)          │   │
│  │ valuation_history  │ PE, PB, PS, EV ratios (130 pts/stock)              │   │
│  │ earnings_history   │ EPS estimates/actuals                              │   │
│  │ dividend_history   │ Ex-dates, amounts                                  │   │
│  │ analyst_consensus  │ Ratings, targets                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       PORTFOLIO TABLES                                  │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ portfolios           │ User portfolios (cash, currency)                 │   │
│  │ portfolio_holdings   │ Stock positions (symbol, qty, avg_price)         │   │
│  │ portfolio_snapshots  │ Historical valuations                            │   │
│  │ portfolio_transactions│ Buy/Sell records with P&L                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🤖 AI Chatbot Architecture

### Chatbot Processing Pipeline

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                     AI CHAT MESSAGE PROCESSING FLOW                            │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  USER MESSAGE                                                                  │
│       │                                                                        │
│       ▼                                                                        │
│  ┌─────────────────────┐                                                       │
│  │ 1. TEXT NORMALIZER  │ • Slang/dialect translation                          │
│  │                     │ • Arabic normalization                                │
│  │                     │ • Symbol extraction                                   │
│  └──────────┬──────────┘                                                       │
│             ▼                                                                  │
│  ┌─────────────────────┐                                                       │
│  │ 2. COMPLIANCE CHECK │ • Banned topics filter                               │
│  │                     │ • Disclaimer injection                                │
│  └──────────┬──────────┘                                                       │
│             ▼                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────────────────┐   │
│  │ 3. INTENT ROUTER    │───►│ INTENT KEYWORDS (30+ Intents)               │   │
│  │   (Rule-Based)      │    │ • STOCK_PRICE, STOCK_SNAPSHOT               │   │
│  │                     │    │ • DIVIDENDS, FINANCIALS                      │   │
│  │   Score keywords    │    │ • SCREENER, TOP_GAINERS/LOSERS              │   │
│  │   Pick highest      │    │ • DEEP_SAFETY/VALUATION/GROWTH              │   │
│  └──────────┬──────────┘    │ • NEWS, EARNINGS, OWNERSHIP                 │   │
│             │               │ • TECH_INDICATORS, CHART                     │   │
│             │               └─────────────────────────────────────────────┘   │
│             ▼                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────────────────┐   │
│  │ 4. SYMBOL RESOLVER  │───►│ Resolution Strategies                       │   │
│  │                     │    │ • Direct ticker match (1120, COMI)          │   │
│  │                     │    │ • Nickname dict (Al Rajhi → 1120)           │   │
│  │                     │    │ • Database fuzzy search                      │   │
│  └──────────┬──────────┘    │ • Context carryover from history            │   │
│             │               └─────────────────────────────────────────────┘   │
│             ▼                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────────────────┐   │
│  │ 5. DISPATCH HANDLER │───►│ 15 Intent Handlers:                         │   │
│  │                     │    │ • price_handler.py                           │   │
│  │                     │    │ • financials_handler.py                      │   │
│  │                     │    │ • chart_handler.py                           │   │
│  │                     │    │ • screener_handler.py                        │   │
│  │                     │    │ • deep_dive_handler.py                       │   │
│  │                     │    │ • dividends_handler.py                       │   │
│  │                     │    │ • news_handler.py                            │   │
│  │                     │    │ • statistics_handler.py                      │   │
│  └──────────┬──────────┘    └─────────────────────────────────────────────┘   │
│             │                                                                  │
│             ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ 6. LLM EXPLAINER (Multi-Provider Fallback)                               │ │
│  │                                                                          │ │
│  │   ┌─────────┐ fail ┌───────────┐ fail ┌──────────┐                      │ │
│  │   │  GROQ   │─────►│ CEREBRAS  │─────►│ MISTRAL  │                      │ │
│  │   │ Primary │      │ Secondary │      │ Tertiary │                      │ │
│  │   │ 100K/day│      │14.4K req/d│      │ 1B/month │                      │ │
│  │   └─────────┘      └───────────┘      └──────────┘                      │ │
│  │                                                                          │ │
│  │   Generates: conversational_text, fact_explanations                     │ │
│  └──────────┬───────────────────────────────────────────────────────────────┘ │
│             │                                                                  │
│             ▼                                                                  │
│  ┌─────────────────────┐                                                       │
│  │ 7. RESPONSE BUILDER │    ┌─────────────────────────────────────────────┐   │
│  │                     │───►│ 4-LAYER RESPONSE (PROTECTED)                │   │
│  │                     │    │                                             │   │
│  │                     │    │ ① Greeting/Opening (Personalized)           │   │
│  │                     │    │ ② Data Cards (Stock info, metrics)          │   │
│  │                     │    │ ③ Learning Section (📊 Educational)         │   │
│  │                     │    │ ④ Follow-up Prompt (💡 Next action)         │   │
│  └──────────┬──────────┘    └─────────────────────────────────────────────┘   │
│             │                                                                  │
│             ▼                                                                  │
│       CHAT RESPONSE                                                            │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Architecture

### Live Data Update Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DATA UPDATE PIPELINE                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                     GITHUB ACTIONS WATCHDOG                              │  │
│  │                 (enterprise-data-update.yml)                             │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                          │  │
│  │  SCHEDULE:                                                               │  │
│  │  • */5 6-13 * * 0-4  = Every 5 min during market hours (Prices)         │  │
│  │  • 0 15 * * 0-4      = 6 PM Saudi (Daily OHLC Sync)                     │  │
│  │  • 0 16 * * 0-4      = 7 PM Saudi (Egypt Funds)                         │  │
│  │  • 0 17 * * 0-4      = 8 PM Saudi (AI Ingestion)                        │  │
│  │                                                                          │  │
│  └────────────┬─────────────────────────────────────────────────────────────┘  │
│               │                                                                 │
│               ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                    SYNCHRONOUS POLLING PATTERN                           │  │
│  │                                                                          │  │
│  │   1. POST /api/v1/admin/refresh/{type}  ──► Trigger Job                 │  │
│  │   2. LOOP: GET /api/v1/admin/refresh/status                             │  │
│  │   3. Check: is_running == false → Exit                                   │  │
│  │   4. Sleep 10s → Repeat                                                  │  │
│  └────────────┬─────────────────────────────────────────────────────────────┘  │
│               │                                                                 │
│               ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                     BACKEND SCHEDULER SERVICE                            │  │
│  │                     (app/services/scheduler.py)                          │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                          │  │
│  │  JOBS:                                                                   │  │
│  │  • run_market_job_silent  → Price updates (every 5 min)                 │  │
│  │  • run_ohlc_catchup_job   → Daily OHLC backfill (every 4 hours)         │  │
│  │  • run_maintenance_job    → DB cleanup                                   │  │
│  │  • run_decypha_job        → Funds data                                   │  │
│  │  • run_mubasher_job       → Saudi market data                           │  │
│  │                                                                          │  │
│  └────────────┬─────────────────────────────────────────────────────────────┘  │
│               │                                                                 │
│               ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                       DATA SOURCES                                       │  │
│  ├───────────────┬───────────────┬───────────────┬──────────────────────────┤  │
│  │   MUBASHER    │    YAHOO      │   DECYPHA     │     STOCKANALYSIS        │  │
│  │   (Primary)   │   (Backup)    │   (Funds)     │     (Fallback)           │  │
│  │               │               │               │                          │  │
│  │ Saudi OHLC    │ Intl metrics  │ Egypt Funds   │  Company profiles        │  │
│  │ Egypt prices  │ Financials    │ NAV data      │  Financials              │  │
│  └───────────────┴───────────────┴───────────────┴──────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  DEVELOPER MACHINE                                                              │
│       │                                                                         │
│       │ ./scripts/deploy_production.sh [frontend|backend|all]                  │
│       │                                                                         │
│       ├──────────────────────────────────────────┐                              │
│       │                                          │                              │
│       ▼                                          ▼                              │
│  ┌─────────────────────┐                ┌─────────────────────┐                 │
│  │  FRONTEND (Vercel)  │                │ BACKEND (Hetzner)   │                 │
│  ├─────────────────────┤                ├─────────────────────┤                 │
│  │                     │                │                     │                 │
│  │ 1. Verify root dir  │                │ 1. git add/commit   │                 │
│  │ 2. npx vercel --prod│                │ 2. git push main    │                 │
│  │ 3. Build & Deploy   │                │                     │                 │
│  │                     │                │ NUCLEAR OPTION:     │                 │
│  │ Output:             │                │ 3. SSH → Server     │                 │
│  │ startamarkets.com   │                │ 4. docker down      │                 │
│  │                     │                │ 5. system prune -af │                 │
│  └─────────────────────┘                │ 6. docker up --build│                 │
│                                         │                     │                 │
│                                         │ Output:             │                 │
│                                         │ starta.46-224-...   │                 │
│                                         └─────────────────────┘                 │
│                                                                                 │
│  CRITICAL RULES:                                                                │
│  ✗ NEVER cd into frontend/ before Vercel deploy                                │
│  ✗ NEVER use HuggingFace (completely banned)                                   │
│  ✗ NEVER run local cron jobs (cloud-only)                                       │
│  ✓ ALWAYS use nuclear option for reliable deploys                              │
│  ✓ ALWAYS check df -h before large builds                                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      AUTH METHODS                                       │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                         │   │
│  │  1. EMAIL/PASSWORD                                                      │   │
│  │     POST /api/v1/auth/register                                          │   │
│  │     POST /api/v1/auth/login                                             │   │
│  │                                                                         │   │
│  │  2. OTP (One-Time Password)                                             │   │
│  │     POST /api/v1/auth/request-otp                                       │   │
│  │     POST /api/v1/auth/verify-otp                                        │   │
│  │                                                                         │   │
│  │  3. GOOGLE OAUTH                                                        │   │
│  │     GET  /api/v1/auth/google                                            │   │
│  │     GET  /api/v1/auth/google/callback                                   │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  TOKEN FLOW:                                                                    │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐         │
│  │   Login    │───►│   JWT      │───►│ Store in   │───►│ Attach to  │         │
│  │            │    │  Token     │    │ localStorage│   │ API calls  │         │
│  └────────────┘    └────────────┘    └────────────┘    └────────────┘         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📡 API Endpoints Summary

### Backend API Routes (`/api/v1/`)

| Prefix | Module | Description |
|--------|--------|-------------|
| `/auth` | auth.py, otp_auth.py, google_auth.py | Authentication |
| `/ai` | ai.py | Chat API |
| `/market` | market.py | Tickers, sectors, screener |
| `/portfolio` | portfolio.py | User portfolios |
| `/yahoo` | yahoo.py | Yahoo Finance data |
| `/company` | company.py | Company profiles |
| `/egx` | egx.py | Egypt EGX data |
| `/admin` | admin.py | Data management, refresh |
| `/admin/analytics` | analytics_router.py | Chat analytics |
| `/user` | user.py | User profile |
| `/trading` | trading.py | Trade operations |

---

## 📈 Key Metrics

| Metric | Value |
|--------|-------|
| Total Database Tables | 15+ |
| Data Points | ~19.2 Million |
| Stock Tickers | 210+ (Saudi + Egypt) |
| Frontend Pages | 28+ |
| React Components | 40+ |
| Backend Endpoints | 14 modules |
| Chat Intent Types | 30+ |
| Chat Handlers | 15 |
| LLM Providers | 3 (Groq, Cerebras, Mistral) |

---

## 🔒 Critical Protected Components

| Component | File | Protection Level |
|-----------|------|------------------|
| 4-Layer Response Structure | chat_service.py (lines 504-540) | 🔴 CRITICAL |
| Narrative Generation | llm_explainer.py | 🔴 CRITICAL |
| Canonical AI Chat Route | AiChat/page.tsx | 🔴 CRITICAL |
| Shared AI Rendering | components/chatbot/ResponsivePage.tsx | 🔴 CRITICAL |
| Response Types | useAIChat.ts | 🟠 HIGH |
| Learning Generator | learning_section_generator.py | 🟠 HIGH |
| Follow-up Generator | follow_up_generator.py | 🟠 HIGH |

---

## ⚡ Performance Considerations

1. **Database Indexing**: All price tables indexed on (symbol, date DESC)
2. **Connection Pooling**: asyncpg with connection reuse
3. **LLM Caching**: Frequently used explanations cached
4. **CDN**: Vercel Edge for frontend static assets
5. **Background Jobs**: APScheduler for non-blocking updates

---

## 🎯 Conclusion

FinanceHub Pro is a sophisticated, production-ready financial intelligence platform with:
- **Robust Architecture**: Separated frontend/backend with clear API contracts
- **AI-First Design**: Rule-based routing + Multi-LLM for natural conversations
- **Enterprise Data**: 19.2M+ data points with automated updates
- **Production-Grade**: Docker, CI/CD, multi-provider failover
- **Protected Components**: Critical chatbot structure preserved

---

*Generated by System Architecture Analysis - January 23, 2026*
